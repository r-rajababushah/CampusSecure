"""
Auth router — /api/v1/auth
Supports dual-mode behavior governed by is_secure():
- Login SQL Injection: String concatenation in OFF mode vs parameterized in ON mode.
- Brute Force: Lockout after 5 failures in ON mode vs unlimited attempts in OFF mode.
- Session Cookies: HttpOnly & SameSite=Lax in ON mode vs HttpOnly=False in OFF mode.
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict

from fastapi import APIRouter, Request, Response, HTTPException, Depends
from fastapi.responses import JSONResponse

from core.database import db
from core.security import verify_password, hash_password, generate_secure_token, generate_csrf_token
from core.config import settings
from core.security_mode import is_secure
from core.sqlite_db import query_login, add_user_to_sqlite, log_session_to_sqlite
from models.schemas import LoginRequest, ChangePasswordRequest, RegisterRequest
from routers.deps import get_current_user, require_roles, add_audit_log, add_security_event

router = APIRouter()


def _set_session_cookies(response: Response, session_id: str, csrf_token: str):
    is_prod = settings.is_production
    if is_secure():
        # SECURE PATH: HttpOnly, SameSite=Lax
        response.set_cookie(
            "campus_session", session_id,
            httponly=True, secure=is_prod, samesite="lax",
            max_age=12 * 3600, path="/"
        )
        response.set_cookie(
            "campus_csrf", csrf_token,
            httponly=False, secure=is_prod, samesite="lax",
            path="/"
        )
    else:
        # DEMO-ONLY INSECURE PATH: HttpOnly=False exposes session to JavaScript document.cookie (XSS token theft)
        response.set_cookie(
            "campus_session", session_id,
            httponly=False, secure=False, samesite="lax",
            max_age=12 * 3600, path="/"
        )
        response.set_cookie(
            "campus_csrf", csrf_token,
            httponly=False, secure=False, samesite="lax",
            path="/"
        )


def _clear_session_cookies(response: Response):
    response.delete_cookie("campus_session", path="/")
    response.delete_cookie("campus_csrf", path="/")


# ── POST /login ───────────────────────────────────────────────────────────────

@router.post("/login")
async def login(body: LoginRequest, request: Request, response: Response):
    email = body.email.strip()
    password = body.password
    client_ip = request.client.host if request.client else "127.0.0.1"

    if not is_secure():
        # =========================================================================
        # DEMO-ONLY INSECURE PATH: SQL Injection & No Brute Force Limits
        # String concatenation allows SQL injection payloads like:
        # admin@campus.edu' --
        # ' OR '1'='1
        # =========================================================================
        try:
            sqli_user, executed_sql, is_sqli = query_login(email, password)
        except Exception as e:
            # In insecure mode, surface verbose internal SQL errors
            raise HTTPException(
                status_code=500,
                detail={
                    "code": "SQL_SYNTAX_ERROR",
                    "message": str(e),
                    "executedQuery": f"SELECT * FROM users_auth WHERE email = '{email}' AND password = '{password}'",
                }
            )

        if not sqli_user:
            raise HTTPException(
                status_code=401,
                detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."}
            )

        user = db.get_user_by_id(sqli_user["_id"])
        if not user:
            # Sync user into in-memory store if needed
            user = sqli_user
            db.users.append(user)

    else:
        # =========================================================================
        # SECURE PATH: Parameterized query, Argon2/bcrypt hash check, Brute Force Lockout
        # =========================================================================
        user = db.get_user_by_email(email.lower())

        if not user:
            add_security_event({
                "eventCategory": "auth", "severity": "medium",
                "eventType": "LOGIN_FAILURE_UNKNOWN_USER",
                "message": f"Failed login attempt for unknown email: {email}",
                "affectedResource": "/api/v1/auth/login", "outcome": "blocked",
                "ip": client_ip,
                "userAgent": request.headers.get("user-agent", ""),
            })
            raise HTTPException(status_code=401, detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."})

        if user["status"] != "active":
            raise HTTPException(status_code=403, detail={"code": "ACCOUNT_SUSPENDED", "message": "Your account is suspended. Contact administration."})

        # Check Account Lockout
        lockout_until = user.get("lockoutUntil")
        if lockout_until:
            lockout_dt = datetime.fromisoformat(lockout_until.replace("Z", "+00:00"))
            if lockout_dt > datetime.utcnow().replace(tzinfo=lockout_dt.tzinfo):
                mins_left = max(1, int((lockout_dt.timestamp() - datetime.utcnow().timestamp()) / 60))
                raise HTTPException(status_code=429, detail={
                    "code": "ACCOUNT_LOCKED",
                    "message": f"Account temporarily locked due to 5 failed attempts. Try again in {mins_left} minute(s).",
                })

        is_valid = verify_password(password, user["passwordHash"])
        if not is_valid:
            user["failedLoginAttempts"] = user.get("failedLoginAttempts", 0) + 1
            if user["failedLoginAttempts"] >= 5:
                user["lockoutUntil"] = (datetime.utcnow() + timedelta(minutes=15)).strftime("%Y-%m-%dT%H:%M:%SZ")
                add_security_event({
                    "eventCategory": "auth", "severity": "high",
                    "eventType": "ACCOUNT_LOCKED_BRUTE_FORCE_PROTECTION",
                    "message": f"Account {user['email']} locked for 15 minutes after 5 failed authentication attempts.",
                    "affectedResource": user["_id"], "outcome": "blocked",
                    "ip": client_ip,
                    "actorId": user["_id"], "actorEmail": user["email"],
                })
            else:
                add_security_event({
                    "eventCategory": "auth", "severity": "low",
                    "eventType": "LOGIN_INCORRECT_PASSWORD",
                    "message": f"Failed password attempt {user['failedLoginAttempts']}/5 for {user['email']}",
                    "affectedResource": user["_id"], "outcome": "blocked",
                    "ip": client_ip,
                    "actorId": user["_id"], "actorEmail": user["email"],
                })
            raise HTTPException(status_code=401, detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."})

        # Reset failed login count on success
        user["failedLoginAttempts"] = 0
        user["lockoutUntil"] = None

    user["lastLoginAt"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # Invalidate previous session
    old_session_id = request.cookies.get("campus_session")
    if old_session_id and old_session_id in db.sessions:
        del db.sessions[old_session_id]

    # Generate new session & CSRF token
    session_id = generate_secure_token(32)
    csrf_token = generate_csrf_token()
    now_ts = datetime.utcnow().timestamp()

    db.sessions[session_id] = {
        "sessionId": session_id,
        "userId": user["_id"],
        "role": user["role"],
        "email": user["email"],
        "fullName": user["fullName"],
        "csrfToken": csrf_token,
        "createdAt": now_ts,
        "lastActiveAt": now_ts,
        "ip": client_ip,
        "userAgent": request.headers.get("user-agent", "Browser"),
    }

    # Record persistent session login log in SQLite
    log_session_to_sqlite(
        session_id=session_id,
        user_id=user["_id"],
        user_email=user["email"],
        user_role=user["role"],
        client_ip=client_ip,
        user_agent=request.headers.get("user-agent", "Browser"),
        auth_method="argon2id_salted" if is_secure() else "plaintext_sqli_demo",
        status="authenticated"
    )

    add_audit_log({
        "actorId": user["_id"], "actorEmail": user["email"],
        "actorRole": user["role"], "action": "USER_LOGIN",
        "resourceType": "User", "resourceId": user["_id"],
        "outcome": "success",
        "ip": client_ip,
    })

    resp_data = {
        "success": True,
        "data": {
            "user": {
                "id": user["_id"], "email": user["email"],
                "fullName": user["fullName"], "role": user["role"],
                "studentOrStaffId": user["studentOrStaffId"],
                "department": user["department"], "status": user["status"],
            },
            "sessionId": session_id,
            "csrfToken": csrf_token,
            "securityTrace": {
                "passwordHashAlgorithm": _password_hash_description(user["passwordHash"]),
                "passwordHashPreview": _password_hash_preview(user["passwordHash"]),
                "passwordDatabaseField": "users_auth.passwordHash",
                "rawPasswordDatabaseField": "users_auth.password",
                "rawPasswordStored": False if is_secure() else True,
                "storedAs": "salted hash only" if is_secure() else "unsalted MD5 demo hash",
            },
        }
    }
    json_resp = JSONResponse(content=resp_data)
    _set_session_cookies(json_resp, session_id, csrf_token)
    return json_resp


# ── POST /register ────────────────────────────────────────────────────────────

import re as _re

_ALLOWED_SELF_REG_ROLES = {"student", "faculty"}

def _validate_password_strength(password: str) -> Optional[str]:
    """Return an error message if password is weak, else None."""
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not _re.search(r"[a-z]", password):
        return "Password must contain a lowercase letter."
    if not _re.search(r"[A-Z]", password):
        return "Password must contain an uppercase letter."
    if not _re.search(r"\d", password):
        return "Password must contain a digit."
    if not _re.search(r"[!@#$%^&*]", password):
        return "Password must contain a special character (!@#$%^&*)."
    return None


def _password_hash_description(stored_hash: str) -> str:
    if stored_hash.startswith("$argon2"):
        return "Argon2id"
    if stored_hash.startswith("$2"):
        return "bcrypt"
    if stored_hash.startswith("pbkdf2:sha256:"):
        return "PBKDF2-HMAC-SHA256 · 100,000 iterations · unique 16-byte salt"
    if stored_hash.startswith("md5$"):
        return "MD5 · insecure demo mode"
    return "salted password hash"


def _password_hash_preview(stored_hash: str) -> str:
    """Describe the stored verifier without returning its salt or digest."""
    if stored_hash.startswith("$argon2"):
        return "$argon2id$v=…$<salt redacted>$<derived verifier redacted>"
    if stored_hash.startswith("$2"):
        return "$2b$<cost>$<salt and verifier redacted>"
    if stored_hash.startswith("pbkdf2:sha256:"):
        scheme, _salt, _digest = stored_hash.split("$", 2)
        return f"{scheme}$<16-byte salt redacted>$<derived key redacted>"
    if stored_hash.startswith("md5$"):
        return "md5$<insecure demo digest redacted>"
    return "<stored verifier redacted>"


@router.post("/register", status_code=201)
async def register(body: RegisterRequest, request: Request, response: Response):
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Normalize inputs
    email = body.email.strip().lower()
    full_name = body.fullName.strip()
    role = (body.role or "student").strip().lower()
    department = (body.department or "Computer Science").strip()

    # Only allow student / faculty self-registration — never admin
    if role not in _ALLOWED_SELF_REG_ROLES:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_ROLE", "message": "Self-registration is available for student and faculty roles only."},
        )

    if not full_name:
        raise HTTPException(status_code=400, detail={"code": "MISSING_NAME", "message": "Full name is required."})

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail={"code": "INVALID_EMAIL", "message": "A valid email address is required."})

    # Duplicate email check
    if db.get_user_by_email(email):
        raise HTTPException(
            status_code=409,
            detail={"code": "EMAIL_EXISTS", "message": "An account with this email already exists."},
        )

    # Password strength (only enforced in ON mode; in OFF mode accept any password for demo purposes)
    if is_secure():
        err = _validate_password_strength(body.password)
        if err:
            raise HTTPException(status_code=400, detail={"code": "WEAK_PASSWORD", "message": err})

    # Generate ID
    import random
    year = datetime.utcnow().year
    rand_suffix = random.randint(1000, 9999)
    if body.studentOrStaffId and body.studentOrStaffId.strip():
        new_id_val = body.studentOrStaffId.strip()
    elif role == "student":
        new_id_val = f"STU-{year}-{rand_suffix}"
    else:
        new_id_val = f"FAC-{year}-{rand_suffix}"

    now_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # Hash password (dual-mode — secure PBKDF2 vs OFF-mode MD5)
    password_hash = hash_password(body.password)

    new_user: Dict = {
        "_id": f"user_{secrets.token_hex(8)}",
        "email": email,
        "fullName": full_name,
        "role": role,
        "department": department,
        "studentOrStaffId": new_id_val,
        "passwordHash": password_hash,
        "status": "active",
        "failedLoginAttempts": 0,
        "lockoutUntil": None,
        "createdAt": now_str,
        "updatedAt": now_str,
        "lastLoginAt": None,
        "enrolledCourses": [],
        "profilePicture": None,
    }

    db.users.append(new_user)

    # Newly registered students join the flagship attendance roster immediately,
    # so their attendance view uses the same data source as the class roster.
    if role == "student" and any(cls["_id"] == "cls_cs401" for cls in db.classes):
        if not any(
            enrollment["classId"] == "cls_cs401" and enrollment["studentId"] == new_user["_id"]
            for enrollment in db.enrollments
        ):
            db.enrollments.append({
                "_id": f"enr_{secrets.token_hex(6)}",
                "classId": "cls_cs401",
                "studentId": new_user["_id"],
                "enrolledAt": now_str,
                "status": "enrolled",
                "createdAt": now_str,
                "updatedAt": now_str,
            })

    try:
        add_user_to_sqlite(new_user, raw_password=body.password if not is_secure() else None)
    except Exception as e:
        print(f"[Warning] Could not sync user to SQLite: {e}")

    add_audit_log({
        "actorId": new_user["_id"], "actorEmail": email,
        "actorRole": role, "action": "USER_REGISTERED",
        "resourceType": "User", "resourceId": new_user["_id"],
        "outcome": "success", "ip": client_ip,
    })

    # Auto-login: create session
    session_id = generate_secure_token(32)
    csrf_token = generate_csrf_token()
    now_ts = datetime.utcnow().timestamp()

    db.sessions[session_id] = {
        "sessionId": session_id,
        "userId": new_user["_id"],
        "role": role,
        "email": email,
        "fullName": full_name,
        "csrfToken": csrf_token,
        "createdAt": now_ts,
        "lastActiveAt": now_ts,
        "ip": client_ip,
        "userAgent": request.headers.get("user-agent", "Browser"),
    }

    new_user["lastLoginAt"] = now_str

    resp_data = {
        "success": True,
        "data": {
            "user": {
                "id": new_user["_id"], "email": email,
                "fullName": full_name, "role": role,
                "studentOrStaffId": new_id_val,
                "department": department, "status": "active",
            },
            "sessionId": session_id,
            "csrfToken": csrf_token,
            "securityTrace": {
                "passwordHashAlgorithm": _password_hash_description(password_hash),
                "passwordHashPreview": _password_hash_preview(password_hash),
                "accountDatabaseId": new_user["_id"],
                "identityDatabaseFields": "users_auth._id + users_auth.studentOrStaffId",
                "passwordDatabaseField": "users_auth.passwordHash",
                "rawPasswordDatabaseField": "users_auth.password",
                "storedAs": "salted hash only" if is_secure() else "unsalted MD5 demo hash",
                "rawPasswordStored": False if is_secure() else True,
            },
        },
    }
    json_resp = JSONResponse(content=resp_data, status_code=201)
    _set_session_cookies(json_resp, session_id, csrf_token)
    return json_resp


# ── POST /logout ──────────────────────────────────────────────────────────────

@router.post("/logout")
async def logout(request: Request, response: Response):
    session_id = request.cookies.get("campus_session")
    user = None
    if session_id and session_id in db.sessions:
        sess = db.sessions[session_id]
        user = db.get_user_by_id(sess["userId"])
        del db.sessions[session_id]

    if user:
        add_audit_log({
            "actorId": user["_id"], "actorEmail": user["email"],
            "actorRole": user["role"], "action": "USER_LOGOUT",
            "resourceType": "User", "resourceId": user["_id"],
            "outcome": "success",
            "ip": request.client.host if request.client else "127.0.0.1",
        })

    json_resp = JSONResponse(content={"success": True, "message": "Logged out successfully."})
    _clear_session_cookies(json_resp)
    return json_resp


# ── GET /me ───────────────────────────────────────────────────────────────────

@router.get("/me")
async def me(request: Request, current_user=Depends(get_current_user)):
    session_id = request.cookies.get("campus_session", "")
    sess = db.sessions.get(session_id, {})
    return {
        "success": True,
        "data": {
            "id": current_user["_id"],
            "email": current_user["email"],
            "fullName": current_user["fullName"],
            "role": current_user["role"],
            "studentOrStaffId": current_user["studentOrStaffId"],
            "department": current_user["department"],
            "status": current_user["status"],
            "lastLoginAt": current_user.get("lastLoginAt"),
            "sessionId": session_id,
            "csrfToken": sess.get("csrfToken", ""),
        }
    }


# ── POST /bootstrap & /reset ──────────────────────────────────────────────────

@router.post("/bootstrap")
@router.post("/reset")
async def bootstrap(request: Request, current_user=Depends(require_roles("admin"))):
    from core.sqlite_db import init_sqlite_db
    db.seed(force=True)
    init_sqlite_db(force=True)

    add_audit_log({
        "actorId": current_user["_id"], "actorEmail": current_user["email"],
        "actorRole": current_user["role"], "action": "DATABASE_RESET_SEED",
        "resourceType": "System", "resourceId": "database",
        "outcome": "success",
        "ip": request.client.host if request.client else "127.0.0.1",
    })

    return {
        "success": True,
        "message": "Database wiped and re-seeded cleanly with institutional demo data.",
    }


# ── POST /change-password ─────────────────────────────────────────────────────

@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    request: Request,
    response: Response,
    current_user=Depends(get_current_user),
):
    is_valid = verify_password(body.currentPassword, current_user["passwordHash"])
    if not is_valid:
        add_security_event({
            "eventCategory": "auth", "severity": "medium",
            "eventType": "PASSWORD_CHANGE_WRONG_CURRENT",
            "message": f"Failed password change for {current_user['email']} — wrong current password.",
            "affectedResource": current_user["_id"], "outcome": "blocked",
            "ip": request.client.host if request.client else "127.0.0.1",
            "actorId": current_user["_id"], "actorEmail": current_user["email"],
        })
        raise HTTPException(status_code=401, detail={"code": "INVALID_CREDENTIALS", "message": "Current password is incorrect."})

    if body.newPassword == body.currentPassword:
        raise HTTPException(status_code=400, detail={"code": "SAME_PASSWORD", "message": "New password must differ from current password."})

    # Hash new password
    current_user["passwordHash"] = hash_password(body.newPassword)
    current_user["updatedAt"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # Invalidate all user sessions
    to_delete = [sid for sid, s in db.sessions.items() if s["userId"] == current_user["_id"]]
    for sid in to_delete:
        del db.sessions[sid]

    add_audit_log({
        "actorId": current_user["_id"], "actorEmail": current_user["email"],
        "actorRole": current_user["role"], "action": "PASSWORD_CHANGED",
        "resourceType": "User", "resourceId": current_user["_id"],
        "outcome": "success",
        "ip": request.client.host if request.client else "127.0.0.1",
    })

    json_resp = JSONResponse(content={"success": True, "message": "Password updated successfully. Please log in again."})
    _clear_session_cookies(json_resp)
    return json_resp
