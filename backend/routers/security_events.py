"""
Security events router with proper body parsing — /api/v1/security-events
"""
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Depends

from core.database import db
from routers.deps import require_roles

router = APIRouter()


def _now() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def _as_list(payload):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("alerts", "issues", "findings"):
            if isinstance(payload.get(key), list):
                return payload[key]
        return [payload]
    raise HTTPException(status_code=400, detail="Expected a JSON object or array.")


def _severity(value) -> str:
    normalized = str(value or "informational").lower()
    for severity in ("critical", "high", "medium", "low", "informational"):
        if severity in normalized:
            return severity
    return "informational"


def _import_finding(source: str, item: dict, imported_by: str) -> dict:
    instances = item.get("instances") or []
    instance = instances[0] if instances and isinstance(instances[0], dict) else {}
    host = str(item.get("host") or "")
    path = str(item.get("path") or "")
    url = str(instance.get("uri") or item.get("url") or f"{host}{path}" or "http://localhost")
    imported_at = _now()
    return {
        "_id": f"scan_{secrets.token_hex(6)}",
        "source": source,
        "scannerAlertId": str(item.get("pluginId") or item.get("serialNumber") or ""),
        "alertName": str(item.get("name") or item.get("alertName") or "Imported scanner finding"),
        "severity": _severity(item.get("riskdesc") or item.get("severity")),
        "confidence": str(item.get("confidence") or "Unknown"),
        "url": url,
        "method": str(instance.get("method") or item.get("method") or "GET").upper(),
        "param": instance.get("param") or item.get("param"),
        "attackVector": str(item.get("attackVector") or "Imported scanner finding"),
        "description": str(item.get("desc") or item.get("issueBackground") or item.get("description") or "No description supplied."),
        "solution": str(item.get("solution") or item.get("remediationBackground") or "Review the scanner finding and apply the recommended remediation."),
        "reference": str(item.get("reference") or ""),
        "rawEvidence": str(instance.get("evidence") or item.get("issueDetail") or ""),
        "remediationStatus": "open",
        "importedBy": imported_by,
        "importedAt": imported_at,
        "createdAt": imported_at,
    }


@router.get("/")
async def get_security_events(
    limit: int = 50,
    offset: int = 0,
    severity: Optional[str] = None,
    eventCategory: Optional[str] = None,
    investigationStatus: Optional[str] = None,
    current_user=Depends(require_roles("admin")),
):
    events = list(db.security_events)
    if severity:
        events = [e for e in events if e.get("severity") == severity]
    if eventCategory:
        events = [e for e in events if e.get("eventCategory") == eventCategory]
    if investigationStatus:
        events = [e for e in events if e.get("investigationStatus") == investigationStatus]

    total = len(events)
    items = events[offset: offset + limit]
    return {"success": True, "data": {"total": total, "items": items, "limit": limit, "offset": offset}}


@router.get("/stats")
async def get_security_stats(current_user=Depends(require_roles("admin"))):
    return {
        "success": True,
        "data": {
            "totalEvents": len(db.security_events),
            "criticalEvents": sum(1 for event in db.security_events if event.get("severity") == "critical"),
            "blockedRequests": sum(1 for event in db.security_events if event.get("outcome") == "blocked"),
            "scannerFindingsCount": len(db.scanner_findings),
        },
    }


@router.get("/scanners")
async def get_scanner_findings(limit: int = 100, offset: int = 0, current_user=Depends(require_roles("admin"))):
    items = db.scanner_findings[offset: offset + limit]
    return {"success": True, "data": {"items": items, "total": len(db.scanner_findings)}}


@router.patch("/scanners/{finding_id}")
async def update_scanner_finding(finding_id: str, request: Request, current_user=Depends(require_roles("admin"))):
    finding = next((item for item in db.scanner_findings if item["_id"] == finding_id), None)
    if not finding:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Scanner finding not found."})
    body = await request.json()
    status = body.get("remediationStatus")
    if status not in {"open", "in_remediation", "verified_fixed", "accepted_risk"}:
        raise HTTPException(status_code=400, detail="Invalid remediation status.")
    finding["remediationStatus"] = status
    return {"success": True, "data": finding}


@router.post("/scanners/zap")
async def import_zap_findings(request: Request, current_user=Depends(require_roles("admin"))):
    payload = await request.json()
    findings = [_import_finding("OWASP_ZAP", item, current_user["email"]) for item in _as_list(payload) if isinstance(item, dict)]
    db.scanner_findings.extend(findings)
    return {"success": True, "data": {"importedCount": len(findings)}}


@router.post("/scanners/burp")
async def import_burp_findings(request: Request, current_user=Depends(require_roles("admin"))):
    payload = await request.json()
    findings = [_import_finding("BURP_SUITE", item, current_user["email"]) for item in _as_list(payload) if isinstance(item, dict)]
    db.scanner_findings.extend(findings)
    return {"success": True, "data": {"importedCount": len(findings)}}


@router.post("/simulate-attack")
async def simulate_attack(request: Request, current_user=Depends(require_roles("admin"))):
    body = await request.json()
    attack_type = str(body.get("type") or "unknown").strip()[:80]
    if not attack_type:
        raise HTTPException(status_code=400, detail="An attack type is required.")
    event = {
        "_id": f"sec_{secrets.token_hex(6)}",
        "eventCategory": "injection_attempt",
        "severity": "high",
        "eventType": "SIMULATED_ATTACK",
        "message": f"Local demo simulation triggered: {attack_type}",
        "affectedResource": "SecureCampus local demo",
        "outcome": "blocked",
        "actorId": current_user["_id"],
        "actorEmail": current_user["email"],
        "ip": request.client.host if request.client else "127.0.0.1",
        "isSimulatedDemo": True,
        "investigationStatus": "unreviewed",
        "notes": "Generated by the Security Center attack simulation control.",
        "createdAt": _now(),
    }
    db.add_security_event(event)
    return {"success": True, "data": {"message": f"Local demo simulation recorded: {attack_type}.", "event": event}}


@router.patch("/{event_id}")
async def update_security_event(event_id: str, request: Request, current_user=Depends(require_roles("admin"))):
    event = next((e for e in db.security_events if e["_id"] == event_id), None)
    if not event:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Security event not found."})
    body = await request.json()
    allowed = ("investigationStatus", "notes")
    for k in allowed:
        if k in body:
            event[k] = body[k]
    return {"success": True, "data": event}
