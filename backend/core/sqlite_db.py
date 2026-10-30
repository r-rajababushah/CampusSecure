"""
SQLite database engine for SecureCampus authentication and SQL Injection demo.
Supports both:
- Insecure string-concatenated SQL queries (OFF mode)
- Parameterized safe SQL queries (ON mode)
"""
import sqlite3
import os
from typing import Optional, Dict, Any, List, Tuple
from core.security_mode import is_secure
from core.security import verify_password, hash_password

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "campus_auth.sqlite")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_sqlite_db(force: bool = False):
    """Initializes and seeds the SQLite database with users and credentials."""
    if os.path.exists(DB_PATH) and not force:
        return

    conn = get_connection()
    cursor = conn.cursor()

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
            status TEXT NOT NULL
        );
    """)

    # Clear if force
    if force:
        cursor.execute("DELETE FROM users_auth")
        cursor.execute("DELETE FROM students_directory")

    # Seed users
    admin_hash = hash_password("Admin@SecurePass2026!")
    faculty_hash = hash_password("Faculty@SecurePass2026!")
    student_hash = hash_password("Student@SecurePass2026!")
    mock_pass = "Student@Pass2026!"
    mock_hash = hash_password(mock_pass)

    users = [
        ("usr_admin_01", "admin@campus.edu", "Admin@SecurePass2026!", admin_hash, "Dr. Sarah Connor", "admin", "ADM-2024-001", "Information Security", "active"),
        ("usr_fac_01", "dr.chen@campus.edu", "Faculty@SecurePass2026!", faculty_hash, "Prof. Alan Chen", "faculty", "FAC-2019-042", "Computer Science", "active"),
        ("usr_fac_02", "prof.davis@campus.edu", "Faculty@SecurePass2026!", faculty_hash, "Prof. Elena Davis", "faculty", "FAC-2021-089", "Software Architecture", "active"),
        ("usr_stu_01", "maya.patel@student.campus.edu", "Student@SecurePass2026!", student_hash, "Maya Patel", "student", "STU-2023-881", "Cybersecurity", "active"),
        ("usr_stu_02", "lucas.kim@student.campus.edu", "Student@SecurePass2026!", student_hash, "Lucas Kim", "student", "STU-2023-904", "Computer Science", "active"),
        ("usr_stu_03", "sarah.jenkins@student.campus.edu", "Student@SecurePass2026!", student_hash, "Sarah Jenkins", "student", "STU-2024-112", "Software Engineering", "active"),
        ("usr_stu_04", "david.zhang@student.campus.edu", "Student@SecurePass2026!", student_hash, "David Zhang", "student", "STU-2023-744", "Information Systems", "active"),
        ("usr_stu_05", "amina.m@student.campus.edu", "Student@SecurePass2026!", student_hash, "Amina Al-Mansoor", "student", "STU-2024-601", "Cyber Defense", "active"),
        ("usr_stu_06", "liam.oc@student.campus.edu", "Student@SecurePass2026!", student_hash, "Liam O'Connor", "student", "STU-2024-339", "Computer Science", "active"),
    ]

    mock_students_data = [
        ("usr_stu_07", "Alex Johnson", "alex.johnson2026@gmail.com", "STU-2026-1001", "Computer Science", 3.82),
        ("usr_stu_08", "Sophia Martinez", "sophia.martinez2026@gmail.com", "STU-2026-1002", "Cybersecurity Engineering", 3.91),
        ("usr_stu_09", "Liam Patel", "liam.patel2026@gmail.com", "STU-2026-1003", "Information Systems", 3.65),
        ("usr_stu_10", "Emma Watson", "emma.watson2026@gmail.com", "STU-2026-1004", "Software Engineering", 3.77),
        ("usr_stu_11", "Noah Davis", "noah.davis2026@gmail.com", "STU-2026-1005", "Computer Science", 3.88),
        ("usr_stu_12", "Olivia Brown", "olivia.brown2026@gmail.com", "STU-2026-1006", "Cybersecurity Engineering", 3.95),
        ("usr_stu_13", "James Wilson", "james.wilson2026@gmail.com", "STU-2026-1007", "Computer Science", 3.55),
        ("usr_stu_14", "Isabella Garcia", "isabella.garcia2026@gmail.com", "STU-2026-1008", "Information Systems", 3.70),
        ("usr_stu_15", "Oliver Miller", "oliver.miller2026@gmail.com", "STU-2026-1009", "Software Engineering", 3.84),
        ("usr_stu_16", "Mia Rodriguez", "mia.rodriguez2026@gmail.com", "STU-2026-1010", "Computer Science", 3.92),
        ("usr_stu_17", "William Anderson", "william.anderson2026@gmail.com", "STU-2026-1011", "Cybersecurity Engineering", 3.69),
        ("usr_stu_18", "Charlotte Thomas", "charlotte.thomas2026@gmail.com", "STU-2026-1012", "Information Technology", 3.74),
        ("usr_stu_19", "Benjamin Taylor", "benjamin.taylor2026@gmail.com", "STU-2026-1013", "Computer Science", 3.80),
        ("usr_stu_20", "Amelia Moore", "amelia.moore2026@gmail.com", "STU-2026-1014", "Software Engineering", 3.87),
        ("usr_stu_21", "Lucas Jackson", "lucas.jackson2026@gmail.com", "STU-2026-1015", "Cybersecurity Engineering", 3.63),
        ("usr_stu_22", "Harper Martin", "harper.martin2026@gmail.com", "STU-2026-1016", "Computer Science", 3.90),
        ("usr_stu_23", "Henry Lee", "henry.lee2026@gmail.com", "STU-2026-1017", "Information Systems", 3.58),
        ("usr_stu_24", "Evelyn Perez", "evelyn.perez2026@gmail.com", "STU-2026-1018", "Computer Science", 3.83),
        ("usr_stu_25", "Alexander White", "alexander.white2026@gmail.com", "STU-2026-1019", "Cybersecurity Engineering", 3.79),
        ("usr_stu_26", "Abigail Harris", "abigail.harris2026@gmail.com", "STU-2026-1020", "Software Engineering", 3.96),
    ]

    for uid, name, email, stuid, dept, _ in mock_students_data:
        users.append((uid, email, mock_pass, mock_hash, name, "student", stuid, dept, "active"))

    cursor.executemany("""
        INSERT OR REPLACE INTO users_auth (_id, email, password, passwordHash, fullName, role, studentOrStaffId, department, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, users)

    # Seed students directory
    students = [
        ("STU-2023-881", "Maya Patel", "maya.patel@student.campus.edu", "Cybersecurity Engineering", 3.92, "active"),
        ("STU-2023-904", "Lucas Kim", "lucas.kim@student.campus.edu", "Computer Science", 3.78, "active"),
        ("STU-2024-112", "Sarah Jenkins", "sarah.jenkins@student.campus.edu", "Software Engineering", 3.85, "active"),
        ("STU-2023-744", "David Zhang", "david.zhang@student.campus.edu", "Information Systems", 3.65, "active"),
        ("STU-2024-601", "Amina Al-Mansoor", "amina.m@student.campus.edu", "Cyber Defense", 3.96, "active"),
        ("STU-2024-339", "Liam O'Connor", "liam.oc@student.campus.edu", "Computer Science", 3.42, "probation"),
    ]

    for _, name, email, stuid, dept, gpa in mock_students_data:
        students.append((stuid, name, email, dept, gpa, "active"))

    cursor.executemany("""
        INSERT OR REPLACE INTO students_directory (studentId, fullName, email, department, gpa, status)
        VALUES (?, ?, ?, ?, ?, ?)
    """, students)

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
