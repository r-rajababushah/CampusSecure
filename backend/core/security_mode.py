"""
Security Mode Manager for SecureCampus Hackathon Demo.
Provides a central server-side flag (SECURITY_MODE) that is read at request time
to switch between SECURE (ON) and INSECURE (OFF) behavior.

STRICT SAFETY RULES:
- Default is SECURITY ON ("on"). OFF must be an explicit runtime choice.
- In OFF mode, the server only operates on localhost (127.0.0.1) for local hackathon testing.
"""
import os
from typing import Tuple

# Initial value comes from environment variable SECURITY_MODE (default "on")
_initial_mode = os.environ.get("SECURITY_MODE", "on").lower().strip()
_SECURITY_MODE: bool = (_initial_mode != "off")


def is_secure() -> bool:
    """
    Returns True if Security Mode is ON (defenses active),
    or False if Security Mode is OFF (vulnerabilities exposed for demo).
    Read dynamically at request time so changes take effect without restart.
    """
    return _SECURITY_MODE


def get_security_mode_str() -> str:
    """Returns 'on' or 'off'."""
    return "on" if _SECURITY_MODE else "off"


def set_security_mode(enabled: bool) -> Tuple[bool, bool]:
    """
    Sets the security mode.
    Returns (old_mode, new_mode) as booleans.
    """
    global _SECURITY_MODE
    old = _SECURITY_MODE
    _SECURITY_MODE = bool(enabled)
    return old, _SECURITY_MODE

