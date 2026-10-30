"""
Projects router — /api/v1/projects
Supports dual-mode behavior governed by is_secure():
- XSS: In ON mode, project titles and descriptions are sanitized (HTML escaped).
       In OFF mode, raw unescaped input is stored directly (Stored XSS demo).
- IDOR: In ON mode, access to private projects requires membership or admin role.
        In OFF mode, private project access checks are bypassed.
"""
import html
import secrets
from datetime import datetime

from fastapi import APIRouter, Request, HTTPException, Depends

from core.database import db
from core.security_mode import is_secure
from models.schemas import CreateProjectRequest, UpdateProjectRequest, InviteMemberRequest
from routers.deps import get_current_user, add_audit_log, add_security_event

router = APIRouter()


@router.get("/")
async def list_projects(current_user=Depends(get_current_user)):
    user = current_user
    if user["role"] == "admin" or not is_secure():
        # In OFF mode or Admin: all projects visible
        projects = list(db.projects)
    else:
        # In ON mode: strictly members only
        member_project_ids = {m["projectId"] for m in db.project_memberships if m["userId"] == user["_id"]}
        projects = [p for p in db.projects if p["_id"] in member_project_ids]

    enriched = []
    for p in projects:
        memberships = [m for m in db.project_memberships if m["projectId"] == p["_id"]]
        my_membership = next((m for m in memberships if m["userId"] == user["_id"]), None)
        cls = next((c for c in db.classes if c["_id"] == p.get("classId")), None)
        task_count = sum(1 for t in db.tasks if t["projectId"] == p["_id"])
        enriched.append({
            **p,
            "memberCount": len(memberships),
            "myRole": my_membership["role"] if my_membership else ("admin" if user["role"] == "admin" else "none"),
            "className": cls["name"] if cls else "Independent Project",
            "classCode": cls["code"] if cls else None,
            "taskCount": task_count,
        })
    return {"success": True, "data": enriched}


@router.post("/", status_code=201)
async def create_project(body: CreateProjectRequest, request: Request, current_user=Depends(get_current_user)):
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    if is_secure():
        # SECURE PATH: Sanitize title and description against Stored XSS
        clean_title = html.escape(body.title.strip())
        clean_desc = html.escape(body.description.strip())
    else:
        # DEMO-ONLY INSECURE PATH: Store raw unescaped HTML/script tags
        clean_title = body.title.strip()
        clean_desc = body.description.strip()

    project = {
        "_id": f"proj_{secrets.token_hex(6)}",
        "title": clean_title,
        "description": clean_desc,
        "classId": body.classId,
        "ownerId": current_user["_id"],
        "status": "active",
        "isPrivate": body.isPrivate,
        "createdAt": now,
        "updatedAt": now,
    }
    db.projects.append(project)

    membership = {
        "_id": f"pm_{secrets.token_hex(6)}",
        "projectId": project["_id"],
        "userId": current_user["_id"],
        "role": "leader",
        "joinedAt": now,
        "createdAt": now,
        "updatedAt": now,
    }
    db.project_memberships.append(membership)

    add_audit_log({
        "actorId": current_user["_id"], "actorEmail": current_user["email"],
        "actorRole": current_user["role"], "action": "PROJECT_CREATED",
        "resourceType": "Project", "resourceId": project["_id"],
        "details": {"title": project["title"]}, "outcome": "success",
        "ip": request.client.host if request.client else "127.0.0.1",
    })

    return {"success": True, "data": {**project, "myRole": "leader", "memberCount": 1}}


@router.get("/{project_id}")
async def get_project(project_id: str, request: Request, current_user=Depends(get_current_user)):
    project = next((p for p in db.projects if p["_id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found."})

    membership = next((m for m in db.project_memberships if m["projectId"] == project_id and m["userId"] == current_user["_id"]), None)

    # Dual-mode IDOR Check
    if is_secure():
        if not membership and current_user["role"] != "admin":
            add_security_event({
                "eventCategory": "authorization", "severity": "high",
                "eventType": "IDOR_PROJECT_ACCESS_DENIED",
                "message": f"User {current_user['email']} attempted to access private project {project_id} without membership.",
                "affectedResource": f"/api/v1/projects/{project_id}", "outcome": "blocked",
                "ip": request.client.host if request.client else "127.0.0.1",
                "actorId": current_user["_id"], "actorEmail": current_user["email"],
            })
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Access denied: You are not a member of this project."})
    else:
        # DEMO-ONLY INSECURE PATH: Private project access allowed without membership
        pass

    memberships = [m for m in db.project_memberships if m["projectId"] == project_id]
    members_with_info = []
    for m in memberships:
        member_user = db.get_user_by_id(m["userId"])
        members_with_info.append({
            "membershipId": m["_id"],
            "userId": m["userId"],
            "fullName": member_user["fullName"] if member_user else "Unknown",
            "email": member_user["email"] if member_user else "",
            "role": m["role"],
            "joinedAt": m["joinedAt"],
        })

    return {"success": True, "data": {
        **project,
        "myRole": membership["role"] if membership else ("admin" if current_user["role"] == "admin" else "none"),
        "members": members_with_info,
    }}


@router.patch("/{project_id}")
async def update_project(project_id: str, body: UpdateProjectRequest, current_user=Depends(get_current_user)):
    project = next((p for p in db.projects if p["_id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found."})

    membership = next((m for m in db.project_memberships if m["projectId"] == project_id and m["userId"] == current_user["_id"]), None)
    if is_secure() and current_user["role"] != "admin" and (not membership or membership["role"] != "leader"):
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Only project leaders can update project details."})

    updates = body.model_dump(exclude_none=True)
    for k, v in updates.items():
        if isinstance(v, str):
            project[k] = html.escape(v) if is_secure() else v
        else:
            project[k] = v
    project["updatedAt"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"success": True, "data": project}


@router.post("/{project_id}/members", status_code=201)
async def invite_member(project_id: str, body: InviteMemberRequest, request: Request, current_user=Depends(get_current_user)):
    project = next((p for p in db.projects if p["_id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found."})

    caller_membership = next((m for m in db.project_memberships if m["projectId"] == project_id and m["userId"] == current_user["_id"]), None)
    if is_secure() and current_user["role"] != "admin" and (not caller_membership or caller_membership["role"] != "leader"):
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Only project leaders can invite members."})

    target_user = next(
        (u for u in db.users if u["_id"] == body.userEmailOrId or u["email"].lower() == body.userEmailOrId.lower()),
        None
    )
    if not target_user:
        raise HTTPException(status_code=404, detail={"code": "USER_NOT_FOUND", "message": "No user found with provided email or ID."})

    existing = next((m for m in db.project_memberships if m["projectId"] == project_id and m["userId"] == target_user["_id"]), None)
    if existing:
        raise HTTPException(status_code=409, detail={"code": "ALREADY_MEMBER", "message": "User is already a member of this project."})

    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    new_membership = {
        "_id": f"pm_{secrets.token_hex(6)}",
        "projectId": project_id,
        "userId": target_user["_id"],
        "role": body.role,
        "joinedAt": now, "createdAt": now, "updatedAt": now,
    }
    db.project_memberships.append(new_membership)

    notif = {
        "_id": f"notif_{secrets.token_hex(6)}",
        "userId": target_user["_id"],
        "title": "Project Invitation",
        "message": f"{current_user['fullName']} added you to project \"{project['title']}\".",
        "type": "invitation", "link": "/projects",
        "read": False, "createdAt": now,
    }
    db.add_notification(notif)

    return {"success": True, "data": new_membership}


@router.delete("/{project_id}/members/{target_user_id}")
async def remove_member(project_id: str, target_user_id: str, current_user=Depends(get_current_user)):
    caller_membership = next((m for m in db.project_memberships if m["projectId"] == project_id and m["userId"] == current_user["_id"]), None)
    is_self = current_user["_id"] == target_user_id
    is_leader = caller_membership and caller_membership["role"] == "leader"
    is_admin = current_user["role"] == "admin"

    if is_secure() and not is_self and not is_leader and not is_admin:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You do not have permission to remove this member."})

    idx = next((i for i, m in enumerate(db.project_memberships) if m["projectId"] == project_id and m["userId"] == target_user_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail={"code": "MEMBERSHIP_NOT_FOUND", "message": "User is not a member of this project."})

    db.project_memberships.pop(idx)
    return {"success": True, "message": "Member removed from project successfully."}
