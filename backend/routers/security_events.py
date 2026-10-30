"""
Security events router with proper body parsing — /api/v1/security-events
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional

from core.database import db
from routers.deps import require_roles

router = APIRouter()


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
