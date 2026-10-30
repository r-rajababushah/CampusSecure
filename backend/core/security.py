"""
Security utilities: Password hashing, token generation, and verification.
Supports dual-mode behavior governed by is_secure():
- ON: Argon2 / salted PBKDF2-HMAC-SHA256 (100k rounds) / bcrypt.
- OFF: Unsalted fast hash (MD5) for demo attack scenarios.
"""
import secrets
import hmac
import hashlib
from typing import Optional
from core.security_mode import is_secure

# Try importing passlib / argon2; if not present, use standard library PBKDF2
_USE_PASSLIB = False
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
    _USE_PASSLIB = True
except Exception:
    pass


def _pbkdf2_hash(password: str, salt: Optional[bytes] = None) -> str:
    """Standard library PBKDF2-HMAC-SHA256 with 100,000 rounds and 16-byte salt."""
    if salt is None:
        salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"pbkdf2:sha256:100000${salt.hex()}${key.hex()}"


def _verify_pbkdf2(password: str, stored_hash: str) -> bool:
    try:
        parts = stored_hash.split("$")
        if len(parts) != 3:
            return False
        salt = bytes.fromhex(parts[1])
        expected_hex = parts[2]
        calc = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(calc.hex(), expected_hex)
    except Exception:
        return False


def hash_password(password: str) -> str:
    """
    Hashes password based on current security mode:
    - SECURE (ON): Argon2 / PBKDF2 (salted, 100k iterations)
    - INSECURE (OFF): Unsalted fast MD5 hash
    """
    if is_secure():
        # SECURE PATH: Computationally hard salted hash
        if _USE_PASSLIB:
            try:
                return pwd_context.hash(password)
            except Exception:
                pass
        return _pbkdf2_hash(password)
    else:
        # DEMO-ONLY INSECURE PATH: Unsalted fast MD5 hash
        return "md5$" + hashlib.md5(password.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """
    Verifies a plain password against the stored hash.
    Accepts Argon2, bcrypt, PBKDF2, and demo fast MD5 hashes.
    """
    if stored_hash.startswith("md5$"):
        calc = "md5$" + hashlib.md5(plain_password.encode("utf-8")).hexdigest()
        return hmac.compare_digest(calc, stored_hash)

    if stored_hash.startswith("pbkdf2:"):
        return _verify_pbkdf2(plain_password, stored_hash)

    if _USE_PASSLIB:
        try:
            return pwd_context.verify(plain_password, stored_hash)
        except Exception:
            pass

    # Direct MD5 fallback for raw hashes
    if stored_hash == hashlib.md5(plain_password.encode("utf-8")).hexdigest():
        return True

    return False


def generate_secure_token(length: int = 32) -> str:
    return secrets.token_hex(length)


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(24)
