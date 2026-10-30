"""
Users router — /api/v1/users
Supports dual-mode IDOR and RBAC behavior governed by is_secure():
- ON: Strict authorization and ownership checks.
- OFF: No ownership check on user data endpoints (IDOR vulnerability).
"""
import secrets
from datetime import datetime

from fastapi import APIRouter, Request, HTTPException, Depends

from core.database import db
from core.security import hash_password
from core.security_mode import is_secure
from models.schemas import CreateUserRequest, UpdateUserRequest
from routers.deps import get_current_user, require_roles, add_audit_log, add_security_event

router = APIRouter()


@router.get("/")
async def list_users(
    request: Request,
    search: str = None,
    role: str = None,
    status: str = None,
    limit: int = 20,
    offset: int = 0,
    current_user=Depends(require_roles("admin")),
):
    users = [db.safe_user(u) for u in db.users]
    if role:
        users = [u for u in users if u["role"] == role]
    if status:
        users = [u for u in users if u["status"] == status]
    if search:
        q = search.lower()
        users = [u for u in users if (
            q in u["fullName"].lower() or
            q in u["email"].lower() or
            q in u["studentOrStaffId"].lower()
        )]
    total = len(users)
    items = users[offset: offset + limit]
    return {"success": True, "data": {"total": total, "items": items, "limit": limit, "offset": offset}}


@router.post("/", status_code=201)
async def create_user(body: CreateUserRequest, request: Request, current_user=Depends(require_roles("admin"))):
    if db.get_user_by_email(body.email):
        raise HTTPException(status_code=409, detail={"code": "EMAIL_ALREADY_EXISTS", "message": "A user with this email already exists."})

    role = body.role
    if role not in ("admin", "faculty", "student"):
        raise HTTPException(status_code=400, detail={"code": "INVALID_INPUT", "message": "Role must be admin, faculty, or student."})

    prefix = "usr_admin_" if role == "admin" else "usr_fac_" if role == "faculty" else "usr_stu_"
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    new_user = {
        "_id": f"{prefix}{secrets.token_hex(6)}",
        "email": body.email.lower(),
        "passwordHash": hash_password(body.password),
        "fullName": body.fullName,
        "role": role,
        "studentOrStaffId": body.studentOrStaffId,
        "department": body.department,
        "status": "active",
        "failedLoginAttempts": 0,
        "lockoutUntil": None,
        "lastLoginAt": None,
        "createdAt": now,
        "updatedAt": now,
    }
    db.users.append(new_user)

    add_audit_log({
        "actorId": current_user["_id"], "actorEmail": current_user["email"],
        "actorRole": current_user["role"], "action": "USER_CREATED",
        "resourceType": "User", "resourceId": new_user["_id"],
        "details": {"email": new_user["email"], "role": new_user["role"]},
        "outcome": "success",
        "ip": request.client.host if request.client else "127.0.0.1",
    })

    return {"success": True, "data": db.safe_user(new_user)}


@router.get("/{user_id}")
async def get_user(user_id: str, request: Request, current_user=Depends(get_current_user)):
    # Dual-mode IDOR Check
    if is_secure():
        # SECURE PATH: Enforce ownership & role check
        if current_user["role"] != "admin" and current_user["_id"] != user_id:
            client_ip = request.client.host if request.client else "127.0.0.1"
            add_security_event({
                "eventCategory": "authorization", "severity": "medium",
                "eventType": "IDOR_PROFILE_INSPECTION_BLOCKED",
                "message": f"User {current_user['email']} attempted to inspect profile of {user_id}.",
                "affectedResource": f"User:{user_id}", "outcome": "blocked",
                "ip": client_ip,
                "actorId": current_user["_id"], "actorEmail": current_user["email"],
            })
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Access denied: cannot view another user's profile."})
    else:
        # DEMO-ONLY INSECURE PATH: IDOR allowed; any logged-in user can inspect any profile
        pass

    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail={"code": "USER_NOT_FOUND", "message": "User not found."})
    return {"success": True, "data": db.safe_user(user)}


@router.patch("/{user_id}")
async def update_user(user_id: str, body: UpdateUserRequest, request: Request, current_user=Depends(require_roles("admin"))):
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail={"code": "USER_NOT_FOUND", "message": "User not found."})

    if user["_id"] == current_user["_id"] and body.status == "suspended":
        raise HTTPException(status_code=400, detail={"code": "CANNOT_SUSPEND_SELF", "message": "Administrators cannot suspend their own account."})

    updates = body.model_dump(exclude_none=True)
    for k, v in updates.items():
        user[k] = v
    user["updatedAt"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    add_audit_log({
        "actorId": current_user["_id"], "actorEmail": current_user["email"],
        "actorRole": current_user["role"], "action": "USER_UPDATED",
        "resourceType": "User", "resourceId": user["_id"],
        "details": updates, "outcome": "success",
        "ip": request.client.host if request.client else "127.0.0.1",
    })

    return {"success": True, "data": db.safe_user(user)}


@router.patch("/{user_id}/status")
async def update_user_status(user_id: str, request: Request, current_user=Depends(require_roles("admin"))):
    body = await request.json()
    status = body.get("status")
    if status not in ("active", "suspended"):
        raise HTTPException(status_code=400, detail={"code": "INVALID_INPUT", "message": "Status must be active or suspended."})

    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail={"code": "USER_NOT_FOUND", "message": "User not found."})

    if user["_id"] == current_user["_id"] and status == "suspended":
        raise HTTPException(status_code=400, detail={"code": "CANNOT_SUSPEND_SELF", "message": "Cannot suspend own account."})

    user["status"] = status
    user["updatedAt"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    return {"success": True, "data": db.safe_user(user)}
