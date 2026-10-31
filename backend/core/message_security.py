"""Server-side message authenticity and tamper seals for the local demo."""
import base64
import hashlib
import hmac
import json

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

from core.config import settings

_SIGNING_PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_SIGNING_PUBLIC_KEY = _SIGNING_PRIVATE_KEY.public_key()
_SIGNING_KEY_FINGERPRINT = hashlib.sha256(
    _SIGNING_PUBLIC_KEY.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
).hexdigest()[:24]


def _canonical_bytes(message: dict) -> bytes:
    canonical = {
        "id": message.get("_id", ""),
        "projectId": message.get("projectId", ""),
        "senderId": message.get("senderId", ""),
        "senderName": message.get("senderName", ""),
        "createdAt": message.get("createdAt", ""),
        "ciphertext": message.get("content", ""),
    }
    return json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode("utf-8")


def seal_message(message: dict) -> dict:
    """Attach HMAC-SHA256 and RSA-PSS seals after the ciphertext is created."""
    canonical = _canonical_bytes(message)
    integrity_hmac = hmac.new(
        settings.secret_key.encode("utf-8"),
        canonical,
        hashlib.sha256,
    ).hexdigest()
    signature = _SIGNING_PRIVATE_KEY.sign(
        canonical,
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
        hashes.SHA256(),
    )
    return {
        "integrityHmac": integrity_hmac,
        "digitalSignature": base64.b64encode(signature).decode("ascii"),
        "signatureAlgorithm": "RSA-PSS-SHA256",
        "signatureKeyFingerprint": _SIGNING_KEY_FINGERPRINT,
    }


def verify_message_seals(message: dict) -> dict:
    canonical = _canonical_bytes(message)
    expected_hmac = hmac.new(settings.secret_key.encode("utf-8"), canonical, hashlib.sha256).hexdigest()
    supplied_hmac = str(message.get("integrityHmac", ""))
    hmac_valid = bool(supplied_hmac) and hmac.compare_digest(expected_hmac, supplied_hmac)

    signature_valid = False
    try:
        signature = base64.b64decode(message.get("digitalSignature", ""), validate=True)
        _SIGNING_PUBLIC_KEY.verify(
            signature,
            canonical,
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
            hashes.SHA256(),
        )
        signature_valid = True
    except (ValueError, InvalidSignature):
        pass

    return {
        "integrityVerified": hmac_valid and signature_valid,
        "hmacVerified": hmac_valid,
        "signatureVerified": signature_valid,
    }
