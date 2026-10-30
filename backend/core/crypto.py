import hmac
import hashlib
from typing import Union, Dict, Any
from core.config import settings


def _get_hmac_key() -> bytes:
    return settings.attendance_hmac_secret.encode("utf-8")


def compute_attendance_hmac(session_id: str, student_id: str, status: str, date: str) -> str:
    """Compute HMAC-SHA256 over canonical attendance string."""
    canonical = f"session:{session_id}|student:{student_id}|status:{status}|date:{date}"
    sig = hmac.new(_get_hmac_key(), canonical.encode("utf-8"), hashlib.sha256)
    return sig.hexdigest()


def verify_attendance_hmac(*args, **kwargs) -> bool:
    """
    Constant-time comparison of expected vs stored HMAC.
    Flexible signature: accepts either a record dict or individual fields.
    """
    if len(args) == 1 and isinstance(args[0], dict):
        rec = args[0]
        session_id = rec.get("sessionId") or rec.get("session_id", "")
        student_id = rec.get("studentId") or rec.get("student_id", "")
        status = rec.get("status", "")
        date = rec.get("date") or (rec.get("createdAt", "")[:10])
        integrity_hmac = rec.get("integrityHmac") or rec.get("integrity_hmac", "")
    elif len(args) == 5:
        session_id, student_id, status, date, integrity_hmac = args
    else:
        session_id = kwargs.get("session_id") or kwargs.get("sessionId", "")
        student_id = kwargs.get("student_id") or kwargs.get("studentId", "")
        status = kwargs.get("status", "")
        date = kwargs.get("date", "")
        integrity_hmac = kwargs.get("integrity_hmac") or kwargs.get("integrityHmac", "")

    expected = compute_attendance_hmac(session_id, student_id, status, date)
    return hmac.compare_digest(integrity_hmac, expected)
