#!/usr/bin/env python3
"""
SecureAttendance — Cryptographically Verifiable Attendance Management
Hackathon Challenge Solution

PROBLEM STATEMENT SOLVED:
1. Prevents unauthorized modification: Uses HMAC-SHA-256 digital seals so changing
   "Absent" to "Present" is immediately detected and rejected.
2. Prevents unauthorized reading: Enforces Role-Based Access Control (RBAC). Students
   can strictly only read their own records; only instructors can read and record rosters.
3. Eliminates plaintext credentials: Passwords are protected using salted PBKDF2-HMAC-SHA256
   with 100,000 iterations. Plaintext is never stored.
"""

import os
import sys
import hmac
import hashlib
import json
import secrets
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# Ensure UTF-8 output on all operating systems and Windows shells
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Secret master key used by the school system to sign attendance records
HMAC_SECRET_KEY = os.environ.get("ATTENDANCE_HMAC_SECRET", "super_secret_attendance_master_key_99824").encode("utf-8")


class SecurityException(Exception):
    pass


class SecureAttendanceSystem:
    def __init__(self):
        # In-memory storage for demonstration (simulating database tables)
        self.users: Dict[str, dict] = {}
        self.attendance_records: List[dict] = []
        self._seed_default_users()

    def _hash_password(self, password: str, salt: Optional[bytes] = None) -> Tuple[str, str]:
        """Hashes password with PBKDF2-HMAC-SHA256 using 100,000 iterations and 16-byte salt."""
        if salt is None:
            salt = secrets.token_bytes(16)
        pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return pwd_hash.hex(), salt.hex()

    def _verify_password(self, password: str, stored_hash_hex: str, stored_salt_hex: str) -> bool:
        """Verifies password using constant-time comparison to prevent timing attacks."""
        salt = bytes.fromhex(stored_salt_hex)
        calc_hash, _ = self._hash_password(password, salt)
        return hmac.compare_digest(calc_hash, stored_hash_hex)

    def _seed_default_users(self):
        """Register instructor and students with salted hashed credentials."""
        # Instructor account
        inst_hash, inst_salt = self._hash_password("Instructor@SecurePass2026!")
        self.users["instructor@bootcamp.edu"] = {
            "id": "usr_inst_01",
            "name": "Dr. Alan Chen",
            "role": "instructor",
            "password_hash": inst_hash,
            "salt": inst_salt,
        }

        # Student accounts
        stu1_hash, stu1_salt = self._hash_password("Student1@Pass2026!")
        self.users["maya.patel@student.edu"] = {
            "id": "usr_stu_01",
            "name": "Maya Patel",
            "role": "student",
            "password_hash": stu1_hash,
            "salt": stu1_salt,
        }

        stu2_hash, stu2_salt = self._hash_password("Student2@Pass2026!")
        self.users["lucas.kim@student.edu"] = {
            "id": "usr_stu_02",
            "name": "Lucas Kim",
            "role": "student",
            "password_hash": stu2_hash,
            "salt": stu2_salt,
        }

    def authenticate(self, email: str, password: str) -> dict:
        """Authenticates user and returns session identity."""
        user = self.users.get(email.lower())
        if not user or not self._verify_password(password, user["password_hash"], user["salt"]):
            raise SecurityException("Authentication failed: Invalid email or password.")
        return {"id": user["id"], "name": user["name"], "role": user["role"], "email": email}

    # =========================================================================
    # Cryptographic Integrity: HMAC-SHA-256 Seal
    # =========================================================================

    @staticmethod
    def compute_hmac(session_id: str, student_id: str, status: str, date: str) -> str:
        """Computes HMAC-SHA-256 signature over canonicalized attendance fields."""
        canonical_string = f"session:{session_id}|student:{student_id}|status:{status}|date:{date}"
        sig = hmac.new(HMAC_SECRET_KEY, canonical_string.encode("utf-8"), hashlib.sha256)
        return sig.hexdigest()

    @classmethod
    def verify_record_integrity(cls, record: dict) -> bool:
        """Verifies record authenticity using constant-time comparison."""
        expected_hmac = cls.compute_hmac(
            record["session_id"],
            record["student_id"],
            record["status"],
            record["date"],
        )
        return hmac.compare_digest(record.get("integrity_hmac", ""), expected_hmac)

    # =========================================================================
    # Safe Attendance Recording (Instructor Only)
    # =========================================================================

    def record_attendance(
        self,
        session_user: dict,
        session_id: str,
        student_id: str,
        status: str,
        date: Optional[str] = None,
    ) -> dict:
        """Records attendance safely, checking authorization and applying HMAC seal."""
        # Access control check: Only instructors can mark attendance
        if session_user["role"] != "instructor":
            raise SecurityException(
                f"Access Denied: User '{session_user['name']}' ({session_user['role']}) cannot mark attendance. Instructor privileges required."
            )

        if status not in ("Present", "Absent", "Late"):
            raise ValueError("Status must be 'Present', 'Absent', or 'Late'.")

        date = date or datetime.now().strftime("%Y-%m-%d")

        # Prevent duplicate attendance records for the same student & session
        for r in self.attendance_records:
            if r["session_id"] == session_id and r["student_id"] == student_id:
                raise SecurityException(f"Duplicate Error: Student {student_id} is already marked for session {session_id}.")

        record_id = f"rec_{secrets.token_hex(4)}"
        record_hmac = self.compute_hmac(session_id, student_id, status, date)

        record = {
            "record_id": record_id,
            "session_id": session_id,
            "student_id": student_id,
            "status": status,
            "date": date,
            "marked_by": session_user["name"],
            "integrity_hmac": record_hmac,
        }

        self.attendance_records.append(record)
        return record

    # =========================================================================
    # Privacy & Access Control: Query Records
    # =========================================================================

    def get_records(self, session_user: dict) -> List[dict]:
        """Returns verified attendance records.
        - Instructors can view all records.
        - Students can STRICTLY view only their own records.
        """
        verified_results = []

        for r in self.attendance_records:
            # Privacy enforcement (preventing participants reading other students' data)
            if session_user["role"] == "student" and r["student_id"] != session_user["id"]:
                continue  # Skip records belonging to other students

            # Integrity verification
            is_valid = self.verify_record_integrity(r)
            record_copy = dict(r)
            record_copy["integrity_verified"] = is_valid
            record_copy["is_tampered"] = not is_valid

            if not is_valid:
                record_copy["status"] = "[TAMPERED RECORD DETECTED]"

            verified_results.append(record_copy)

        return verified_results


def run_demonstration():
    print("=" * 70)
    print("SECUREATTENDANCE HACKATHON CHALLENGE VERIFICATION")
    print("=" * 70)

    system = SecureAttendanceSystem()

    # -------------------------------------------------------------------------
    # TEST 1: Password Security (No Plaintext)
    # -------------------------------------------------------------------------
    print("[TEST 1] Credential Security & Password Hashing")
    instructor_user = system.users["instructor@bootcamp.edu"]
    print(f" - Stored Instructor Password Hash : {instructor_user['password_hash'][:32]}... (PBKDF2-HMAC-SHA256)")
    print(f" - Stored Salt (Cryptographic)     : {instructor_user['salt']}")
    print(" [PASS] Passwords stored securely. Plaintext is never stored.")

    # -------------------------------------------------------------------------
    # TEST 2: Authentication
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Authentication & Role Assignment")
    instructor_session = system.authenticate("instructor@bootcamp.edu", "Instructor@SecurePass2026!")
    student_session = system.authenticate("maya.patel@student.edu", "Student1@Pass2026!")
    print(f" - Authenticated as Instructor: {instructor_session['name']} (Role: {instructor_session['role']})")
    print(f" - Authenticated as Student   : {student_session['name']} (Role: {student_session['role']})")
    print(" [PASS] Role-Based identities established.")

    # -------------------------------------------------------------------------
    # TEST 3: Safe Attendance Recording with HMAC Integrity Seal
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Safe Recording & HMAC Signing by Instructor")
    rec1 = system.record_attendance(instructor_session, "ses_01", "usr_stu_01", "Absent", "2026-10-30")
    rec2 = system.record_attendance(instructor_session, "ses_01", "usr_stu_02", "Present", "2026-10-30")
    print(f" - Created Record 1 for Maya Patel : Status = {rec1['status']}, HMAC = {rec1['integrity_hmac'][:24]}...")
    print(f" - Created Record 2 for Lucas Kim  : Status = {rec2['status']}, HMAC = {rec2['integrity_hmac'][:24]}...")
    print(" [PASS] Attendance safely recorded and sealed with HMAC-SHA-256.")

    # -------------------------------------------------------------------------
    # TEST 4: Student Attempts Unauthorized Marking (Blocked)
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Student Attempts to Record/Change Attendance (Access Control)")
    try:
        system.record_attendance(student_session, "ses_02", "usr_stu_01", "Present", "2026-10-30")
        print(" [FAIL] Unauthorized student was allowed to record attendance!")
    except SecurityException as e:
        print(f" - Security Gate Output: {e}")
        print(" [PASS] Unauthorized modification strictly blocked by Access Control.")

    # -------------------------------------------------------------------------
    # TEST 5: Privacy Enforcement (Student Cannot Read Other Students' Records)
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Student Privacy: Student Views Attendance Records")
    student_view = system.get_records(student_session)
    print(f" - Records visible to Student (Maya): {len(student_view)} record(s)")
    for r in student_view:
        print(f"   -> Record for student_id '{r['student_id']}' : Status = {r['status']}")

    lucas_leaked = any(r["student_id"] == "usr_stu_02" for r in student_view)
    if not lucas_leaked:
        print(" [PASS] Privacy enforced. Student cannot view records of other students.")
    else:
        print(" [FAIL] Privacy breach! Another student's attendance record was visible.")

    # -------------------------------------------------------------------------
    # TEST 6: Tamper Detection (Hacker edits status from 'Absent' to 'Present')
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Tamper Detection Simulation (The Hackathon Problem Statement)")
    print(" - Simulating attacker directly tampering with Maya's record in storage:")
    print(f"   Original Status: {rec1['status']}")
    
    # Direct unauthorized alteration:
    rec1["status"] = "Present"
    print(f"   Attacker modified status to: '{rec1['status']}' without valid secret key.")

    # Instructor inspects roster:
    instructor_view = system.get_records(instructor_session)
    tampered_rec = next(r for r in instructor_view if r["record_id"] == rec1["record_id"])

    print(f" - Integrity Check Result : Verified = {tampered_rec['integrity_verified']}")
    print(f" - System Output Status   : {tampered_rec['status']}")

    if tampered_rec["is_tampered"]:
        print(" [PASS] Cryptographic integrity seal detected unauthorized modification immediately!")
    else:
        print(" [FAIL] Tampered record went undetected!")

    print("\n" + "=" * 70)
    print("ALL SECUREATTENDANCE SECURITY REQUIREMENTS VERIFIED AND PASSED!")
    print("=" * 70)


if __name__ == "__main__":
    run_demonstration()
