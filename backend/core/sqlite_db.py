"""
SQLite database engine for SecureCampus authentication, student directory, and SQL Injection demo.
Supports both:
- Insecure string-concatenated SQL queries (OFF mode)
- Parameterized safe SQL queries (ON mode)
"""
import sqlite3
import os
from typing import Optional, Dict, Any, List, Tuple
from core.security_mode import is_secure
from core.security import verify_password, hash_password
from core.crypto import compute_attendance_hmac

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "campus_auth.sqlite")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_sqlite_db(force: bool = False):
    """Initializes and seeds the SQLite database with full student data and credentials."""
    if os.path.exists(DB_PATH) and not force:
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Clear if force
    if force:
        cursor.execute("DROP TABLE IF EXISTS users_auth")
        cursor.execute("DROP TABLE IF EXISTS students_directory")
        cursor.execute("DROP TABLE IF EXISTS student_enrollments")
        cursor.execute("DROP TABLE IF EXISTS student_attendance")
        cursor.execute("DROP TABLE IF EXISTS student_grades")

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users_auth (
            _id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            passwordHash TEXT NOT NULL,
            fullName TEXT NOT NULL,
            role TEXT NOT NULL,
            studentOrStaffId TEXT NOT NULL,
            department TEXT NOT NULL,
            status TEXT NOT NULL,
            failedLoginAttempts INTEGER DEFAULT 0,
            lockoutUntil TEXT
        );

        CREATE TABLE IF NOT EXISTS students_directory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            studentId TEXT UNIQUE NOT NULL,
            fullName TEXT NOT NULL,
            email TEXT NOT NULL,
            department TEXT NOT NULL,
            gpa REAL NOT NULL,
            academicYear TEXT NOT NULL DEFAULT '2026',
            advisor TEXT NOT NULL DEFAULT 'Prof. Alan Chen',
            creditsCompleted INTEGER NOT NULL DEFAULT 48,
            status TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS student_enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            studentId TEXT NOT NULL,
            studentName TEXT NOT NULL,
            classCode TEXT NOT NULL,
            className TEXT NOT NULL,
            semester TEXT NOT NULL DEFAULT 'Fall 2026',
            credits INTEGER NOT NULL DEFAULT 4,
            status TEXT NOT NULL DEFAULT 'enrolled'
        );

        CREATE TABLE IF NOT EXISTS student_attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recordId TEXT UNIQUE NOT NULL,
            sessionId TEXT NOT NULL,
            sessionDate TEXT NOT NULL,
            studentId TEXT NOT NULL,
            studentName TEXT NOT NULL,
            status TEXT NOT NULL,
            integrityHmac TEXT NOT NULL,
            isTampered BOOLEAN DEFAULT 0,
            markedBy TEXT DEFAULT 'usr_fac_01'
        );

        CREATE TABLE IF NOT EXISTS student_grades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            studentId TEXT NOT NULL,
            studentName TEXT NOT NULL,
            classCode TEXT NOT NULL,
            midtermScore REAL NOT NULL,
            finalScore REAL NOT NULL,
            totalMarks REAL NOT NULL,
            letterGrade TEXT NOT NULL
        );
    """)

    # Clear if force
    if force:
        cursor.execute("DELETE FROM users_auth")
        cursor.execute("DELETE FROM students_directory")
        cursor.execute("DELETE FROM student_enrollments")
        cursor.execute("DELETE FROM student_attendance")
        cursor.execute("DELETE FROM student_grades")

    # Passwords & Hashes
    admin_pass = "Admin@SecurePass2026!"
    faculty_pass = "Faculty@SecurePass2026!"
    student_pass = "Student@SecurePass2026!"
    mock_pass = "Student@Pass2026!"

    admin_hash = hash_password(admin_pass)
    faculty_hash = hash_password(faculty_pass)
    student_hash = hash_password(student_pass)
    mock_hash = hash_password(mock_pass)

    # 1. Staff & Faculty Users
    staff_users = [
        ("usr_admin_01", "admin@campus.edu", admin_pass, admin_hash, "Dr. Sarah Connor", "admin", "ADM-2024-001", "Information Security", "active"),
        ("usr_fac_01", "dr.chen@campus.edu", faculty_pass, faculty_hash, "Prof. Alan Chen", "faculty", "FAC-2019-042", "Computer Science", "active"),
        ("usr_fac_02", "prof.davis@campus.edu", faculty_pass, faculty_hash, "Prof. Elena Davis", "faculty", "FAC-2021-089", "Software Architecture", "active"),
    ]

    # 2. Original 6 Seed Students
    seed_students = [
        ("usr_stu_01", "STU-2023-881", "Maya Patel", "maya.patel@student.campus.edu", student_pass, student_hash, "Cybersecurity Engineering", 3.92, 72, "Prof. Alan Chen"),
        ("usr_stu_02", "STU-2023-904", "Lucas Kim", "lucas.kim@student.campus.edu", student_pass, student_hash, "Computer Science", 3.78, 68, "Prof. Alan Chen"),
        ("usr_stu_03", "STU-2024-112", "Sarah Jenkins", "sarah.jenkins@student.campus.edu", student_pass, student_hash, "Software Engineering", 3.85, 44, "Prof. Elena Davis"),
        ("usr_stu_04", "STU-2023-744", "David Zhang", "david.zhang@student.campus.edu", student_pass, student_hash, "Information Systems", 3.65, 56, "Prof. Alan Chen"),
        ("usr_stu_05", "STU-2024-601", "Amina Al-Mansoor", "amina.m@student.campus.edu", student_pass, student_hash, "Cyber Defense & Forensics", 3.96, 48, "Prof. Alan Chen"),
        ("usr_stu_06", "STU-2024-339", "Liam O'Connor", "liam.oc@student.campus.edu", student_pass, student_hash, "Computer Science", 3.42, 40, "Prof. Elena Davis"),
    ]

    # 3. 20 Mock Gmail Demo Students
    mock_students = [
        ("usr_stu_07", "STU-2026-1001", "Alex Johnson", "alex.johnson2026@gmail.com", mock_pass, mock_hash, "Computer Science", 3.82, 32, "Prof. Alan Chen"),
        ("usr_stu_08", "STU-2026-1002", "Sophia Martinez", "sophia.martinez2026@gmail.com", mock_pass, mock_hash, "Cybersecurity Engineering", 3.91, 32, "Prof. Alan Chen"),
        ("usr_stu_09", "STU-2026-1003", "Liam Patel", "liam.patel2026@gmail.com", mock_pass, mock_hash, "Information Systems", 3.65, 32, "Prof. Alan Chen"),
        ("usr_stu_10", "STU-2026-1004", "Emma Watson", "emma.watson2026@gmail.com", mock_pass, mock_hash, "Software Engineering", 3.77, 32, "Prof. Elena Davis"),
        ("usr_stu_11", "STU-2026-1005", "Noah Davis", "noah.davis2026@gmail.com", mock_pass, mock_hash, "Computer Science", 3.88, 32, "Prof. Alan Chen"),
        ("usr_stu_12", "STU-2026-1006", "Olivia Brown", "olivia.brown2026@gmail.com", mock_pass, mock_hash, "Cybersecurity Engineering", 3.95, 32, "Prof. Alan Chen"),
        ("usr_stu_13", "STU-2026-1007", "James Wilson", "james.wilson2026@gmail.com", mock_pass, mock_hash, "Computer Science", 3.55, 32, "Prof. Alan Chen"),
        ("usr_stu_14", "STU-2026-1008", "Isabella Garcia", "isabella.garcia2026@gmail.com", mock_pass, mock_hash, "Information Systems", 3.70, 32, "Prof. Alan Chen"),
        ("usr_stu_15", "STU-2026-1009", "Oliver Miller", "oliver.miller2026@gmail.com", mock_pass, mock_hash, "Software Engineering", 3.84, 32, "Prof. Elena Davis"),
        ("usr_stu_16", "STU-2026-1010", "Mia Rodriguez", "mia.rodriguez2026@gmail.com", mock_pass, mock_hash, "Computer Science", 3.92, 32, "Prof. Alan Chen"),
        ("usr_stu_17", "STU-2026-1011", "William Anderson", "william.anderson2026@gmail.com", mock_pass, mock_hash, "Cybersecurity Engineering", 3.69, 32, "Prof. Alan Chen"),
        ("usr_stu_18", "STU-2026-1012", "Charlotte Thomas", "charlotte.thomas2026@gmail.com", mock_pass, mock_hash, "Information Technology", 3.74, 32, "Prof. Elena Davis"),
        ("usr_stu_19", "STU-2026-1013", "Benjamin Taylor", "benjamin.taylor2026@gmail.com", mock_pass, mock_hash, "Computer Science", 3.80, 32, "Prof. Alan Chen"),
        ("usr_stu_20", "STU-2026-1014", "Amelia Moore", "amelia.moore2026@gmail.com", mock_pass, mock_hash, "Software Engineering", 3.87, 32, "Prof. Elena Davis"),
        ("usr_stu_21", "STU-2026-1015", "Lucas Jackson", "lucas.jackson2026@gmail.com", mock_pass, mock_hash, "Cybersecurity Engineering", 3.63, 32, "Prof. Alan Chen"),
        ("usr_stu_22", "STU-2026-1016", "Harper Martin", "harper.martin2026@gmail.com", mock_pass, mock_hash, "Computer Science", 3.90, 32, "Prof. Alan Chen"),
        ("usr_stu_23", "STU-2026-1017", "Henry Lee", "henry.lee2026@gmail.com", mock_pass, mock_hash, "Information Systems", 3.58, 32, "Prof. Alan Chen"),
        ("usr_stu_24", "STU-2026-1018", "Evelyn Perez", "evelyn.perez2026@gmail.com", mock_pass, mock_hash, "Computer Science", 3.83, 32, "Prof. Alan Chen"),
        ("usr_stu_25", "STU-2026-1019", "Alexander White", "alexander.white2026@gmail.com", mock_pass, mock_hash, "Cybersecurity Engineering", 3.79, 32, "Prof. Alan Chen"),
        ("usr_stu_26", "STU-2026-1020", "Abigail Harris", "abigail.harris2026@gmail.com", mock_pass, mock_hash, "Software Engineering", 3.96, 32, "Prof. Elena Davis"),
    ]

    all_students = seed_students + mock_students

    # Populate users_auth
    auth_rows = []
    for uid, email, pwd, p_hash, name, role, sid, dept, status in staff_users:
        auth_rows.append((uid, email, pwd, p_hash, name, role, sid, dept, status))

    for uid, sid, name, email, pwd, p_hash, dept, _, _, _ in all_students:
        auth_rows.append((uid, email, pwd, p_hash, name, "student", sid, dept, "active"))

    cursor.executemany("""
        INSERT OR REPLACE INTO users_auth (_id, email, password, passwordHash, fullName, role, studentOrStaffId, department, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, auth_rows)

    # Populate students_directory
    directory_rows = []
    for _, sid, name, email, _, _, dept, gpa, credits, advisor in all_students:
        directory_rows.append((sid, name, email, dept, gpa, "2026", advisor, credits, "active"))

    cursor.executemany("""
        INSERT OR REPLACE INTO students_directory (studentId, fullName, email, department, gpa, academicYear, advisor, creditsCompleted, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, directory_rows)

    # Populate student_enrollments & student_grades
    enrollment_rows = []
    grade_rows = []
    for idx, (_, sid, name, _, _, _, dept, gpa, _, _) in enumerate(all_students, 1):
        # All students enrolled in CS-401
        enrollment_rows.append((sid, name, "CS-401", "Network Security & Penetration Testing", "Fall 2026", 4, "enrolled"))
        
        # Calculate scores according to GPA
        midterm = round(min(98.0, max(68.0, gpa * 23.5 + 4.5)), 1)
        final = round(min(99.0, max(70.0, gpa * 24.0 + 3.0)), 1)
        total = round((midterm * 0.4) + (final * 0.6), 1)
        letter = "A" if total >= 90 else "B" if total >= 80 else "C" if total >= 70 else "D"
        grade_rows.append((sid, name, "CS-401", midterm, final, total, letter))

        # First 12 students also in CS-420 (Cloud Infrastructure & Defense)
        if idx <= 12:
            enrollment_rows.append((sid, name, "CS-420", "Cloud Infrastructure & Defense", "Fall 2026", 3, "enrolled"))
            m2 = round(midterm - 1.5, 1)
            f2 = round(final + 0.5, 1)
            t2 = round((m2 * 0.4) + (f2 * 0.6), 1)
            l2 = "A" if t2 >= 90 else "B" if t2 >= 80 else "C"
            grade_rows.append((sid, name, "CS-420", m2, f2, t2, l2))

    cursor.executemany("""
        INSERT INTO student_enrollments (studentId, studentName, classCode, className, semester, credits, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, enrollment_rows)

    cursor.executemany("""
        INSERT INTO student_grades (studentId, studentName, classCode, midtermScore, finalScore, totalMarks, letterGrade)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, grade_rows)

    # Populate student_attendance with 10 October lectures & 3 tampered targets
    OCTOBER_SESSIONS = [
        ("ses_cs401_01", "2026-10-02"),
        ("ses_cs401_02", "2026-10-05"),
        ("ses_cs401_03", "2026-10-07"),
        ("ses_cs401_04", "2026-10-09"),
        ("ses_cs401_05", "2026-10-12"),
        ("ses_cs401_06", "2026-10-14"),
        ("ses_cs401_07", "2026-10-16"),
        ("ses_cs401_08", "2026-10-19"),
        ("ses_cs401_09", "2026-10-21"),
        ("ses_cs401_10", "2026-10-23"),
    ]

    TAMPER_TARGETS = {
        ("ses_cs401_06", "usr_stu_07"): ("present", "absent"),
        ("ses_cs401_08", "usr_stu_08"): ("present", "absent"),
        ("ses_cs401_10", "usr_stu_09"): ("present", "absent"),
    }

    attendance_rows = []
    counter = 1
    for sid, sdate in OCTOBER_SESSIONS:
        for s_idx, (uid, stu_id, name, _, _, _, _, _, _, _) in enumerate(all_students):
            rec_id = f"rec_{sid}_{uid}"
            if (sid, uid) in TAMPER_TARGETS:
                tampered_status, orig_status = TAMPER_TARGETS[(sid, uid)]
                hmac_seal = compute_attendance_hmac(sid, uid, orig_status, sdate)
                attendance_rows.append((rec_id, sid, sdate, stu_id, name, tampered_status, hmac_seal, 1, "usr_fac_01"))
            else:
                if (s_idx + counter) % 11 == 0:
                    status = "absent"
                elif (s_idx + counter) % 7 == 0:
                    status = "late"
                else:
                    status = "present"
                hmac_seal = compute_attendance_hmac(sid, uid, status, sdate)
                attendance_rows.append((rec_id, sid, sdate, stu_id, name, status, hmac_seal, 0, "usr_fac_01"))
            counter += 1

    cursor.executemany("""
        INSERT OR REPLACE INTO student_attendance (recordId, sessionId, sessionDate, studentId, studentName, status, integrityHmac, isTampered, markedBy)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, attendance_rows)

    conn.commit()
    conn.close()


def add_user_to_sqlite(user: Dict[str, Any], raw_password: str):
    """Dynamically adds newly registered user/student into SQLite database."""
    conn = get_connection()
    cursor = conn.cursor()

    uid = user["_id"]
    email = user["email"]
    name = user["fullName"]
    role = user["role"]
    dept = user["department"]
    sid = user.get("studentOrStaffId", f"STU-{uid[:8]}")
    p_hash = user["passwordHash"]
    status = user.get("status", "active")

    cursor.execute("""
        INSERT OR REPLACE INTO users_auth (_id, email, password, passwordHash, fullName, role, studentOrStaffId, department, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (uid, email, raw_password, p_hash, name, role, sid, dept, status))

    if role == "student":
        cursor.execute("""
            INSERT OR REPLACE INTO students_directory (studentId, fullName, email, department, gpa, academicYear, advisor, creditsCompleted, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (sid, name, email, dept, 3.80, "2026", "Prof. Alan Chen", 32, status))

        # Auto-enroll in flagship course CS-401
        cursor.execute("""
            INSERT INTO student_enrollments (studentId, studentName, classCode, className, semester, credits, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (sid, name, "CS-401", "Network Security & Penetration Testing", "Fall 2026", 4, "enrolled"))

    conn.commit()
    conn.close()


def query_login(email: str, password: str) -> Tuple[Optional[Dict[str, Any]], str, bool]:
    """
    Executes login authentication query.
    Returns: (user_dict or None, executed_sql, is_sqli_detected)
    """
    conn = get_connection()
    cursor = conn.cursor()

    if not is_secure():
        # DEMO-ONLY INSECURE PATH: String concatenation allows SQL Injection
        # Example payload: admin@campus.edu' -- or ' OR '1'='1
        sql = f"SELECT * FROM users_auth WHERE email = '{email}' AND password = '{password}'"
        try:
            cursor.execute(sql)
            row = cursor.fetchone()
            user = dict(row) if row else None
            conn.close()
            return user, sql, True
        except Exception as e:
            conn.close()
            # In insecure mode, surface error
            raise e
    else:
        # SECURE PATH: Parameterized query to safely fetch user by email
        sql = "SELECT * FROM users_auth WHERE email = ?"
        cursor.execute(sql, (email.strip().lower(),))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None, sql, False

        user = dict(row)
        # Verify password using secure salted Argon2 / bcrypt hash
        if verify_password(password, user["passwordHash"]):
            return user, sql, False
        return None, sql, False


# Initialize at import
init_sqlite_db()
