"""
In-memory database store for SecureCampus FastAPI backend.
Seeds the same canonical demo data as the TypeScript store.ts.
"""
import secrets
from datetime import datetime
from typing import Dict, List, Optional, Any

from core.security import hash_password
from core.crypto import compute_attendance_hmac


def _now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


# ─────────────────────────────────────────────────────────────────────────────
# Pre-computed bcrypt hashes (cost=10) — generated at first import
# We call hash_password lazily to avoid blocking startup; store is initialized
# once and reused for the lifetime of the process.
# ─────────────────────────────────────────────────────────────────────────────

class DatabaseStore:
    def __init__(self):
        self.users: List[Dict] = []
        self.classes: List[Dict] = []
        self.enrollments: List[Dict] = []
        self.attendance_sessions: List[Dict] = []
        self.attendance_records: List[Dict] = []
        self.projects: List[Dict] = []
        self.project_memberships: List[Dict] = []
        self.tasks: List[Dict] = []
        self.messages: List[Dict] = []
        self.notifications: List[Dict] = []
        self.audit_logs: List[Dict] = []
        self.security_events: List[Dict] = []
        self.scanner_findings: List[Dict] = []
        self.sessions: Dict[str, Dict] = {}  # sessionId -> session obj
        self._seeded = False

    def seed(self, force: bool = False):
        if self._seeded and not force:
            return
        self._seeded = True

        now = _now_iso()

        admin_hash = hash_password("Admin@SecurePass2026!")
        faculty_hash = hash_password("Faculty@SecurePass2026!")
        student_hash = hash_password("Student@SecurePass2026!")

        self.users = [
            {
                "_id": "usr_admin_01",
                "email": "admin@campus.edu",
                "passwordHash": admin_hash,
                "fullName": "Dr. Sarah Connor",
                "role": "admin",
                "studentOrStaffId": "ADM-2024-001",
                "department": "Information Security & Systems Operations",
                "status": "active",
                "failedLoginAttempts": 0,
                "lockoutUntil": None,
                "lastLoginAt": None,
                "createdAt": "2026-08-15T09:00:00Z",
                "updatedAt": now,
            },
            {
                "_id": "usr_fac_01",
                "email": "dr.chen@campus.edu",
                "passwordHash": faculty_hash,
                "fullName": "Prof. Alan Chen",
                "role": "faculty",
                "studentOrStaffId": "FAC-2019-042",
                "department": "Computer Science & Security Engineering",
                "status": "active",
                "failedLoginAttempts": 0,
                "lockoutUntil": None,
                "lastLoginAt": None,
                "createdAt": "2026-08-15T09:00:00Z",
                "updatedAt": now,
            },
            {
                "_id": "usr_fac_02",
                "email": "prof.davis@campus.edu",
                "passwordHash": faculty_hash,
                "fullName": "Prof. Elena Davis",
                "role": "faculty",
                "studentOrStaffId": "FAC-2021-089",
                "department": "Software Architecture & Systems",
                "status": "active",
                "failedLoginAttempts": 0,
                "lockoutUntil": None,
                "lastLoginAt": None,
                "createdAt": "2026-08-15T09:00:00Z",
                "updatedAt": now,
            },
            {
                "_id": "usr_fac_03",
                "email": "marcus.vance@campus.edu",
                "passwordHash": faculty_hash,
                "fullName": "Dr. Marcus Vance",
                "role": "faculty",
                "studentOrStaffId": "FAC-2020-014",
                "department": "Applied Cryptography & Network Lab",
                "status": "active",
                "failedLoginAttempts": 0,
                "lockoutUntil": None,
                "lastLoginAt": None,
                "createdAt": "2026-08-15T09:00:00Z",
                "updatedAt": now,
            },
            {
                "_id": "usr_stu_01",
                "email": "maya.patel@student.campus.edu",
                "passwordHash": student_hash,
                "fullName": "Maya Patel",
                "role": "student",
                "studentOrStaffId": "STU-2023-881",
                "department": "Cybersecurity Engineering",
                "status": "active",
                "failedLoginAttempts": 0,
                "lockoutUntil": None,
                "lastLoginAt": None,
                "createdAt": "2026-08-20T10:00:00Z",
                "updatedAt": now,
            },
            {
                "_id": "usr_stu_02",
                "email": "lucas.kim@student.campus.edu",
                "passwordHash": student_hash,
                "fullName": "Lucas Kim",
                "role": "student",
                "studentOrStaffId": "STU-2023-904",
                "department": "Computer Science",
                "status": "active",
                "failedLoginAttempts": 0,
                "lockoutUntil": None,
                "lastLoginAt": None,
                "createdAt": "2026-08-20T10:00:00Z",
                "updatedAt": now,
            },
            {
                "_id": "usr_stu_03",
                "email": "sarah.jenkins@student.campus.edu",
                "passwordHash": student_hash,
                "fullName": "Sarah Jenkins",
                "role": "student",
                "studentOrStaffId": "STU-2024-112",
                "department": "Software Engineering",
                "status": "active",
                "failedLoginAttempts": 0,
                "lockoutUntil": None,
                "lastLoginAt": None,
                "createdAt": "2026-08-20T10:00:00Z",
                "updatedAt": now,
            },
            {
                "_id": "usr_stu_04",
                "email": "david.zhang@student.campus.edu",
                "passwordHash": student_hash,
                "fullName": "David Zhang",
                "role": "student",
                "studentOrStaffId": "STU-2023-744",
                "department": "Information Systems",
                "status": "active",
                "failedLoginAttempts": 0,
                "lockoutUntil": None,
                "lastLoginAt": None,
                "createdAt": "2026-08-20T10:00:00Z",
                "updatedAt": now,
            },
            {
                "_id": "usr_stu_05",
                "email": "amina.m@student.campus.edu",
                "passwordHash": student_hash,
                "fullName": "Amina Al-Mansoor",
                "role": "student",
                "studentOrStaffId": "STU-2024-601",
                "department": "Cyber Defense & Forensics",
                "status": "active",
                "failedLoginAttempts": 0,
                "lockoutUntil": None,
                "lastLoginAt": None,
                "createdAt": "2026-08-20T10:00:00Z",
                "updatedAt": now,
            },
            {
                "_id": "usr_stu_06",
                "email": "liam.oc@student.campus.edu",
                "passwordHash": student_hash,
                "fullName": "Liam O'Connor",
                "role": "student",
                "studentOrStaffId": "STU-2024-339",
                "department": "Computer Science",
                "status": "active",
                "failedLoginAttempts": 0,
                "lockoutUntil": None,
                "lastLoginAt": None,
                "createdAt": "2026-08-20T10:00:00Z",
                "updatedAt": now,
            },
        ]


        # ── 20 Mock Demo Students with Gmail and Active Accounts ──────────────
        gmail_pass_hash = hash_password("Student@Pass2026!")

        self.mock_gmail_students = [
            ("usr_stu_07", "Alex Johnson", "alex.johnson2026@gmail.com", "STU-2026-1001", "Computer Science"),
            ("usr_stu_08", "Sophia Martinez", "sophia.martinez2026@gmail.com", "STU-2026-1002", "Cybersecurity Engineering"),
            ("usr_stu_09", "Liam Patel", "liam.patel2026@gmail.com", "STU-2026-1003", "Information Systems"),
            ("usr_stu_10", "Emma Watson", "emma.watson2026@gmail.com", "STU-2026-1004", "Software Engineering"),
            ("usr_stu_11", "Noah Davis", "noah.davis2026@gmail.com", "STU-2026-1005", "Computer Science"),
            ("usr_stu_12", "Olivia Brown", "olivia.brown2026@gmail.com", "STU-2026-1006", "Cybersecurity Engineering"),
            ("usr_stu_13", "James Wilson", "james.wilson2026@gmail.com", "STU-2026-1007", "Computer Science"),
            ("usr_stu_14", "Isabella Garcia", "isabella.garcia2026@gmail.com", "STU-2026-1008", "Information Systems"),
            ("usr_stu_15", "Oliver Miller", "oliver.miller2026@gmail.com", "STU-2026-1009", "Software Engineering"),
            ("usr_stu_16", "Mia Rodriguez", "mia.rodriguez2026@gmail.com", "STU-2026-1010", "Computer Science"),
            ("usr_stu_17", "William Anderson", "william.anderson2026@gmail.com", "STU-2026-1011", "Cybersecurity Engineering"),
            ("usr_stu_18", "Charlotte Thomas", "charlotte.thomas2026@gmail.com", "STU-2026-1012", "Information Technology"),
            ("usr_stu_19", "Benjamin Taylor", "benjamin.taylor2026@gmail.com", "STU-2026-1013", "Computer Science"),
            ("usr_stu_20", "Amelia Moore", "amelia.moore2026@gmail.com", "STU-2026-1014", "Software Engineering"),
            ("usr_stu_21", "Lucas Jackson", "lucas.jackson2026@gmail.com", "STU-2026-1015", "Cybersecurity Engineering"),
            ("usr_stu_22", "Harper Martin", "harper.martin2026@gmail.com", "STU-2026-1016", "Computer Science"),
            ("usr_stu_23", "Henry Lee", "henry.lee2026@gmail.com", "STU-2026-1017", "Information Systems"),
            ("usr_stu_24", "Evelyn Perez", "evelyn.perez2026@gmail.com", "STU-2026-1018", "Computer Science"),
            ("usr_stu_25", "Alexander White", "alexander.white2026@gmail.com", "STU-2026-1019", "Cybersecurity Engineering"),
            ("usr_stu_26", "Abigail Harris", "abigail.harris2026@gmail.com", "STU-2026-1020", "Software Engineering"),
        ]

        for uid, name, email, stuid, dept in self.mock_gmail_students:
            self.users.append({
                "_id": uid,
                "email": email,
                "passwordHash": gmail_pass_hash,
                "fullName": name,
                "role": "student",
                "studentOrStaffId": stuid,
                "department": dept,
                "status": "active",
                "failedLoginAttempts": 0,
                "lockoutUntil": None,
                "lastLoginAt": None,
                "createdAt": "2026-09-01T08:00:00Z",
                "updatedAt": now,
            })

        self.classes = [
            {
                "_id": "cls_cs401",
                "code": "CS-401",
                "name": "Network Security & Penetration Testing",
                "description": "Advanced protocols, packet analysis, vulnerability scanning with OWASP ZAP, threat models, and secure software development lifecycle.",
                "semester": "Fall",
                "academicYear": "2026",
                "facultyId": "usr_fac_01",
                "credits": 4,
                "room": "Turing Hall 304",
                "schedule": "Mon/Wed 10:00 AM - 11:45 AM",
                "status": "active",
                "createdAt": "2026-08-22T08:00:00Z",
                "updatedAt": now,
            },
            {
                "_id": "cls_cs420",
                "code": "CS-420",
                "name": "Cloud Infrastructure & Defense",
                "description": "Container security, RBAC policies, infrastructure as code, API threat mitigation and zero-trust college architecture.",
                "semester": "Fall",
                "academicYear": "2026",
                "facultyId": "usr_fac_01",
                "credits": 3,
                "room": "Lovelace Science Ctr 112",
                "schedule": "Tue/Thu 02:00 PM - 03:30 PM",
                "status": "active",
                "createdAt": "2026-08-22T08:00:00Z",
                "updatedAt": now,
            },
            {
                "_id": "cls_se350",
                "code": "SE-350",
                "name": "Full-Stack Software Architecture",
                "description": "Scalable RESTful microservices, state management, testing automation with Vitest, and authenticated web services.",
                "semester": "Fall",
                "academicYear": "2026",
                "facultyId": "usr_fac_02",
                "credits": 4,
                "room": "Hopper Complex 201",
                "schedule": "Mon/Wed 01:00 PM - 02:45 PM",
                "status": "active",
                "createdAt": "2026-08-22T08:00:00Z",
                "updatedAt": now,
            },
            {
                "_id": "cls_cyb480",
                "code": "CYB-480",
                "name": "Applied Cryptography & PKI",
                "description": "Symmetric & asymmetric cryptography, HMAC canonical message signing, zero-knowledge proofs, and certificate validation.",
                "semester": "Fall",
                "academicYear": "2026",
                "facultyId": "usr_fac_03",
                "credits": 3,
                "room": "Shannon Cryptography Lab 105",
                "schedule": "Fri 09:00 AM - 12:00 PM",
                "status": "active",
                "createdAt": "2026-08-22T08:00:00Z",
                "updatedAt": now,
            },
            {
                "_id": "cls_cs302",
                "code": "CS-302",
                "name": "Operating Systems & Kernel Hardening",
                "description": "Memory protection, capability-based security, access control lists, and privileged isolation.",
                "semester": "Fall",
                "academicYear": "2026",
                "facultyId": "usr_fac_03",
                "credits": 4,
                "room": "Turing Hall 210",
                "schedule": "Tue/Thu 11:00 AM - 12:30 PM",
                "status": "active",
                "createdAt": "2026-08-22T08:00:00Z",
                "updatedAt": now,
            },
        ]

        self.enrollments = [
            # CS-401
            {"_id": "enr_01", "classId": "cls_cs401", "studentId": "usr_stu_01", "enrolledAt": "2026-08-25T10:00:00Z", "status": "enrolled", "createdAt": now, "updatedAt": now},
            {"_id": "enr_02", "classId": "cls_cs401", "studentId": "usr_stu_02", "enrolledAt": "2026-08-25T10:05:00Z", "status": "enrolled", "createdAt": now, "updatedAt": now},
            {"_id": "enr_03", "classId": "cls_cs401", "studentId": "usr_stu_03", "enrolledAt": "2026-08-25T10:10:00Z", "status": "enrolled", "createdAt": now, "updatedAt": now},
            {"_id": "enr_04", "classId": "cls_cs401", "studentId": "usr_stu_04", "enrolledAt": "2026-08-25T10:15:00Z", "status": "enrolled", "createdAt": now, "updatedAt": now},
            {"_id": "enr_05", "classId": "cls_cs401", "studentId": "usr_stu_05", "enrolledAt": "2026-08-25T10:20:00Z", "status": "enrolled", "createdAt": now, "updatedAt": now},
            # CS-420
            {"_id": "enr_06", "classId": "cls_cs420", "studentId": "usr_stu_01", "enrolledAt": "2026-08-25T11:00:00Z", "status": "enrolled", "createdAt": now, "updatedAt": now},
            {"_id": "enr_07", "classId": "cls_cs420", "studentId": "usr_stu_04", "enrolledAt": "2026-08-25T11:05:00Z", "status": "enrolled", "createdAt": now, "updatedAt": now},
            {"_id": "enr_08", "classId": "cls_cs420", "studentId": "usr_stu_05", "enrolledAt": "2026-08-25T11:10:00Z", "status": "enrolled", "createdAt": now, "updatedAt": now},
            {"_id": "enr_09", "classId": "cls_cs420", "studentId": "usr_stu_06", "enrolledAt": "2026-08-25T11:15:00Z", "status": "enrolled", "createdAt": now, "updatedAt": now},
            # SE-350
            {"_id": "enr_10", "classId": "cls_se350", "studentId": "usr_stu_02", "enrolledAt": "2026-08-25T12:00:00Z", "status": "enrolled", "createdAt": now, "updatedAt": now},
            {"_id": "enr_11", "classId": "cls_se350", "studentId": "usr_stu_03", "enrolledAt": "2026-08-25T12:05:00Z", "status": "enrolled", "createdAt": now, "updatedAt": now},
            {"_id": "enr_12", "classId": "cls_se350", "studentId": "usr_stu_06", "enrolledAt": "2026-08-25T12:10:00Z", "status": "enrolled", "createdAt": now, "updatedAt": now},
            # CYB-480
            {"_id": "enr_13", "classId": "cls_cyb480", "studentId": "usr_stu_01", "enrolledAt": "2026-08-25T13:00:00Z", "status": "enrolled", "createdAt": now, "updatedAt": now},
            {"_id": "enr_14", "classId": "cls_cyb480", "studentId": "usr_stu_02", "enrolledAt": "2026-08-25T13:05:00Z", "status": "enrolled", "createdAt": now, "updatedAt": now},
            {"_id": "enr_15", "classId": "cls_cyb480", "studentId": "usr_stu_05", "enrolledAt": "2026-08-25T13:10:00Z", "status": "enrolled", "createdAt": now, "updatedAt": now},
        ]

        # Enroll 20 Mock Gmail Students in flagship courses
        for idx, (uid, _, _, _, _) in enumerate(self.mock_gmail_students, 1):
            self.enrollments.append({
                "_id": f"enr_mock_{idx:02d}_cs401",
                "classId": "cls_cs401",
                "studentId": uid,
                "enrolledAt": "2026-08-25T10:00:00Z",
                "status": "enrolled",
                "createdAt": now,
                "updatedAt": now,
            })
            if idx <= 10:
                self.enrollments.append({
                    "_id": f"enr_mock_{idx:02d}_cs420",
                    "classId": "cls_cs420",
                    "studentId": uid,
                    "enrolledAt": "2026-08-25T11:00:00Z",
                    "status": "enrolled",
                    "createdAt": now,
                    "updatedAt": now,
                })

        d1 = "2026-10-15"
        d2 = "2026-10-20"
        d3 = "2026-10-22"
        d4 = "2026-10-27"
        d5 = "2026-10-29"

        # ── 10 Attendance Sessions across the month of October 2026 ──────────
        OCT_10_SESSIONS = [
            ("ses_cs401_01", "2026-10-02", "Lecture 01: Secure Architecture & Threat Modeling"),
            ("ses_cs401_02", "2026-10-05", "Lecture 02: Cryptographic Hash Functions & Integrity"),
            ("ses_cs401_03", "2026-10-07", "Lecture 03: Symmetric AES-GCM & Random Nonces"),
            ("ses_cs401_04", "2026-10-09", "Lecture 04: Public-Key Cryptography & RSA-OAEP"),
            ("ses_cs401_05", "2026-10-12", "Lecture 05: Session Management & Double-Submit CSRF"),
            ("ses_cs401_06", "2026-10-14", "Lecture 06: Parameterized Queries vs SQL Injection"),
            ("ses_cs401_07", "2026-10-16", "Lecture 07: Stored XSS & Content-Security-Policy"),
            ("ses_cs401_08", "2026-10-19", "Lecture 08: Broken Object Level Authorization (IDOR)"),
            ("ses_cs401_09", "2026-10-21", "Lecture 09: Rate Limiting & Brute Force Lockouts"),
            ("ses_cs401_10", "2026-10-23", "Lecture 10: HMAC-SHA256 Digital Verification Seals"),
        ]

        self.attendance_sessions = []
        for sid, sdate, stitle in OCT_10_SESSIONS:
            self.attendance_sessions.append({
                "_id": sid,
                "classId": "cls_cs401",
                "date": sdate,
                "title": stitle,
                "facultyId": "usr_fac_01",
                "status": "closed",
                "sessionCode": f"SEC401-{sdate.replace('-', '')[4:]}",
                "createdAt": f"{sdate}T09:50:00Z",
                "updatedAt": f"{sdate}T12:00:00Z",
            })

        # Add CS-420 sessions
        self.attendance_sessions.extend([
            {
                "_id": "ses_cs420_01", "classId": "cls_cs420", "date": "2026-10-20",
                "title": "Module 04: Zero-Trust Network Microsegmentation",
                "facultyId": "usr_fac_01", "status": "closed",
                "sessionCode": "CLD420-OCT20",
                "createdAt": "2026-10-20T13:50:00Z", "updatedAt": "2026-10-20T16:00:00Z",
            },
            {
                "_id": "ses_cs420_02", "classId": "cls_cs420", "date": "2026-10-29",
                "title": "Module 05: Kubernetes RBAC & Admission Controllers",
                "facultyId": "usr_fac_01", "status": "open",
                "sessionCode": "CLD420-OCT29",
                "createdAt": "2026-10-29T13:50:00Z", "updatedAt": now,
            },
        ])

        def _rec(rid, sid, cls_id, stu_id, status, marked_at, date, **kwargs):
            r = {
                "_id": rid, "sessionId": sid, "classId": cls_id,
                "studentId": stu_id, "status": status,
                "markedAt": marked_at, "markedBy": "usr_fac_01",
                "integrityHmac": compute_attendance_hmac(sid, stu_id, status, date),
                "isTampered": False,
                "createdAt": marked_at, "updatedAt": marked_at,
            }
            r.update(kwargs)
            return r

        self.attendance_records = []
        rec_counter = 1

        # All enrolled students in CS-401 (seed students + 20 mock students)
        all_cs401_student_ids = ["usr_stu_01", "usr_stu_02", "usr_stu_03", "usr_stu_04", "usr_stu_05"] + [
            m[0] for m in self.mock_gmail_students
        ]

        # 3 Deliberately Tampered Records for demonstration:
        # 1. usr_stu_07 (Alex Johnson) on Lecture 06 (2026-10-14)
        # 2. usr_stu_08 (Sophia Martinez) on Lecture 08 (2026-10-19)
        # 3. usr_stu_09 (Liam Patel) on Lecture 10 (2026-10-23)
        TAMPER_TARGETS = {
            ("ses_cs401_06", "usr_stu_07"): ("present", "absent"),  # displayed: present, signed: absent
            ("ses_cs401_08", "usr_stu_08"): ("present", "absent"),
            ("ses_cs401_10", "usr_stu_09"): ("present", "absent"),
        }

        for sid, sdate, _ in OCT_10_SESSIONS:
            for s_idx, stu_id in enumerate(all_cs401_student_ids):
                rid = f"rec_{sid}_{stu_id}"
                marked_at = f"{sdate}T10:0{(s_idx % 8) + 1}:00Z"

                # Check if this record is a designated tamper target
                if (sid, stu_id) in TAMPER_TARGETS:
                    tampered_status, original_signed_status = TAMPER_TARGETS[(sid, stu_id)]
                    # Compute HMAC for the legitimate 'absent' status, but store 'present' in DB
                    forged_record = {
                        "_id": rid,
                        "sessionId": sid,
                        "classId": "cls_cs401",
                        "studentId": stu_id,
                        "status": tampered_status,  # In DB: altered to "present"
                        "markedAt": marked_at,
                        "markedBy": "usr_fac_01",
                        # HMAC is computed on original status "absent" -> MISMATCH DETECTED ON VERIFICATION!
                        "integrityHmac": compute_attendance_hmac(sid, stu_id, original_signed_status, sdate),
                        "isTampered": True,  # Pre-flagged for initial demo clarity
                        "createdAt": marked_at,
                        "updatedAt": marked_at,
                    }
                    self.attendance_records.append(forged_record)
                else:
                    # Legitimate attendance status distribution
                    if (s_idx + rec_counter) % 11 == 0:
                        status = "absent"
                    elif (s_idx + rec_counter) % 7 == 0:
                        status = "late"
                    else:
                        status = "present"

                    self.attendance_records.append(
                        _rec(rid, sid, "cls_cs401", stu_id, status, marked_at, sdate)
                    )
                rec_counter += 1

        self.projects = [
            {
                "_id": "proj_01", "title": "Zero-Trust Campus Auth Proxy",
                "description": "Design and implementation of an authenticated gateway with session rotation, anomaly detection, and double-submit Anti-CSRF verification.",
                "classId": "cls_cs401", "ownerId": "usr_stu_01",
                "status": "active", "isPrivate": True,
                "createdAt": "2026-09-01T10:00:00Z", "updatedAt": now,
            },
            {
                "_id": "proj_02", "title": "OWASP ZAP Continuous Pipeline Scanner",
                "description": "Automated CI/CD integration for web application security scanning with normalized JSON alert parsing and vulnerability tracking.",
                "classId": "cls_cs401", "ownerId": "usr_stu_02",
                "status": "active", "isPrivate": True,
                "createdAt": "2026-09-05T11:00:00Z", "updatedAt": now,
            },
            {
                "_id": "proj_03", "title": "Cryptographic Attendance Token & Tamper Guard",
                "description": "Research into HMAC-SHA-256 and Ed25519 signatures for verifiable physical-presence attendance logging in collegiate environments.",
                "classId": "cls_cyb480", "ownerId": "usr_stu_06",
                "status": "active", "isPrivate": True,
                "createdAt": "2026-09-10T14:00:00Z", "updatedAt": now,
            },
        ]

        self.project_memberships = [
            {"_id": "pm_01", "projectId": "proj_01", "userId": "usr_stu_01", "role": "leader", "joinedAt": "2026-09-01T10:00:00Z", "createdAt": now, "updatedAt": now},
            {"_id": "pm_02", "projectId": "proj_01", "userId": "usr_stu_02", "role": "member", "joinedAt": "2026-09-01T10:05:00Z", "createdAt": now, "updatedAt": now},
            {"_id": "pm_03", "projectId": "proj_01", "userId": "usr_stu_05", "role": "member", "joinedAt": "2026-09-02T14:00:00Z", "createdAt": now, "updatedAt": now},
            {"_id": "pm_04", "projectId": "proj_02", "userId": "usr_stu_02", "role": "leader", "joinedAt": "2026-09-05T11:00:00Z", "createdAt": now, "updatedAt": now},
            {"_id": "pm_05", "projectId": "proj_02", "userId": "usr_stu_03", "role": "member", "joinedAt": "2026-09-05T11:10:00Z", "createdAt": now, "updatedAt": now},
            {"_id": "pm_06", "projectId": "proj_02", "userId": "usr_stu_04", "role": "member", "joinedAt": "2026-09-06T09:30:00Z", "createdAt": now, "updatedAt": now},
            {"_id": "pm_07", "projectId": "proj_03", "userId": "usr_stu_06", "role": "leader", "joinedAt": "2026-09-10T14:00:00Z", "createdAt": now, "updatedAt": now},
            {"_id": "pm_08", "projectId": "proj_03", "userId": "usr_stu_01", "role": "member", "joinedAt": "2026-09-11T16:00:00Z", "createdAt": now, "updatedAt": now},
            {"_id": "pm_09", "projectId": "proj_03", "userId": "usr_stu_04", "role": "member", "joinedAt": "2026-09-12T10:00:00Z", "createdAt": now, "updatedAt": now},
        ]

        self.tasks = [
            {
                "_id": "tsk_01", "projectId": "proj_01",
                "title": "Implement CSRF token double-submit & SameSite=Lax policy",
                "description": "Verify cookie attributes and ensure state-changing POST requests require matching X-CSRF-Token header.",
                "assignedTo": "usr_stu_01", "status": "completed", "priority": "high",
                "dueDate": "2026-11-01", "createdBy": "usr_stu_01",
                "createdAt": "2026-10-18T10:00:00Z", "updatedAt": now,
            },
            {
                "_id": "tsk_02", "projectId": "proj_01",
                "title": "Run baseline OWASP ZAP spider scan against API endpoints",
                "description": "Identify any missing security headers and improper CORS origins.",
                "assignedTo": "usr_stu_02", "status": "in_progress", "priority": "high",
                "dueDate": "2026-11-05", "createdBy": "usr_stu_01",
                "createdAt": "2026-10-20T11:00:00Z", "updatedAt": now,
            },
            {
                "_id": "tsk_03", "projectId": "proj_01",
                "title": "Configure sliding window rate-limiter for authentication routes",
                "description": "Enforce threshold of 15 attempts per minute with Retry-After and 429 response code.",
                "assignedTo": "usr_stu_05", "status": "completed", "priority": "medium",
                "dueDate": "2026-11-03", "createdBy": "usr_stu_01",
                "createdAt": "2026-10-21T09:00:00Z", "updatedAt": now,
            },
            {
                "_id": "tsk_04", "projectId": "proj_02",
                "title": "Parse ZAP JSON alert format into normalized SOC schema",
                "description": "Map risk code to severity and extract attack vectors for automated ingestion.",
                "assignedTo": "usr_stu_02", "status": "in_progress", "priority": "high",
                "dueDate": "2026-11-08", "createdBy": "usr_stu_02",
                "createdAt": "2026-10-22T14:00:00Z", "updatedAt": now,
            },
            {
                "_id": "tsk_05", "projectId": "proj_02",
                "title": "Conduct Burp Suite Repeater test on parameter tampering",
                "description": "Probe IDOR authorization bounds on /api/v1/projects/:id endpoints.",
                "assignedTo": "usr_stu_03", "status": "todo", "priority": "medium",
                "dueDate": "2026-11-12", "createdBy": "usr_stu_02",
                "createdAt": "2026-10-24T15:00:00Z", "updatedAt": now,
            },
            {
                "_id": "tsk_06", "projectId": "proj_03",
                "title": "Benchmarking HMAC-SHA-256 verification throughput",
                "description": "Measure execution time of constant-time buffer comparison over 10,000 records.",
                "assignedTo": "usr_stu_06", "status": "review", "priority": "low",
                "dueDate": "2026-11-15", "createdBy": "usr_stu_06",
                "createdAt": "2026-10-25T16:00:00Z", "updatedAt": now,
            },
        ]

        self.messages = [
            {
                "_id": "msg_01", "projectId": "proj_01",
                "senderId": "usr_stu_01", "senderName": "Maya Patel",
                "content": "Welcome to the Zero-Trust Auth project! Initial tasks for CSRF protection and ZAP scanning are assigned in the Tasks tab.",
                "createdAt": "2026-10-26T14:10:00Z",
                "readBy": ["usr_stu_01", "usr_stu_02", "usr_stu_05"],
            },
            {
                "_id": "msg_02", "projectId": "proj_01",
                "senderId": "usr_stu_02", "senderName": "Lucas Kim",
                "content": "Awesome. I tested the session rotation endpoint with Burp Repeater; session IDs correctly rotate upon successful login.",
                "createdAt": "2026-10-26T14:15:00Z",
                "readBy": ["usr_stu_01", "usr_stu_02", "usr_stu_05"],
            },
            {
                "_id": "msg_03", "projectId": "proj_01",
                "senderId": "usr_stu_05", "senderName": "Amina Al-Mansoor",
                "content": "I verified the rate limiter. After 15 rapid POST attempts, it returned HTTP 429 and fired an event directly to the SOC stream.",
                "createdAt": "2026-10-27T09:20:00Z",
                "readBy": ["usr_stu_01", "usr_stu_02", "usr_stu_05"],
            },
            {
                "_id": "msg_04", "projectId": "proj_02",
                "senderId": "usr_stu_02", "senderName": "Lucas Kim",
                "content": "ZAP continuous pipeline repository initialized. The JSON alert parser handles both single alert items and standard site report objects.",
                "createdAt": "2026-10-27T16:00:00Z",
                "readBy": ["usr_stu_02", "usr_stu_03"],
            },
        ]

        self.notifications = [
            {
                "_id": "notif_01", "userId": "usr_stu_01",
                "title": "Attendance Recorded",
                "message": "Marked PRESENT for CS-401 Lecture 11 with verified HMAC signature.",
                "type": "attendance", "link": "/attendance",
                "read": False, "createdAt": "2026-10-27T10:05:00Z",
            },
            {
                "_id": "notif_02", "userId": "usr_stu_01",
                "title": "New Message in Project",
                "message": 'Amina Al-Mansoor: "I verified the rate limiter..."',
                "type": "message", "link": "/projects",
                "read": False, "createdAt": "2026-10-27T09:21:00Z",
            },
            {
                "_id": "notif_03", "userId": "usr_stu_02",
                "title": "Project Task Assigned",
                "message": 'Maya Patel assigned you "Run baseline OWASP ZAP spider scan against API endpoints".',
                "type": "task", "link": "/projects",
                "read": True, "createdAt": "2026-10-20T11:00:00Z",
            },
            {
                "_id": "notif_04", "userId": "usr_admin_01",
                "title": "Critical Security Alert",
                "message": "Cryptographic HMAC mismatch detected on AttendanceRecord during audit sweep.",
                "type": "security", "link": "/security",
                "read": False, "createdAt": "2026-10-28T18:00:00Z",
            },
        ]

        self.audit_logs = [
            {
                "_id": "aud_01", "actorId": "usr_admin_01",
                "actorEmail": "admin@campus.edu", "actorRole": "admin",
                "action": "USER_ROLE_UPDATED", "resourceType": "User",
                "resourceId": "usr_fac_01",
                "details": {"previousRole": "faculty", "newRole": "faculty", "note": "Annual permissions review verified"},
                "outcome": "success", "ip": "127.0.0.1",
                "correlationId": "req_aud_001_seed", "createdAt": "2026-10-20T08:30:00Z",
            },
            {
                "_id": "aud_02", "actorId": "usr_fac_01",
                "actorEmail": "dr.chen@campus.edu", "actorRole": "faculty",
                "action": "CLASS_CREATED", "resourceType": "Class",
                "resourceId": "cls_cs401",
                "details": {"code": "CS-401", "name": "Network Security & Penetration Testing"},
                "outcome": "success", "ip": "127.0.0.1",
                "correlationId": "req_aud_002_seed", "createdAt": "2026-10-21T09:15:00Z",
            },
            {
                "_id": "aud_03", "actorId": "usr_fac_01",
                "actorEmail": "dr.chen@campus.edu", "actorRole": "faculty",
                "action": "ATTENDANCE_CORRECTED", "resourceType": "AttendanceRecord",
                "resourceId": "rec_cs401_03_03",
                "details": {"previousStatus": "absent", "newStatus": "late", "reason": "Authorized athletic team morning training pass"},
                "outcome": "success", "ip": "127.0.0.1",
                "correlationId": "req_aud_003_seed", "createdAt": "2026-10-27T10:25:00Z",
            },
            {
                "_id": "aud_04", "actorId": "usr_admin_01",
                "actorEmail": "admin@campus.edu", "actorRole": "admin",
                "action": "SECURITY_INCIDENT_STATUS_MODIFIED", "resourceType": "SecurityEvent",
                "resourceId": "sec_ev_02",
                "details": {"previousStatus": "unreviewed", "newStatus": "resolved", "notes": "IDOR attempt confirmed blocked by router authorization filter."},
                "outcome": "success", "ip": "127.0.0.1",
                "correlationId": "req_aud_004_seed", "createdAt": "2026-10-28T14:10:00Z",
            },
        ]

        self.security_events = [
            {
                "_id": "sec_ev_01", "eventCategory": "auth", "severity": "medium",
                "eventType": "LOGIN_FAILURE_THRESHOLD_APPROACHING",
                "message": "Multiple consecutive failed authentication attempts detected for staff account.",
                "affectedResource": "/api/v1/auth/login", "outcome": "blocked",
                "correlationId": "cor_auth_fail_901", "ip": "198.51.100.44",
                "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
                "isSimulatedDemo": False, "investigationStatus": "investigating",
                "notes": "IP rate limited for 15 minutes following 4 incorrect password attempts.",
                "createdAt": "2026-10-28T11:20:00Z",
            },
            {
                "_id": "sec_ev_02", "eventCategory": "authorization", "severity": "high",
                "eventType": "IDOR_ACCESS_DENIED",
                "message": "Student attempted unauthorized access to unassigned class roster.",
                "affectedResource": "/api/v1/classes/cls_se350/roster", "outcome": "blocked",
                "correlationId": "cor_idor_blk_112", "ip": "203.0.113.88",
                "actorId": "usr_stu_01", "actorEmail": "maya.patel@student.campus.edu",
                "isSimulatedDemo": False, "investigationStatus": "resolved",
                "notes": "Enforced strict RBAC and enrollment verification. Access rejected with 403 Forbidden.",
                "createdAt": "2026-10-28T13:45:00Z",
            },
            {
                "_id": "sec_ev_03", "eventCategory": "injection_attempt", "severity": "critical",
                "eventType": "NOSQL_QUERY_OPERATOR_STRIPPED",
                "message": "Request payload contained query operator keys ($ne, $where). Sanitizer recursively stripped keys.",
                "affectedResource": "/api/v1/users", "outcome": "blocked",
                "correlationId": "cor_inj_san_409", "ip": "192.0.2.71",
                "userAgent": "python-requests/2.31.0",
                "isSimulatedDemo": False, "investigationStatus": "investigating",
                "notes": "Automated script probe attempted NoSQL authentication bypass. Neutralized by input sanitizer.",
                "createdAt": "2026-10-28T16:15:00Z",
            },
            {
                "_id": "sec_ev_04", "eventCategory": "integrity_failure", "severity": "critical",
                "eventType": "ATTENDANCE_TAMPER_DETECTED",
                "message": "HMAC signature mismatch detected during automated attendance record integrity sweep.",
                "affectedResource": "AttendanceRecord:rec_cs401_02_03", "outcome": "alerted",
                "correlationId": "cor_tamper_demo_003", "ip": "127.0.0.1",
                "isSimulatedDemo": True, "investigationStatus": "unreviewed",
                "notes": "Simulated database manipulation: status was altered without corresponding HMAC secret.",
                "createdAt": "2026-10-28T18:00:00Z",
            },
            {
                "_id": "sec_ev_05", "eventCategory": "rate_limit", "severity": "medium",
                "eventType": "RATE_LIMIT_EXCEEDED",
                "message": "Client exceeded maximum permitted rate (15 req / 60s) on /api/v1/auth/login.",
                "affectedResource": "/api/v1/auth/login", "outcome": "blocked",
                "correlationId": "cor_rate_lim_332", "ip": "198.51.100.99",
                "isSimulatedDemo": False, "investigationStatus": "resolved",
                "notes": "Burp Suite Intruder credential stuffing attack throttled with HTTP 429.",
                "createdAt": "2026-10-29T02:10:00Z",
            },
            {
                "_id": "sec_ev_06", "eventCategory": "authorization", "severity": "medium",
                "eventType": "CSRF_VALIDATION_FAILED",
                "message": "State-changing POST rejected: X-CSRF-Token header did not match session token.",
                "affectedResource": "/api/v1/classes/cls_cs401/enroll", "outcome": "blocked",
                "correlationId": "cor_csrf_blk_098", "ip": "203.0.113.14",
                "isSimulatedDemo": True, "investigationStatus": "unreviewed",
                "notes": "Simulated cross-site request forgery attempt blocked by double-submit cookie guard.",
                "createdAt": "2026-10-29T08:30:00Z",
            },
        ]

        self.scanner_findings = [
            {
                "_id": "scan_01", "source": "OWASP_ZAP", "scannerAlertId": "10038",
                "alertName": "Content Security Policy (CSP) Header Not Set",
                "severity": "medium", "confidence": "High",
                "url": "http://localhost:3000/api/v1/auth/login", "method": "GET",
                "attackVector": "Passive Header Analysis",
                "description": "Content Security Policy (CSP) is an added layer of security that helps to detect and mitigate certain types of attacks.",
                "solution": "Ensure that a valid Content-Security-Policy header is sent with strict directives.",
                "reference": "https://owasp.org/www-community/attacks/xss/",
                "rawEvidence": "CSP header was missing in initial baseline response.",
                "remediationStatus": "verified_fixed",
                "importedBy": "admin@campus.edu", "importedAt": "2026-10-27T14:00:00Z",
                "createdAt": "2026-10-27T14:00:00Z",
            },
            {
                "_id": "scan_02", "source": "BURP_SUITE", "scannerAlertId": "4194304",
                "alertName": "Cookie Without SameSite Attribute",
                "severity": "low", "confidence": "Certain",
                "url": "http://localhost:3000/api/v1/auth/login", "method": "POST",
                "param": "campus_session", "attackVector": "Cookie Attribute Inspection",
                "description": "The cookie did not have a SameSite attribute specified in early staging build.",
                "solution": "Set SameSite=Lax or SameSite=Strict on all authentication and session cookies.",
                "reference": "https://portswigger.net/web-security/csrf",
                "rawEvidence": "Set-Cookie: campus_session=...; HttpOnly",
                "remediationStatus": "verified_fixed",
                "importedBy": "admin@campus.edu", "importedAt": "2026-10-27T15:00:00Z",
                "createdAt": "2026-10-27T15:00:00Z",
            },
            {
                "_id": "scan_03", "source": "OWASP_ZAP", "scannerAlertId": "40018",
                "alertName": "Anti-CSRF Tokens Check",
                "severity": "high", "confidence": "Medium",
                "url": "http://localhost:3000/api/v1/classes", "method": "POST",
                "attackVector": "Cross-Site Request Forgery State Change",
                "description": "State-changing POST request accepted without verifiable Anti-CSRF token verification.",
                "solution": "Implement double-submit cookie or synchronizer token pattern via X-CSRF-Token header.",
                "reference": "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html",
                "remediationStatus": "verified_fixed",
                "importedBy": "admin@campus.edu", "importedAt": "2026-10-28T09:00:00Z",
                "createdAt": "2026-10-28T09:00:00Z",
            },
            {
                "_id": "scan_04", "source": "BURP_SUITE", "scannerAlertId": "5243100",
                "alertName": "Cross-Domain Script Inclusion (XSSI)",
                "severity": "medium", "confidence": "Firm",
                "url": "http://localhost:3000/api/v1/messages", "method": "GET",
                "attackVector": "JSON Response Array Analysis",
                "description": "Endpoint returns JSON responses containing sensitive project messages that could be leaked via cross-origin script tags.",
                "solution": "Ensure all JSON endpoints respond with Content-Type: application/json and X-Content-Type-Options: nosniff headers.",
                "reference": "https://portswigger.net/web-security/cors",
                "remediationStatus": "verified_fixed",
                "importedBy": "admin@campus.edu", "importedAt": "2026-10-28T10:30:00Z",
                "createdAt": "2026-10-28T10:30:00Z",
            },
            {
                "_id": "scan_05", "source": "OWASP_ZAP", "scannerAlertId": "10020",
                "alertName": "Strict-Transport-Security Header Not Enforced",
                "severity": "low", "confidence": "High",
                "url": "http://localhost:3000", "method": "GET",
                "attackVector": "Passive Response Header Inspection",
                "description": "HTTP Strict Transport Security (HSTS) informs browsers that the site should only be accessed using HTTPS.",
                "solution": "Enforce HSTS with max-age=31536000 and includeSubDomains in production SSL gateway.",
                "reference": "https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html",
                "remediationStatus": "in_remediation",
                "importedBy": "admin@campus.edu", "importedAt": "2026-10-29T08:00:00Z",
                "createdAt": "2026-10-29T08:00:00Z",
            },
        ]

        self.sessions = {}
        print("[SecureCampus] Demo dataset seeded: 10 users, 5 classes, 15 enrollments, 5 sessions, 19 HMAC records.")

    # ── Helpers ──────────────────────────────────────────────────────────────

    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        return next((u for u in self.users if u["_id"] == user_id), None)

    def get_user_by_email(self, email: str) -> Optional[Dict]:
        return next((u for u in self.users if u["email"].lower() == email.lower()), None)

    def safe_user(self, user: Dict) -> Dict:
        """Return user dict without passwordHash."""
        return {k: v for k, v in user.items() if k != "passwordHash"}

    def add_audit_log(self, entry: Dict):
        self.audit_logs.insert(0, entry)

    def add_security_event(self, entry: Dict):
        self.security_events.insert(0, entry)

    def add_notification(self, notif: Dict):
        self.notifications.insert(0, notif)


# Singleton
db = DatabaseStore()
db.seed()
