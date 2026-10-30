"""
Attendance router — /api/v1/attendance
Supports dual-mode behavior governed by is_secure():
- IDOR: In ON mode, students can strictly only view their own attendance records.
        In OFF mode, students can view any other student's records by passing studentId.
- Tamper Detection: In ON mode, HMAC-SHA-256 digital seals are computed and verified on read.
                    A mismatch immediately alerts the Admin with IP, time, user ID, and details.
                    In OFF mode, no HMAC verification is performed; tampered records go undetected.
"""
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, Depends

from core.database import db
from core.crypto import compute_attendance_hmac, verify_attendance_hmac
from core.sqlite_db import log_tamper_event_to_sqlite
from core.security_mode import is_secure
from models.schemas import (
    CreateAttendanceSessionRequest,
    MarkAttendanceRequest,
    CorrectAttendanceRequest,
    UpdateSessionStatusRequest,
)
from routers.deps import get_current_user, require_roles, add_audit_log, add_security_event

router = APIRouter()


# ── GET /sessions ─────────────────────────────────────────────────────────────

@router.get("/sessions")
async def list_sessions(request: Request, classId: str = None, current_user=Depends(get_current_user)):
    if not classId:
        raise HTTPException(status_code=400, detail={"code": "MISSING_PARAM", "message": "classId is required."})

    cls = next((c for c in db.classes if c["_id"] == classId), None)
    if not cls:
        raise HTTPException(status_code=404, detail={"code": "CLASS_NOT_FOUND", "message": "Class not found."})

    role = current_user["role"]
    if is_secure():
        if role == "student":
            enrolled = any(
                e["classId"] == classId and e["studentId"] == current_user["_id"] and e["status"] == "enrolled"
                for e in db.enrollments
            )
            if not enrolled:
                raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You are not enrolled in this course."})
        elif role == "faculty" and cls["facultyId"] != current_user["_id"]:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You are not assigned to this class."})
    else:
        # DEMO-ONLY INSECURE PATH: No class-assignment or enrollment verification
        pass

    sessions = sorted(
        [s for s in db.attendance_sessions if s["classId"] == classId],
        key=lambda s: s["date"], reverse=True
    )
    return {"success": True, "data": sessions}


# ── POST /sessions ────────────────────────────────────────────────────────────

@router.post("/sessions", status_code=201)
async def create_session(
    body: CreateAttendanceSessionRequest,
    request: Request,
    current_user=Depends(require_roles("faculty", "admin")),
):
    cls = next((c for c in db.classes if c["_id"] == body.classId), None)
    if not cls:
        raise HTTPException(status_code=404, detail={"code": "CLASS_NOT_FOUND", "message": "Class not found."})

    if is_secure() and current_user["role"] == "faculty" and cls["facultyId"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You can only create sessions for your assigned classes."})

    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    session = {
        "_id": f"ses_{secrets.token_hex(6)}",
        "classId": body.classId,
        "date": body.date,
        "title": body.title,
        "facultyId": current_user["_id"],
        "status": "open",
        "sessionCode": body.sessionCode or f"SEC-{secrets.randbelow(9000) + 1000}",
        "createdAt": now,
        "updatedAt": now,
    }
    db.attendance_sessions.append(session)

    add_audit_log({
        "actorId": current_user["_id"], "actorEmail": current_user["email"],
        "actorRole": current_user["role"], "action": "ATTENDANCE_SESSION_CREATED",
        "resourceType": "AttendanceSession", "resourceId": session["_id"],
        "details": {"classCode": cls["code"], "date": session["date"], "title": session["title"]},
        "outcome": "success",
        "ip": request.client.host if request.client else "127.0.0.1",
    })

    return {"success": True, "data": session}


# ── GET /sessions/:id ─────────────────────────────────────────────────────────

@router.get("/sessions/{session_id}")
async def get_session(session_id: str, current_user=Depends(get_current_user)):
    session = next((s for s in db.attendance_sessions if s["_id"] == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail={"code": "SESSION_NOT_FOUND", "message": "Session not found."})
    return {"success": True, "data": session}


# ── PATCH /sessions/:id/status ────────────────────────────────────────────────

@router.patch("/sessions/{session_id}/status")
async def update_session_status(
    session_id: str,
    body: UpdateSessionStatusRequest,
    request: Request,
    current_user=Depends(require_roles("faculty", "admin")),
):
    session = next((s for s in db.attendance_sessions if s["_id"] == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail={"code": "SESSION_NOT_FOUND", "message": "Session not found."})

    if body.status not in ("open", "closed"):
        raise HTTPException(status_code=400, detail={"code": "INVALID_INPUT", "message": "Status must be open or closed."})

    session["status"] = body.status
    session["updatedAt"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"success": True, "data": session}


# ── GET /sessions/:id/records ─────────────────────────────────────────────────

@router.get("/sessions/{session_id}/records")
async def get_session_records(
    session_id: str,
    request: Request,
    current_user=Depends(require_roles("faculty", "admin")),
):
    session = next((s for s in db.attendance_sessions if s["_id"] == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail={"code": "SESSION_NOT_FOUND", "message": "Session not found."})

    client_ip = request.client.host if request.client else "127.0.0.1"
    records = [r for r in db.attendance_records if r["sessionId"] == session_id]
    enriched = []

    for r in records:
        student = db.get_user_by_id(r["studentId"])
        rec_copy = dict(r)

        # Dual-mode Tamper Detection check
        if is_secure():
            is_valid = verify_attendance_hmac(r)
            if not is_valid:
                rec_copy["isTampered"] = True
                rec_copy["status"] = "[TAMPERED RECORD DETECTED]"
                # Send Admin an alert log with IP, time, user ID, and what changed
                add_security_event({
                    "eventCategory": "integrity_failure", "severity": "critical",
                    "eventType": "ATTENDANCE_RECORD_TAMPER_DETECTED",
                    "message": f"HMAC integrity verification failed on record {r['_id']} for student {r['studentId']}.",
                    "affectedResource": f"AttendanceRecord:{r['_id']}", "outcome": "alerted",
                    "ip": client_ip,
                    "actorId": current_user["_id"], "actorEmail": current_user["email"],
                    "notes": f"Stored HMAC does not match canonical fields: session={r['sessionId']}, status={r['status']}",
                })
                log_tamper_event_to_sqlite(
                    record_id=r["_id"],
                    student_id=r["studentId"],
                    session_id=r["sessionId"],
                    original_status="absent",
                    tampered_status=r.get("status", "unknown"),
                    client_ip=client_ip,
                    detected_by=current_user["_id"],
                    severity="critical",
                    notes=f"Stored HMAC does not match canonical fields: session={r['sessionId']}, status={r['status']}",
                )
        else:
            # DEMO-ONLY INSECURE PATH: No tamper detection, modified status returned without alert
            rec_copy["isTampered"] = False

        enriched.append({
            **rec_copy,
            "studentName": student["fullName"] if student else "Unknown",
            "studentEmail": student["email"] if student else "",
            "studentNumber": student["studentOrStaffId"] if student else "",
        })

    return {"success": True, "data": enriched}


# ── POST /sessions/:id/records ────────────────────────────────────────────────

@router.post("/sessions/{session_id}/records", status_code=201)
async def mark_attendance(
    session_id: str,
    body: MarkAttendanceRequest,
    request: Request,
    current_user=Depends(require_roles("faculty", "admin")),
):
    session = next((s for s in db.attendance_sessions if s["_id"] == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail={"code": "SESSION_NOT_FOUND", "message": "Attendance session not found."})

    cls = next((c for c in db.classes if c["_id"] == session["classId"]), None)
    if is_secure() and current_user["role"] == "faculty" and cls and cls["facultyId"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You are not the assigned instructor for this class."})

    if body.status not in ("present", "absent", "late"):
        raise HTTPException(status_code=400, detail={"code": "INVALID_INPUT", "message": "Status must be present, absent, or late."})

    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    if is_secure():
        # SECURE PATH: Compute HMAC seal
        integrity_hmac = compute_attendance_hmac(session_id, body.studentId, body.status, session["date"])
    else:
        # DEMO-ONLY INSECURE PATH: No HMAC integrity sealing
        integrity_hmac = "DEMO_INSECURE_NO_HMAC"

    record = {
        "_id": f"rec_{secrets.token_hex(6)}",
        "sessionId": session_id,
        "classId": session["classId"],
        "studentId": body.studentId,
        "status": body.status,
        "markedAt": now,
        "markedBy": current_user["_id"],
        "integrityHmac": integrity_hmac,
        "isTampered": False,
        "createdAt": now,
        "updatedAt": now,
    }
    db.attendance_records.append(record)

    student = db.get_user_by_id(body.studentId)
    if student:
        notif = {
            "_id": f"notif_{secrets.token_hex(6)}",
            "userId": student["_id"],
            "title": "Attendance Recorded",
            "message": f"Your attendance for {cls['code'] if cls else 'class'} on {session['date']} was marked as {body.status.upper()}.",
            "type": "attendance",
            "link": "/attendance",
            "read": False,
            "createdAt": now,
        }
        db.add_notification(notif)

    return {"success": True, "data": record}


# ── PATCH /records/:id ────────────────────────────────────────────────────────

@router.patch("/records/{record_id}")
async def correct_attendance(
    record_id: str,
    body: CorrectAttendanceRequest,
    request: Request,
    current_user=Depends(require_roles("faculty", "admin")),
):
    record = next((r for r in db.attendance_records if r["_id"] == record_id), None)
    if not record:
        raise HTTPException(status_code=404, detail={"code": "RECORD_NOT_FOUND", "message": "Attendance record not found."})

    session = next((s for s in db.attendance_sessions if s["_id"] == record["sessionId"]), None)
    cls = next((c for c in db.classes if c["_id"] == record["classId"]), None)

    if is_secure() and current_user["role"] == "faculty" and cls and cls["facultyId"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You can only correct records for your classes."})

    if body.status not in ("present", "absent", "late"):
        raise HTTPException(status_code=400, detail={"code": "INVALID_INPUT", "message": "Status must be present, absent, or late."})

    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    date = session["date"] if session else now[:10]

    record["status"] = body.status
    record["correctionReason"] = body.reason
    record["correctedAt"] = now
    record["correctedBy"] = current_user["_id"]
    record["isTampered"] = False

    if is_secure():
        record["integrityHmac"] = compute_attendance_hmac(record["sessionId"], record["studentId"], body.status, date)
    else:
        # DEMO-ONLY INSECURE PATH: No HMAC recalculation
        record["integrityHmac"] = "DEMO_INSECURE_NO_HMAC"

    record["updatedAt"] = now

    add_audit_log({
        "actorId": current_user["_id"], "actorEmail": current_user["email"],
        "actorRole": current_user["role"], "action": "ATTENDANCE_CORRECTED",
        "resourceType": "AttendanceRecord", "resourceId": record["_id"],
        "details": {"newStatus": body.status, "reason": body.reason, "studentId": record["studentId"]},
        "outcome": "success",
        "ip": request.client.host if request.client else "127.0.0.1",
    })

    return {"success": True, "data": record}


# ── GET /my-records (Dual-mode IDOR Check) ────────────────────────────────────

@router.get("/my-records")
async def my_records(
    request: Request,
    studentId: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    target_student_id = current_user["_id"]

    # Dual-mode IDOR evaluation
    if studentId and studentId != current_user["_id"]:
        if is_secure():
            # SECURE PATH: Enforce IDOR protection (students cannot read other students' data)
            client_ip = request.client.host if request.client else "127.0.0.1"
            add_security_event({
                "eventCategory": "authorization", "severity": "high",
                "eventType": "IDOR_ATTEMPT_BLOCKED",
                "message": f"User {current_user['email']} attempted unauthorized access to student records of {studentId}.",
                "affectedResource": f"StudentRecords:{studentId}", "outcome": "blocked",
                "ip": client_ip,
                "actorId": current_user["_id"], "actorEmail": current_user["email"],
            })
            raise HTTPException(
                status_code=403,
                detail={"code": "FORBIDDEN", "message": "Access Denied: You cannot view attendance records for other students."}
            )
        else:
            # DEMO-ONLY INSECURE PATH: IDOR allowed! Query another student's full attendance history
            target_student_id = studentId

    student_records = [r for r in db.attendance_records if r["studentId"] == target_student_id]
    enrollments = [e for e in db.enrollments if e["studentId"] == target_student_id and e["status"] == "enrolled"]

    class_breakdown = []
    for enr in enrollments:
        cls = next((c for c in db.classes if c["_id"] == enr["classId"]), None)
        sessions = [s for s in db.attendance_sessions if s["classId"] == enr["classId"]]
        records_in_class = [r for r in student_records if r["classId"] == enr["classId"]]

        present_count = sum(1 for r in records_in_class if r["status"] == "present")
        late_count = sum(1 for r in records_in_class if r["status"] == "late")
        absent_count = sum(1 for r in records_in_class if r["status"] == "absent")
        total_recorded = len(records_in_class)

        weighted = present_count + late_count * 0.5
        pct = round((weighted / total_recorded) * 100) if total_recorded > 0 else 100

        enriched_records = []
        for r in records_in_class:
            s = next((ses for ses in sessions if ses["_id"] == r["sessionId"]), None)
            enriched_records.append({
                **r,
                "sessionTitle": s["title"] if s else "Session",
                "sessionDate": s["date"] if s else r["createdAt"][:10],
            })

        class_breakdown.append({
            "classId": enr["classId"],
            "classCode": cls["code"] if cls else "Unknown",
            "className": cls["name"] if cls else "Unknown",
            "totalSessions": len(sessions),
            "totalRecorded": total_recorded,
            "presentCount": present_count,
            "lateCount": late_count,
            "absentCount": absent_count,
            "attendancePercentage": pct,
            "records": enriched_records,
        })

    total_classes = len(class_breakdown)
    overall_avg = round(sum(c["attendancePercentage"] for c in class_breakdown) / total_classes) if total_classes > 0 else 100

    return {"success": True, "data": {"overallAttendancePercentage": overall_avg, "classes": class_breakdown, "targetStudentId": target_student_id}}


# ── POST /verify ──────────────────────────────────────────────────────────────

@router.post("/verify")
async def verify_integrity(request: Request, current_user=Depends(require_roles("faculty", "admin"))):
    client_ip = request.client.host if request.client else "127.0.0.1"

    if not is_secure():
        # DEMO-ONLY INSECURE PATH: No integrity check performed
        return {
            "success": True,
            "data": {
                "totalChecked": len(db.attendance_records),
                "verifiedValid": len(db.attendance_records),
                "tamperedCount": 0,
                "tamperedRecordIds": [],
                "status": "CHECKS_DISABLED_INSECURE_MODE",
                "message": "Security is OFF. Tamper verification is bypassed.",
            }
        }

    # SECURE PATH: Verify HMAC on each record
    total_checked = 0
    tampered_count = 0
    tampered_ids = []

    for record in db.attendance_records:
        session = next((s for s in db.attendance_sessions if s["_id"] == record["sessionId"]), None)
        date = session["date"] if session else record["createdAt"][:10]
        is_valid = verify_attendance_hmac(record)
        total_checked += 1
        if not is_valid:
            tampered_count += 1
            record["isTampered"] = True
            tampered_ids.append(record["_id"])
            add_security_event({
                "eventCategory": "integrity_failure", "severity": "critical",
                "eventType": "ATTENDANCE_TAMPER_DETECTED",
                "message": f"HMAC signature mismatch on AttendanceRecord:{record['_id']}. What changed: status={record['status']}.",
                "affectedResource": f"AttendanceRecord:{record['_id']}", "outcome": "alerted",
                "ip": client_ip,
                "actorId": current_user["_id"], "actorEmail": current_user["email"],
                "isSimulatedDemo": True,
                "notes": f"studentId: {record['studentId']}, session: {record['sessionId']}, status: {record['status']}",
            })
            log_tamper_event_to_sqlite(
                record_id=record["_id"],
                student_id=record["studentId"],
                session_id=record["sessionId"],
                original_status="absent",
                tampered_status=record["status"],
                client_ip=client_ip,
                detected_by=current_user["_id"],
                severity="critical",
                notes=f"Read-time sweep HMAC verification failure: status={record['status']}",
            )

    return {"success": True, "data": {
        "totalChecked": total_checked,
        "verifiedValid": total_checked - tampered_count,
        "tamperedCount": tampered_count,
        "tamperedRecordIds": tampered_ids,
        "status": "INTEGRITY_VERIFIED" if tampered_count == 0 else "TAMPERING_DETECTED",
    }}


# ── POST /simulate-tampering ──────────────────────────────────────────────────

@router.post("/simulate-tampering")
async def simulate_tampering(request: Request, current_user=Depends(require_roles("admin", "faculty"))):
    if not db.attendance_records:
        raise HTTPException(status_code=400, detail={"code": "NO_RECORDS", "message": "No records available to tamper."})

    record = db.attendance_records[0]
    original_status = record["status"]
    record["status"] = "absent" if record["status"] == "present" else "present"
    record["isTampered"] = True

    add_security_event({
        "eventCategory": "integrity_failure", "severity": "critical",
        "eventType": "SIMULATED_DATABASE_TAMPERING",
        "message": f"[ATTACK SIMULATION] Record {record['_id']} changed '{original_status}' -> '{record['status']}' directly in DB without HMAC update.",
        "affectedResource": f"AttendanceRecord:{record['_id']}", "outcome": "alerted",
        "ip": request.client.host if request.client else "127.0.0.1",
        "isSimulatedDemo": True,
        "actorEmail": current_user["email"],
    })

    log_tamper_event_to_sqlite(
        record_id=record["_id"],
        student_id=record["studentId"],
        session_id=record["sessionId"],
        original_status=original_status,
        tampered_status=record["status"],
        client_ip=request.client.host if request.client else "127.0.0.1",
        detected_by=current_user["_id"],
        severity="high",
        notes="Simulated direct DB modification without valid cryptographic HMAC",
    )

    return {
        "success": True,
        "message": f"Record {record['_id']} tampered to '{record['status']}'. Run HMAC Verification (in ON mode) to detect.",
        "data": {"recordId": record["_id"], "newStatus": record["status"]},
    }
