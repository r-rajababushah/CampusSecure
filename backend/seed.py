"""
Seed and Reset Script for SecureCampus Demo Database.
Usage:
    python seed.py          # Seeds initial data
    python seed.py --reset  # Wipes local database and re-seeds cleanly
"""
import sys
import os

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.database import db
from core.sqlite_db import init_sqlite_db
from core.security_mode import is_secure, set_security_mode


def run_seed(reset: bool = False):
    print("=" * 60)
    print(f"[SecureCampus] {'RESETTING & ' if reset else ''}SEEDING DEMO DATABASE")
    print(f"Current Security Mode: {'ON (Secure)' if is_secure() else 'OFF (Insecure Demo)'}")
    print("=" * 60)

    # 1. Reset/seed in-memory application collections
    db.seed(force=reset)

    # 2. Reset/seed SQLite database
    init_sqlite_db(force=reset)

    print("\nDatabase populated successfully:")
    print(f" - Users:               {len(db.users)} (Admin, Faculty, Students)")
    print(f" - Classes:             {len(db.classes)}")
    print(f" - Enrollments:         {len(db.enrollments)}")
    print(f" - Attendance Sessions: {len(db.attendance_sessions)}")
    print(f" - Attendance Records:  {len(db.attendance_records)} (with cryptographic HMAC seals)")
    print(f" - Projects:            {len(db.projects)}")
    print(f" - Tasks:               {len(db.tasks)}")
    print(f" - Chat Messages:       {len(db.messages)}")
    print(f" - Audit Logs:          {len(db.audit_logs)}")
    print(f" - Security Events:     {len(db.security_events)}")
    print("\nReady for hackathon attack/defense demonstration!")
    print("=" * 60)


if __name__ == "__main__":
    reset_flag = "--reset" in sys.argv
    run_seed(reset=reset_flag)

