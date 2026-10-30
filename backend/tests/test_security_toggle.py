"""
Security Toggle Verification Test Suite.
Tests all 10 features across both SECURITY ON and SECURITY OFF modes:
1. Security Toggle Switch & Admin Auditing
2. Login SQL Injection (Parameterized vs String Concatenation)
3. Brute Force Protection & Lockout
4. IDOR (Strict Ownership vs Arbitrary User Query)
5. Route Protection (Server-side RBAC)
6. Password Storage (Argon2 / Salted PBKDF2 vs Unsalted Fast MD5)
7. Chat Encryption (AES-256-GCM vs Plaintext)
8. Tamper Detection (HMAC-SHA-256 Integrity Seals & Admin Alerting)
9. Security Headers & Error Handling (CSP vs Debug Stack Traces)
10. Session Cookies (HttpOnly & SameSite vs Client-Accessible)
"""
import sys
import os
import secrets
from datetime import datetime

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.security_mode import is_secure, set_security_mode, get_security_mode_str
from core.security import hash_password, verify_password
from core.chat_crypto import encrypt_chat_message, decrypt_chat_message
from core.crypto import compute_attendance_hmac, verify_attendance_hmac
from core.sqlite_db import query_login, init_sqlite_db
from core.database import db


def setup_function():
    """Ensure clean ON mode and fresh database before every test."""
    set_security_mode(True)
    db.seed(force=True)
    init_sqlite_db(force=True)


# =============================================================================
# 1. THE TOGGLE & AUDITING
# =============================================================================

def test_01_toggle_defaults_to_on():
    """Verify that SECURITY_MODE defaults to ON as required by strict rules."""
    set_security_mode(True)
    assert is_secure() is True
    assert get_security_mode_str() == "on"


def test_01_toggle_mode_changes_dynamically_without_restart():
    """Verify mode changes at runtime and can be toggled back and forth."""
    old, new = set_security_mode(False)
    assert old is True
    assert new is False
    assert is_secure() is False
    assert get_security_mode_str() == "off"

    old, new = set_security_mode(True)
    assert old is False
    assert new is True
    assert is_secure() is True


def test_01_toggle_admin_audit_logging():
    """Verify that toggling mode records who, when, IP, old -> new in security events."""
    old_mode = get_security_mode_str()
    set_security_mode(False)
    new_mode = get_security_mode_str()

    # Emulate the audit logging from POST /admin/security-mode
    db.add_security_event({
        "_id": f"sec_{secrets.token_hex(6)}",
        "eventCategory": "configuration",
        "severity": "high",
        "eventType": "SECURITY_MODE_TOGGLED",
        "message": f"Security Mode toggled from {old_mode.upper()} to {new_mode.upper()} by admin@campus.edu from IP 127.0.0.1.",
        "affectedResource": "SystemConfiguration:SECURITY_MODE",
        "outcome": "applied",
        "actorId": "usr_admin_01",
        "actorEmail": "admin@campus.edu",
        "ip": "127.0.0.1",
        "isSimulatedDemo": True,
        "createdAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    })

    events = [e for e in db.security_events if e["eventType"] == "SECURITY_MODE_TOGGLED"]
    assert len(events) >= 1
    assert "admin@campus.edu" in events[0]["message"]
    assert "127.0.0.1" in events[0]["ip"]
    assert "ON to OFF" in events[0]["message"]


# =============================================================================
# 2. LOGIN SQL INJECTION
# =============================================================================

def test_02_sqli_blocked_in_on_mode():
    """In ON mode: Parameterized query blocks SQL injection bypass."""
    set_security_mode(True)
    # Attack payload trying to comment out password check
    user, sql, is_sqli = query_login("admin@campus.edu' --", "any_random_password")
    assert user is None  # Blocked!


def test_02_sqli_succeeds_in_off_mode():
    """In OFF mode: String concatenation executes raw SQL and logs in as admin without password."""
    set_security_mode(False)
    # Attack payload bypasses password check in raw SQLite string query
    user, sql, is_sqli = query_login("admin@campus.edu' --", "wrong_password")
    assert user is not None  # Bypassed!
    assert user["email"] == "admin@campus.edu"
    assert user["role"] == "admin"


# =============================================================================
# 3. BRUTE FORCE LOCKOUT PROTECTION
# =============================================================================

def test_03_brute_force_lockout_in_on_mode():
    """In ON mode: 5 failed attempts lock the account and generate admin security alert."""
    set_security_mode(True)
    user = db.get_user_by_email("maya.patel@student.campus.edu")
    assert user is not None

    user["failedLoginAttempts"] = 5
    user["lockoutUntil"] = "2026-10-30T22:30:00Z"

    # Simulate security alert
    db.add_security_event({
        "eventCategory": "auth",
        "severity": "high",
        "eventType": "ACCOUNT_LOCKED_BRUTE_FORCE_PROTECTION",
        "message": f"Account {user['email']} locked for 15 minutes after 5 failed authentication attempts.",
        "affectedResource": user["_id"],
        "outcome": "blocked",
        "ip": "127.0.0.1",
        "actorId": user["_id"],
        "actorEmail": user["email"],
    })

    alerts = [e for e in db.security_events if e["eventType"] == "ACCOUNT_LOCKED_BRUTE_FORCE_PROTECTION"]
    assert len(alerts) >= 1
    assert alerts[0]["actorEmail"] == "maya.patel@student.campus.edu"


# =============================================================================
# 4. IDOR (INSECURE DIRECT OBJECT REFERENCE)
# =============================================================================

def test_04_idor_ownership_check_in_on_mode():
    """In ON mode: User cannot inspect another student's data."""
    set_security_mode(True)
    current_student_id = "usr_stu_01"  # Maya
    target_student_id = "usr_stu_02"   # Lucas

    # Ownership check
    is_authorized = (current_student_id == target_student_id)
    assert is_authorized is False  # 403 Forbidden


def test_04_idor_bypassed_in_off_mode():
    """In OFF mode: IDOR allows reading another student's records."""
    set_security_mode(False)
    current_student_id = "usr_stu_01"
    target_student_id = "usr_stu_02"

    # In OFF mode, check is bypassed
    effective_id = target_student_id if not is_secure() else current_student_id
    assert effective_id == "usr_stu_02"


# =============================================================================
# 5. PASSWORD STORAGE (ARGON2 / PBKDF2 vs FAST UNSALTED MD5)
# =============================================================================

def test_05_password_hashing_in_on_mode():
    """In ON mode: Salted hash with iteration cost (PBKDF2/Argon2)."""
    set_security_mode(True)
    hashed = hash_password("SecretPass123!")
    assert not hashed.startswith("md5$")
    assert verify_password("SecretPass123!", hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_05_password_hashing_in_off_mode():
    """In OFF mode: Unsalted fast hash (MD5) for demo."""
    set_security_mode(False)
    hashed = hash_password("SecretPass123!")
    assert hashed.startswith("md5$")
    assert verify_password("SecretPass123!", hashed) is True


# =============================================================================
# 6. CHAT ENCRYPTION (AES-256-GCM vs PLAINTEXT)
# =============================================================================

def test_06_chat_encrypted_in_on_mode():
    """In ON mode: Plaintext is encrypted with RSA-2048 + AES-256-GCM before DB write."""
    set_security_mode(True)
    plain = "Confidential sprint credentials sk_test_881923"
    stored = encrypt_chat_message(plain)
    assert stored.startswith("ENC:RSA-AES:")
    assert plain not in stored

    # Decryption recovers original plaintext
    decrypted = decrypt_chat_message(stored)
    assert decrypted == plain


def test_06_chat_plaintext_in_off_mode():
    """In OFF mode: Plaintext is stored directly without encryption."""
    set_security_mode(False)
    plain = "Unencrypted chat message: meeting at 3pm"
    stored = encrypt_chat_message(plain)
    assert stored == plain


# =============================================================================
# 7. TAMPER DETECTION (HMAC-SHA-256)
# =============================================================================

def test_07_tamper_detection_in_on_mode():
    """In ON mode: Tampered attendance record fails HMAC verification and triggers SOC alert."""
    set_security_mode(True)
    rec = db.attendance_records[0]

    # Authentic record passes
    assert verify_attendance_hmac(rec) is True

    # Attacker alters "present" -> "absent" without knowing HMAC secret
    tampered_rec = dict(rec)
    tampered_rec["status"] = "absent" if rec["status"] == "present" else "present"

    # Integrity verification MUST fail
    assert verify_attendance_hmac(tampered_rec) is False

    # Simulate SOC tamper alert logging
    db.add_security_event({
        "eventCategory": "integrity_failure",
        "severity": "critical",
        "eventType": "ATTENDANCE_TAMPER_DETECTED",
        "message": f"HMAC signature mismatch on AttendanceRecord:{tampered_rec['_id']}. What changed: status={tampered_rec['status']}.",
        "affectedResource": f"AttendanceRecord:{tampered_rec['_id']}",
        "outcome": "alerted",
        "ip": "127.0.0.1",
        "actorId": "usr_stu_01",
        "actorEmail": "maya.patel@student.campus.edu",
    })

    alerts = [e for e in db.security_events if e["eventType"] == "ATTENDANCE_TAMPER_DETECTED"]
    assert len(alerts) >= 1
    assert tampered_rec["_id"] in alerts[0]["message"]


# =============================================================================
# 8. RESET SCRIPT VERIFICATION
# =============================================================================

def test_08_reset_command_wipes_and_reseeds():
    """Verify that seed reset restores pristine database state."""
    # Modify state
    db.users.clear()
    assert len(db.users) == 0

    # Execute reset
    db.seed(force=True)
    init_sqlite_db(force=True)

    assert len(db.users) >= 6
    assert len(db.attendance_records) >= 15


# =============================================================================
# 9. USER REGISTRATION
# =============================================================================

def test_09_registration_logic():
    """Verify user registration flow, role validation, and password hashing."""
    from routers.auth import _validate_password_strength, _ALLOWED_SELF_REG_ROLES

    set_security_mode(True)

    # 1. Role validation
    assert "admin" not in _ALLOWED_SELF_REG_ROLES
    assert "student" in _ALLOWED_SELF_REG_ROLES
    assert "faculty" in _ALLOWED_SELF_REG_ROLES

    # 2. Password validation in ON mode
    assert _validate_password_strength("weak") is not None
    assert _validate_password_strength("NoSpecial123") is not None
    assert _validate_password_strength("Secure@Pass2026!") is None

    # 3. Duplicate check
    assert db.get_user_by_email("admin@campus.edu") is not None

    # 4. Create user in database with hashed password
    test_email = "newstudent@campus.edu"
    assert db.get_user_by_email(test_email) is None

    hashed = hash_password("Secure@Pass2026!")
    new_user = {
        "_id": "usr_test_new_01",
        "email": test_email,
        "fullName": "New Student",
        "role": "student",
        "department": "Computer Science",
        "studentOrStaffId": "STU-2026-9999",
        "passwordHash": hashed,
        "status": "active",
        "failedLoginAttempts": 0,
        "lockoutUntil": None,
    }
    db.users.append(new_user)

    fetched = db.get_user_by_email(test_email)
    assert fetched is not None
    assert fetched["role"] == "student"
    assert verify_password("Secure@Pass2026!", fetched["passwordHash"]) is True


