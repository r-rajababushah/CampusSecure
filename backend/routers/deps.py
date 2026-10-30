"""
Shared dependency helpers for FastAPI routers.
Includes dual-mode Route Protection (RBAC) governed by is_secure():
- ON: Strict server-side RBAC validation (403 on role mismatch)
- OFF: Broken Access Control (admin & faculty routes accessible to any logged-in user)
"""
import secrets
from datetime import datetime
from typing import Optional
from fastapi import Request, HTTPException

from core.database import db
from core.security_mode import is_secure


def extract_session_id(request: Request) -> Optional[str]:
    """Extract session ID from Cookie, Authorization: Bearer, or X-Session-ID header."""
    sid = request.cookies.get("campus_session")
    if sid:
        return sid
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    custom_hdr = request.headers.get("x-session-id")
    if custom_hdr:
        return custom_hdr.strip()
    return None


def get_current_user(request: Request):
    """Dependency: resolve authenticated user from session cookie or header."""
    session_id = extract_session_id(request)
    if not session_id:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Authentication required."})
    session = db.sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=401, detail={"code": "SESSION_EXPIRED", "message": "Session expired or invalid."})
    user = db.get_user_by_id(session["userId"])
    if not user:
        raise HTTPException(status_code=401, detail={"code": "USER_NOT_FOUND", "message": "User not found."})
    # Update last active
    session["lastActiveAt"] = datetime.utcnow().timestamp()
    return user


def require_roles(*roles: str):
    """
    Returns a dependency that checks user role.
    - SECURE (ON): Enforces role membership; raises 403 Forbidden on violation.
    - INSECURE (OFF): Bypasses role checks, allowing students to access faculty/admin endpoints.
    """
    def _dep(request: Request, current_user=None):
        session_id = extract_session_id(request)
        if not session_id:
            raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Authentication required."})
        session = db.sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=401, detail={"code": "SESSION_EXPIRED", "message": "Session expired."})
        user = db.get_user_by_id(session["userId"])
        if not user:
            raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "User not found."})

        # Dual-mode RBAC check
        if not is_secure():
            # DEMO-ONLY INSECURE PATH: Route protection disabled; any logged in user can access
            return user

        # SECURE PATH: Server-side RBAC enforced
        if user["role"] not in roles:
            raise HTTPException(
                status_code=403,
                detail={"code": "FORBIDDEN", "message": f"Requires one of: {', '.join(roles)}. You are '{user['role']}'."}
            )
        return user
    return _dep


def add_audit_log(entry: dict):
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    entry.setdefault("_id", f"aud_{secrets.token_hex(6)}")
    entry.setdefault("createdAt", now)
    db.add_audit_log(entry)


def add_security_event(entry: dict):
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    entry.setdefault("_id", f"sec_{secrets.token_hex(6)}")
    entry.setdefault("createdAt", now)
    entry.setdefault("isSimulatedDemo", False)
    entry.setdefault("investigationStatus", "unreviewed")
    db.add_security_event(entry)
