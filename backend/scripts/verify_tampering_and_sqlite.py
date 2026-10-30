"""
SecureCampus Verification Suite:
Tests attendance roster, cryptographic HMAC tamper detection,
and persistent SQLite tamper & session logging.
"""
import sys
import os
import sqlite3
from datetime import datetime
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from core.database import db
from core.crypto import compute_attendance_hmac, verify_attendance_hmac
from core.sqlite_db import (
    get_connection,
    log_tamper_event_to_sqlite,
    log_session_to_sqlite,
    query_login,
)
from core.security_mode import is_secure, set_security_mode, get_security_mode_str

def separator(title: str):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)

def main():
    separator("1. CHECKING SQLITE DATABASE & SEEDED STUDENTS")
    conn = get_connection()
    c = conn.cursor()

    tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    print(f"[+] SQLite Tables Found: {', '.join(tables)}")

    users_count = c.execute("SELECT COUNT(*) FROM users_auth").fetchone()[0]
    students_count = c.execute("SELECT COUNT(*) FROM students_directory").fetchone()[0]
    enrollments_count = c.execute("SELECT COUNT(*) FROM student_enrollments WHERE classCode = 'CS-401'").fetchone()[0]

    print(f"[+] Users in 'users_auth':          {users_count}")
    print(f"[+] Students in 'students_directory': {students_count}")
    print(f"[+] CS-401 Enrolled Students:        {enrollments_count}")

    print("\n[+] Sample Enrolled Students in CS-401 (from SQLite):")
    sample_students = c.execute(
        "SELECT studentId, studentName, classCode, semester FROM student_enrollments WHERE classCode = 'CS-401' LIMIT 5"
    ).fetchall()
    for s in sample_students:
        print(f"    - {s[0]}: {s[1]} | Course: {s[2]} | Semester: {s[3]}")

    separator("2. TESTING SESSION LOGIN & SQLITE SESSION LOGGING")
    test_session_id = f"test_session_{int(datetime.utcnow().timestamp())}"
    test_user_id = "usr_fac_01"
    test_user_email = "alan.chen@faculty.campus.edu"
    test_user_role = "faculty"

    print(f"[*] Recording faculty login session '{test_session_id}' into SQLite 'auth_session_logs'...")
    log_session_to_sqlite(
        session_id=test_session_id,
        user_id=test_user_id,
        user_email=test_user_email,
        user_role=test_user_role,
        client_ip="127.0.0.1",
        user_agent="Automated-Security-Tester/2.0",
        auth_method="argon2id_salted",
        status="authenticated"
    )

    logged_session = c.execute(
        "SELECT sessionId, userEmail, userRole, loginAt, clientIp, authMethod, status FROM auth_session_logs WHERE sessionId = ?",
        (test_session_id,)
    ).fetchone()
    assert logged_session is not None, "Failed to retrieve logged session from SQLite!"
    print(f"[PASSED] Verified SQLite 'auth_session_logs':")
    print(f"    - Session ID:  {logged_session[0]}")
    print(f"    - User Email:  {logged_session[1]} (Role: {logged_session[2]})")
    print(f"    - Login Time:  {logged_session[3]}")
    print(f"    - Auth Method: {logged_session[5]}")

    separator("3. TESTING ATTENDANCE HMAC INTEGRITY & SIMULATED TAMPERING")
    # Take an attendance record
    record = db.attendance_records[0]
    session = next((s for s in db.attendance_sessions if s["_id"] == record["sessionId"]), None)
    date = session["date"] if session else "2026-10-23"

    print(f"[*] Inspecting baseline legitimate attendance record:")
    print(f"    - Record ID:     {record['_id']}")
    print(f"    - Student ID:    {record['studentId']}")
    print(f"    - Original Status:{record['status']}")
    print(f"    - Stored HMAC:   {record['integrityHmac']}")

    # Verify baseline HMAC
    baseline_valid = verify_attendance_hmac(record)
    print(f"[+] Baseline HMAC verification: {'VALID (Pass)' if baseline_valid else 'INVALID'}")
    assert baseline_valid, "Baseline record failed initial HMAC verification!"

    # Simulate Tampering: Alter status from absent -> present or present -> absent without secret key
    original_status = record["status"]
    tampered_status = "present" if original_status == "absent" else "absent"
    print(f"\n[!] Simulating Unauthorized Direct Database Edit:")
    print(f"    Status changed: '{original_status}' -> '{tampered_status}' (Without HMAC update)")
    record["status"] = tampered_status

    # Verify after tampering
    tampered_valid = verify_attendance_hmac(record)
    print(f"[+] Post-tamper HMAC verification: {'VALID' if tampered_valid else 'TAMPERED DETECTED (Pass)'}")
    assert not tampered_valid, "Tampered record unexpectedly passed HMAC verification!"

    # Log to SQLite attendance_tamper_logs
    print(f"\n[*] Logging detected tampering event into SQLite 'attendance_tamper_logs'...")
    log_tamper_event_to_sqlite(
        record_id=record["_id"],
        student_id=record["studentId"],
        session_id=record["sessionId"],
        original_status=original_status,
        tampered_status=tampered_status,
        client_ip="127.0.0.1",
        detected_by="automated_verifier",
        severity="CRITICAL",
        notes=f"HMAC seal mismatch: canonical state tampered to '{tampered_status}'"
    )

    tamper_entry = c.execute(
        "SELECT id, recordId, studentId, originalStatus, tamperedStatus, detectedAt, detectedBy, clientIp, severity, notes "
        "FROM attendance_tamper_logs WHERE recordId = ? ORDER BY id DESC LIMIT 1",
        (record["_id"],)
    ).fetchone()
    assert tamper_entry is not None, "Failed to retrieve tamper log from SQLite!"
    print(f"[PASSED] Verified SQLite 'attendance_tamper_logs' entry:")
    print(f"    - Log ID:          #{tamper_entry[0]}")
    print(f"    - Record ID:       {tamper_entry[1]}")
    print(f"    - Student ID:      {tamper_entry[2]}")
    print(f"    - Status Altered:  '{tamper_entry[3]}' -> '{tamper_entry[4]}'")
    print(f"    - Detected At:     {tamper_entry[5]}")
    print(f"    - Severity:        {tamper_entry[8]}")
    print(f"    - Forensic Notes:  {tamper_entry[9]}")

    # Restore legitimate status
    record["status"] = original_status
    print(f"\n[+] Reverted record '{record['_id']}' to clean state '{original_status}'.")

    conn.close()
    separator("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
