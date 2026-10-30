"""
Admin Security Mode Toggle Router.
Exposes endpoints to view and toggle the system-wide SECURITY_MODE (ON / OFF).
- GET  /api/security-mode (also /api/v1/security-mode)
- POST /admin/security-mode (also /api/v1/admin/security-mode)
"""
import secrets
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel

from core.security_mode import is_secure, set_security_mode, get_security_mode_str
from core.database import db
from routers.deps import get_current_user

router = APIRouter()


class SecurityModeToggleRequest(BaseModel):
    mode: Optional[str] = None       # "on" | "off"
    enabled: Optional[bool] = None   # True | False


@router.get("/security-mode")
async def get_security_mode(request: Request):
    """
    Publicly visible mode status endpoint so frontend can display the
    'INSECURE DEMO MODE - LOCAL ONLY' banner when OFF.
    """
    mode = get_security_mode_str()
    return {
        "success": True,
        "securityMode": mode,
        "isSecure": is_secure(),
        "bannerMessage": None if is_secure() else "INSECURE DEMO MODE - LOCAL ONLY",
    }


@router.post("/security-mode")
async def toggle_security_mode(
    body: SecurityModeToggleRequest,
    request: Request,
    current_user=Depends(get_current_user),
):
    """
    Changes system-wide Security Mode.
    Strictly restricted to Admin role in SECURE mode.
    Logs every change (who, when, IP, old -> new).
    """
    # 1. Determine desired new mode
    if body.enabled is not None:
        new_state = body.enabled
    elif body.mode is not None:
        new_state = (body.mode.lower().strip() == "on")
    else:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_INPUT", "message": "Specify 'mode': 'on'|'off' or 'enabled': true|false."}
        )

    # 2. Authorization check: Admin only
    if current_user["role"] != "admin":
        if is_secure():
            raise HTTPException(
                status_code=403,
                detail={"code": "FORBIDDEN", "message": "Only authenticated Administrators can toggle security mode."}
            )

    client_ip = request.client.host if request.client else "127.0.0.1"
    old_mode_str = get_security_mode_str()
    old_bool, new_bool = set_security_mode(new_state)
    new_mode_str = get_security_mode_str()
    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # 3. Log event into audit_logs and security_events
    log_entry = {
        "_id": f"aud_{secrets.token_hex(6)}",
        "actorId": current_user["_id"],
        "actorEmail": current_user["email"],
        "actorRole": current_user["role"],
        "action": "SECURITY_MODE_CHANGED",
        "resourceType": "SystemConfiguration",
        "resourceId": "SECURITY_MODE",
        "details": {
            "previousMode": old_mode_str,
            "newMode": new_mode_str,
            "changedBy": current_user["email"],
            "ip": client_ip,
            "timestamp": now_iso,
        },
        "outcome": "success",
        "ip": client_ip,
        "createdAt": now_iso,
    }
    db.add_audit_log(log_entry)

    event_entry = {
        "_id": f"sec_{secrets.token_hex(6)}",
        "eventCategory": "configuration",
        "severity": "high" if not new_bool else "medium",
        "eventType": "SECURITY_MODE_TOGGLED",
        "message": f"Security Mode toggled from {old_mode_str.upper()} to {new_mode_str.upper()} by {current_user['email']} from IP {client_ip}.",
        "affectedResource": "SystemConfiguration:SECURITY_MODE",
        "outcome": "applied",
        "actorId": current_user["_id"],
        "actorEmail": current_user["email"],
        "ip": client_ip,
        "isSimulatedDemo": not new_bool,
        "createdAt": now_iso,
    }
    db.add_security_event(event_entry)

    print(f"[SecureCampus] SECURITY MODE SWITCHED: {old_mode_str.upper()} -> {new_mode_str.upper()} by {current_user['email']} ({client_ip})")

    return {
        "success": True,
        "securityMode": new_mode_str,
        "isSecure": new_bool,
        "previousMode": old_mode_str,
        "changedBy": current_user["email"],
        "timestamp": now_iso,
        "message": f"Security Mode is now {new_mode_str.upper()}.",
    }

