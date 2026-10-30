"""
Tasks router — /api/v1/tasks
"""
import secrets
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends

from core.database import db
from models.schemas import CreateTaskRequest, UpdateTaskRequest
from routers.deps import get_current_user

router = APIRouter()

VALID_STATUSES = ("todo", "in_progress", "review", "completed")
VALID_PRIORITIES = ("low", "medium", "high")


def _check_project_access(project_id: str, user: dict) -> dict:
    project = next((p for p in db.projects if p["_id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found."})
    if user["role"] != "admin":
        membership = next((m for m in db.project_memberships if m["projectId"] == project_id and m["userId"] == user["_id"]), None)
        if not membership:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You are not a member of this project."})
    return project


@router.get("/")
async def list_tasks(projectId: str = None, current_user=Depends(get_current_user)):
    if not projectId:
        raise HTTPException(status_code=400, detail={"code": "MISSING_PARAM", "message": "projectId is required."})
    _check_project_access(projectId, current_user)
    tasks = [t for t in db.tasks if t["projectId"] == projectId]
    return {"success": True, "data": tasks}


@router.post("/", status_code=201)
async def create_task(body: CreateTaskRequest, current_user=Depends(get_current_user)):
    _check_project_access(body.projectId, current_user)

    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail={"code": "INVALID_INPUT", "message": f"Status must be one of {VALID_STATUSES}."})
    if body.priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail={"code": "INVALID_INPUT", "message": f"Priority must be one of {VALID_PRIORITIES}."})

    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    task = {
        "_id": f"tsk_{secrets.token_hex(6)}",
        "projectId": body.projectId,
        "title": body.title,
        "description": body.description,
        "assignedTo": body.assignedTo,
        "status": body.status,
        "priority": body.priority,
        "dueDate": body.dueDate,
        "createdBy": current_user["_id"],
        "createdAt": now,
        "updatedAt": now,
    }
    db.tasks.append(task)
    return {"success": True, "data": task}


@router.patch("/{task_id}")
async def update_task(task_id: str, body: UpdateTaskRequest, current_user=Depends(get_current_user)):
    task = next((t for t in db.tasks if t["_id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail={"code": "TASK_NOT_FOUND", "message": "Task not found."})

    _check_project_access(task["projectId"], current_user)

    updates = body.model_dump(exclude_none=True)
    if "status" in updates and updates["status"] not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail={"code": "INVALID_INPUT", "message": f"Status must be one of {VALID_STATUSES}."})
    if "priority" in updates and updates["priority"] not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail={"code": "INVALID_INPUT", "message": f"Priority must be one of {VALID_PRIORITIES}."})

    for k, v in updates.items():
        task[k] = v
    task["updatedAt"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"success": True, "data": task}
