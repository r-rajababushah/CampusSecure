"""
Audit router — /api/v1/audit
"""
from fastapi import APIRouter, Depends

from core.database import db
from routers.deps import require_roles

router = APIRouter()


@router.get("/")
async def get_audit_logs(
    limit: int = 50,
    offset: int = 0,
    action: str = None,
    actorId: str = None,
    current_user=Depends(require_roles("admin")),
):
    logs = list(db.audit_logs)
    if action:
        logs = [l for l in logs if l.get("action") == action]
    if actorId:
        logs = [l for l in logs if l.get("actorId") == actorId]

    total = len(logs)
    items = logs[offset: offset + limit]
    return {"success": True, "data": {"total": total, "items": items, "limit": limit, "offset": offset}}
