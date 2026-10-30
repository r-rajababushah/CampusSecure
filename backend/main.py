"""
SecureCampus FastAPI Backend
Main application entry point with Dynamic Security Mode Toggle (ON / OFF).

LOCAL DEMO SAFETY RULES:
- Binds strictly to 127.0.0.1 (localhost only).
- In ON mode: Full zero-trust defenses (CSP, Helmet headers, CSRF, rate limits, Argon2, HMAC).
- In OFF mode: Vulnerable demo paths exposed for local security testing only.
"""
import secrets
import traceback
from datetime import datetime
from typing import Any

from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.security_mode import is_secure, get_security_mode_str
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.attendance import router as attendance_router
from routers.classes import router as classes_router
from routers.projects import router as projects_router
from routers.tasks import router as tasks_router
from routers.messages import router as messages_router
from routers.audit import router as audit_router
from routers.security_events import router as security_events_router
from routers.notifications import router as notifications_router
from routers.admin_security import router as admin_security_router
from routers.sqli import router as sqli_router

# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SecureCampus API",
    description="Secure student-faculty management platform with dual-mode cybersecurity demo toggle.",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-CSRF-Token", "X-Security-Mode", "X-Demo-Warning"],
)

# ─── Security Headers Middleware (Dual Mode) ──────────────────────────────────

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)

    if is_secure():
        # SECURE PATH: Strict Content-Security-Policy & Helmet-equivalent protective headers
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' ws: http:; "
            "object-src 'none'; "
            "base-uri 'self';"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Security-Mode"] = "ON"
    else:
        # DEMO-ONLY INSECURE PATH: No CSP header (allows XSS execution) and permissive headers
        response.headers["X-Security-Mode"] = "OFF - INSECURE DEMO MODE"
        response.headers["X-Demo-Warning"] = "INSECURE DEMO MODE - LOCAL ONLY"

    return response

# ─── CSRF Middleware (Dual Mode) ──────────────────────────────────────────────

CSRF_EXEMPT_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/logout",
    "/api/v1/auth/bootstrap",
    "/api/v1/auth/reset",
    "/api/security-mode",
    "/api/v1/security-mode",
}
MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

@app.middleware("http")
async def csrf_middleware(request: Request, call_next):
    path = request.url.path
    method = request.method.upper()

    if is_secure():
        # SECURE PATH: Anti-CSRF Token Validation
        if method in MUTATING_METHODS and path not in CSRF_EXEMPT_PATHS:
            from routers.deps import extract_session_id
            session_id = extract_session_id(request)
            if session_id:
                from core.database import db
                session = db.sessions.get(session_id)
                if session:
                    csrf_header = request.headers.get("x-csrf-token", "")
                    stored_csrf = session.get("csrfToken", "")
                    if not csrf_header or not secrets.compare_digest(csrf_header, stored_csrf):
                        db.add_security_event({
                            "_id": f"sec_{secrets.token_hex(6)}",
                            "eventCategory": "authorization",
                            "severity": "medium",
                            "eventType": "CSRF_VALIDATION_FAILED",
                            "message": f"CSRF token mismatch on {method} {path}",
                            "affectedResource": path,
                            "outcome": "blocked",
                            "ip": request.client.host if request.client else "127.0.0.1",
                            "isSimulatedDemo": False,
                            "createdAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                        })
                        return JSONResponse(
                            status_code=403,
                            content={"success": False, "error": {"code": "CSRF_INVALID", "message": "CSRF token validation failed."}}
                        )
    else:
        # DEMO-ONLY INSECURE PATH: CSRF token validation bypassed
        pass

    return await call_next(request)

# ─── Exception Handlers (Dual Mode) ───────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        error = detail
    else:
        error = {"code": "ERROR", "message": str(detail)}
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": error}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    if is_secure():
        # SECURE PATH: Generic sanitized error message without stack trace
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": {"code": "INTERNAL_ERROR", "message": "An internal server error occurred."}}
        )
    else:
        # DEMO-ONLY INSECURE PATH: Verbose error details with Python exception traceback
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "DEBUG_EXCEPTION",
                    "message": str(exc),
                    "exceptionType": exc.__class__.__name__,
                    "traceback": traceback.format_exc(),
                }
            }
        )

# ─── Routers ──────────────────────────────────────────────────────────────────

API_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=f"{API_PREFIX}/auth", tags=["auth"])
app.include_router(users_router, prefix=f"{API_PREFIX}/users", tags=["users"])
app.include_router(attendance_router, prefix=f"{API_PREFIX}/attendance", tags=["attendance"])
app.include_router(classes_router, prefix=f"{API_PREFIX}/classes", tags=["classes"])
app.include_router(projects_router, prefix=f"{API_PREFIX}/projects", tags=["projects"])
app.include_router(tasks_router, prefix=f"{API_PREFIX}/tasks", tags=["tasks"])
app.include_router(messages_router, prefix=f"{API_PREFIX}/messages", tags=["messages"])
app.include_router(audit_router, prefix=f"{API_PREFIX}/audit", tags=["audit"])
app.include_router(security_events_router, prefix=f"{API_PREFIX}/security-events", tags=["security-events"])
app.include_router(notifications_router, prefix=f"{API_PREFIX}/notifications", tags=["notifications"])
app.include_router(sqli_router, prefix=f"{API_PREFIX}/sqli-lab", tags=["sqli-lab"])

# Security Mode Toggle routes (mounted at /admin/security-mode, /api/security-mode, and /api/v1/security-mode)
app.include_router(admin_security_router, prefix="/admin", tags=["security-toggle"])
app.include_router(admin_security_router, prefix="/api", tags=["security-toggle"])
app.include_router(admin_security_router, prefix=f"{API_PREFIX}/admin", tags=["security-toggle"])
app.include_router(admin_security_router, prefix=f"{API_PREFIX}", tags=["security-toggle"])

# ─── Real-Time WebSocket Gateway ──────────────────────────────────────────────

@app.websocket("/ws/projects/{project_id}")
async def websocket_project_chat(websocket: WebSocket, project_id: str):
    from core.ws_manager import ws_manager
    user_id = websocket.query_params.get("userId")
    await ws_manager.connect_project(websocket, project_id, user_id)
    try:
        while True:
            # Keep alive and receive any client ping
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_project(websocket, project_id, user_id)


# ─── Root & Health ────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "name": "SecureCampus API",
        "version": "2.0.0",
        "securityMode": get_security_mode_str(),
        "isSecure": is_secure(),
        "status": "operational",
        "docs": "/api/docs",
        "host": "127.0.0.1 (Localhost Only)",
    }

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "securityMode": get_security_mode_str(),
        "isSecure": is_secure(),
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

if __name__ == "__main__":
    import uvicorn
    # Localhost only (127.0.0.1) as required by strict rules
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
