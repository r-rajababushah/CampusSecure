"""
Chat hybrid encryption module for SecureCampus.
Supports:
- ON Mode: Hybrid RSA-2048 + AES-256-GCM authenticated encryption (RSA protecting an AES key).
  Each message generates a fresh ephemeral 256-bit AES key.
  The message is encrypted with AES-256-GCM.
  The ephemeral AES key is encrypted with RSA-OAEP (SHA-256).
- OFF Mode: Plain text stored directly in database (Insecure Demo Mode).
"""
import os
import base64
import json
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes
from core.security_mode import is_secure
from core.config import settings

# Master RSA-2048 Keypair
_RSA_PRIVATE_KEY = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)
_RSA_PUBLIC_KEY = _RSA_PRIVATE_KEY.public_key()


def transport_public_key_pem() -> str:
    """Public key used by browsers to wrap their short-lived transport AES key."""
    from cryptography.hazmat.primitives import serialization

    return _RSA_PUBLIC_KEY.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("ascii")


def unwrap_transport_key(wrapped_key_b64: str) -> bytes:
    wrapped_key = base64.b64decode(wrapped_key_b64, validate=True)
    return _RSA_PRIVATE_KEY.decrypt(
        wrapped_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=b"securecampus_transport_key_v1",
        ),
    )


def encrypt_transport_payload(plaintext: str, transport_key: bytes) -> str:
    nonce = os.urandom(12)
    ciphertext = AESGCM(transport_key).encrypt(
        nonce,
        plaintext.encode("utf-8"),
        associated_data=b"securecampus_transport_v1",
    )
    envelope = {
        "scheme": "AES-256-GCM",
        "nonce": base64.b64encode(nonce).decode("ascii"),
        "ciphertext": base64.b64encode(ciphertext).decode("ascii"),
    }
    encoded = base64.b64encode(json.dumps(envelope, separators=(",", ":")).encode("utf-8")).decode("ascii")
    return "TRANSPORT:AES-GCM:" + encoded


def decrypt_transport_payload(envelope: str, transport_key: bytes) -> str:
    if not envelope.startswith("TRANSPORT:AES-GCM:"):
        raise ValueError("Message is missing its encrypted transport envelope.")
    encoded = envelope.removeprefix("TRANSPORT:AES-GCM:")
    payload = json.loads(base64.b64decode(encoded, validate=True).decode("utf-8"))
    plaintext = AESGCM(transport_key).decrypt(
        base64.b64decode(payload["nonce"], validate=True),
        base64.b64decode(payload["ciphertext"], validate=True),
        associated_data=b"securecampus_transport_v1",
    )
    return plaintext.decode("utf-8")

# Legacy AES fallback key
_CHAT_KEY = (settings.secret_key.encode("utf-8").ljust(32, b"0"))[:32]


def encrypt_chat_message(plaintext: str) -> str:
    """
    Encrypts a chat message if Security Mode is ON.
    Stores plaintext directly if Security Mode is OFF.
    In ON mode: Ephemeral AES-256 key encrypted with RSA-2048 OAEP.
    """
    if not is_secure():
        # DEMO-ONLY INSECURE PATH: Plain text stored in database
        return plaintext

    # SECURE PATH: Hybrid RSA-2048 + AES-256-GCM
    # 1. Generate one-time random 256-bit AES key
    ephemeral_aes_key = os.urandom(32)
    nonce = os.urandom(12)  # 96-bit unique nonce

    # 2. Encrypt message body with AES-256-GCM
    aesgcm = AESGCM(ephemeral_aes_key)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), associated_data=b"securecampus_chat_v2")

    # 3. Encrypt ephemeral AES key with RSA-2048 public key (OAEP with SHA-256)
    encrypted_key = _RSA_PUBLIC_KEY.encrypt(
        ephemeral_aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        )
    )

    payload = {
        "scheme": "RSA-2048-OAEP+AES-256-GCM",
        "enc_key": base64.b64encode(encrypted_key).decode("utf-8"),
        "nonce": base64.b64encode(nonce).decode("utf-8"),
        "ciphertext": base64.b64encode(ciphertext).decode("utf-8"),
    }
    return "ENC:RSA-AES:" + base64.b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")


def decrypt_chat_message(stored_content: str) -> str:
    """
    Decrypts a chat message if it was encrypted.
    Supports RSA-AES hybrid envelopes and legacy AES envelopes.
    If it's plaintext (e.g. from OFF mode), returns directly.
    """
    if not stored_content.startswith("ENC:"):
        # Plain text message
        return stored_content

    # Hybrid RSA-2048 + AES-256-GCM
    if stored_content.startswith("ENC:RSA-AES:"):
        try:
            raw_b64 = stored_content.replace("ENC:RSA-AES:", "")
            payload = json.loads(base64.b64decode(raw_b64.encode("utf-8")).decode("utf-8"))
            enc_key = base64.b64decode(payload["enc_key"])
            nonce = base64.b64decode(payload["nonce"])
            ciphertext = base64.b64decode(payload["ciphertext"])

            # 1. Recover AES key via RSA private key
            ephemeral_aes_key = _RSA_PRIVATE_KEY.decrypt(
                enc_key,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None,
                )
            )

            # 2. Decrypt message body with recovered AES key
            aesgcm = AESGCM(ephemeral_aes_key)
            decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, associated_data=b"securecampus_chat_v2")
            return decrypted_bytes.decode("utf-8")
        except Exception as e:
            return f"[Decryption Failed: {str(e)}]"

    # Legacy AES-256-GCM fallback
    if stored_content.startswith("ENC:AES-GCM:"):
        try:
            raw_b64 = stored_content.replace("ENC:AES-GCM:", "")
            payload = json.loads(base64.b64decode(raw_b64.encode("utf-8")).decode("utf-8"))
            nonce = base64.b64decode(payload["nonce"])
            ciphertext = base64.b64decode(payload["ciphertext"])

            aesgcm = AESGCM(_CHAT_KEY)
            decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, associated_data=b"chat_v1")
            return decrypted_bytes.decode("utf-8")
        except Exception as e:
            return f"[Decryption Failed: {str(e)}]"

    return stored_content
