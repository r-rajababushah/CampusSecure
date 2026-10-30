"""
Interactive SQL Injection (SQLi) Lab router — /api/v1/sqli-lab
Supports both Vulnerable string-concatenated queries and Secure parameterized queries.
"""
import time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel

from core.sqlite_db import get_connection
from core.security_mode import is_secure
from routers.deps import get_current_user, add_security_event

router = APIRouter()


class SearchPayload(BaseModel):
    query: str = ""
    mode: Optional[str] = "vulnerable"  # "vulnerable" | "secure"


PRESETS = [
    {
        "id": "benign",
        "category": "Standard Search",
        "title": "Legitimate Student Query",
        "payload": "STU-2023-881",
        "description": "Standard lookup by student ID. Safely finds Maya Patel in both modes.",
    },
    {
        "id": "bypass",
        "category": "Authentication / Filter Bypass",
        "title": "Classic ' OR '1'='1 Dump",
        "payload": "' OR '1'='1",
        "description": "Forces WHERE clause condition to evaluate to true for all rows, dumping all students in Vulnerable Mode.",
    },
    {
        "id": "union_creds",
        "category": "Data Exfiltration",
        "title": "UNION SELECT Credential Harvesting",
        "payload": "' UNION SELECT 0, _id, email, role, passwordHash, 0, status FROM users_auth --",
        "description": "Appends rows from the users_auth table, extracting user password hashes and credentials.",
    },
    {
        "id": "schema_enum",
        "category": "Reconnaissance",
        "title": "SQLite Schema Enumeration",
        "payload": "' UNION SELECT 1, name, sql, 'sqlite_master', 0, 0, 'table' FROM sqlite_master WHERE type='table' --",
        "description": "Queries sqlite_master to reveal all hidden database tables, column definitions, and schema structure.",
    },
]


@router.get("/presets")
async def get_presets(current_user=Depends(get_current_user)):
    return {"success": True, "data": PRESETS}


@router.get("/schema")
async def get_schema(current_user=Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"success": True, "data": tables}


@router.post("/search")
async def search_students(
    body: SearchPayload,
    request: Request,
    current_user=Depends(get_current_user),
):
    query_str = body.query.strip()
    # Force secure query if system-wide security is ON, or respect body.mode if user explicitly requests
    effective_mode = "secure" if is_secure() else (body.mode or "vulnerable")
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Detection heuristics
    signatures = []
    lower_q = query_str.lower()
    for sig in ["' or '", "' or 1=1", "union select", "--", "/*", "sqlite_master", "1=1"]:
        if sig in lower_q:
            signatures.append(sig.upper())

    is_injection = len(signatures) > 0
    t0 = time.time()
    conn = get_connection()
    cursor = conn.cursor()

    executed_query = ""
    rows: List[Dict[str, Any]] = []

    try:
        if effective_mode == "vulnerable":
            # DEMO-ONLY INSECURE PATH: Raw string concatenation SQL execution
            executed_query = f"SELECT id, studentId, fullName, email, department, gpa, status FROM students_directory WHERE studentId = '{query_str}' OR fullName LIKE '%{query_str}%'"
            cursor.execute(executed_query)
            rows = [dict(r) for r in cursor.fetchall()]
        else:
            # SECURE PATH: Parameterized query (prevents SQL injection)
            executed_query = "SELECT id, studentId, fullName, email, department, gpa, status FROM students_directory WHERE studentId = ? OR fullName LIKE ?"
            cursor.execute(executed_query, (query_str, f"%{query_str}%"))
            rows = [dict(r) for r in cursor.fetchall()]

        t1 = time.time()
        conn.close()

        if is_injection and effective_mode == "secure":
            add_security_event({
                "eventCategory": "injection", "severity": "high",
                "eventType": "SQL_INJECTION_ATTEMPT_DEFENDED",
                "message": f"SQLi pattern detected in query: \"{query_str[:80]}\". Neutralized by parameterized query.",
                "affectedResource": "/api/v1/sqli-lab/search", "outcome": "blocked",
                "ip": client_ip,
                "actorId": current_user["_id"], "actorEmail": current_user["email"],
            })

        return {
            "success": True,
            "data": {
                "executedQuery": executed_query,
                "rows": rows,
                "executionTimeMs": round((t1 - t0) * 1000, 2),
                "mode": effective_mode,
                "isInjectionDetected": is_injection,
                "detectedSignatures": signatures,
            }
        }
    except Exception as e:
        conn.close()
        t1 = time.time()
        if effective_mode == "vulnerable":
            # In vulnerable mode, return the verbose syntax error
            return {
                "success": False,
                "error": {
                    "code": "SQL_SYNTAX_ERROR",
                    "message": str(e),
                    "executedQuery": executed_query,
                    "executionTimeMs": round((t1 - t0) * 1000, 2),
                }
            }
        raise HTTPException(status_code=400, detail={"code": "QUERY_ERROR", "message": "Search query could not be processed."})

