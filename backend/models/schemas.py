"""
Pydantic request/response schemas for SecureCampus API.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, field_validator
import re


# ─── Auth ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    fullName: str
    email: str
    password: str
    role: Optional[str] = "student"  # student | faculty
    department: Optional[str] = "Computer Science"
    studentOrStaffId: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str

    @field_validator("newPassword")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain a lowercase letter")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain an uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain a number")
        if not re.search(r"[!@#$%^&*]", v):
            raise ValueError("Password must contain a special character (!@#$%^&*)")
        return v


# ─── Users ───────────────────────────────────────────────────────────────────

class CreateUserRequest(BaseModel):
    email: str
    password: str
    fullName: str
    role: str  # admin | faculty | student
    studentOrStaffId: str
    department: str


class UpdateUserRequest(BaseModel):
    fullName: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None


# ─── Attendance ───────────────────────────────────────────────────────────────

class CreateAttendanceSessionRequest(BaseModel):
    classId: str
    date: str  # YYYY-MM-DD
    title: str
    sessionCode: Optional[str] = None


class MarkAttendanceRequest(BaseModel):
    studentId: str
    status: str  # present | absent | late


class CorrectAttendanceRequest(BaseModel):
    status: str  # present | absent | late
    reason: str


class UpdateSessionStatusRequest(BaseModel):
    status: str  # open | closed


# ─── Projects ────────────────────────────────────────────────────────────────

class CreateProjectRequest(BaseModel):
    title: str
    description: str = ""
    classId: Optional[str] = None
    isPrivate: bool = True


class UpdateProjectRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    isPrivate: Optional[bool] = None


class InviteMemberRequest(BaseModel):
    userEmailOrId: str
    role: str = "member"  # leader | member


# ─── Tasks ───────────────────────────────────────────────────────────────────

class CreateTaskRequest(BaseModel):
    projectId: str
    title: str
    description: str = ""
    assignedTo: Optional[str] = None
    status: str = "todo"  # todo | in_progress | review | completed
    priority: str = "medium"  # low | medium | high
    dueDate: Optional[str] = None


class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignedTo: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    dueDate: Optional[str] = None


# ─── Messages ────────────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    projectId: str
    content: str


# ─── Generic response wrappers ───────────────────────────────────────────────

class SuccessResponse(BaseModel):
    success: bool = True
    data: Any = None


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail
