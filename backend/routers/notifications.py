"""
Notifications router — /api/v1/notifications
"""
from fastapi import APIRouter, HTTPException, Depends

from core.database import db
from routers.deps import get_current_user

router = APIRouter()


@router.get("/")
async def get_notifications(current_user=Depends(get_current_user)):
    notifs = sorted(
        [n for n in db.notifications if n["userId"] == current_user["_id"]],
        key=lambda n: n["createdAt"], reverse=True
    )
    return {"success": True, "data": notifs}


@router.patch("/{notif_id}/read")
async def mark_read(notif_id: str, current_user=Depends(get_current_user)):
    notif = next((n for n in db.notifications if n["_id"] == notif_id), None)
    if not notif:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Notification not found."})
    if notif["userId"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Cannot modify another user's notification."})
    notif["read"] = True
    return {"success": True, "data": notif}


@router.patch("/read-all")
async def mark_all_read(current_user=Depends(get_current_user)):
    for notif in db.notifications:
        if notif["userId"] == current_user["_id"]:
            notif["read"] = True
    return {"success": True, "message": "All notifications marked as read."}
