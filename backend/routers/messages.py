"""Authenticated project messaging with encrypted transport and sealed storage."""
import html
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request

from core.chat_crypto import (
    decrypt_chat_message, decrypt_transport_payload, encrypt_chat_message,
    encrypt_transport_payload, transport_public_key_pem, unwrap_transport_key,
)
from core.database import db
from core.message_security import seal_message, verify_message_seals
from core.security_mode import is_secure
from models.schemas import SendMessageRequest
from routers.deps import extract_session_id, get_current_user

router = APIRouter()


def _require_member(project_id: str, user: dict) -> None:
    if is_secure() and user["role"] != "admin" and not any(
        item["projectId"] == project_id and item["userId"] == user["_id"]
        for item in db.project_memberships
    ):
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You are not a member of this project."})


def _transport_key(request: Request) -> bytes:
    session = db.sessions.get(extract_session_id(request) or "")
    encoded = session.get("messageTransportKey") if session else None
    if not encoded:
        raise HTTPException(status_code=409, detail={"code": "SECURE_CHANNEL_REQUIRED", "message": "Initialize the secure message channel first."})
    import base64
    try:
        return base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise HTTPException(status_code=409, detail={"code": "SECURE_CHANNEL_INVALID", "message": "Secure message channel expired. Reopen the chat."}) from exc


@router.get("/crypto/public-key")
async def get_transport_public_key(current_user=Depends(get_current_user)):
    return {"success": True, "data": {"publicKey": transport_public_key_pem(), "algorithm": "RSA-OAEP-SHA256"}}


@router.post("/secure-channel")
async def create_secure_channel(body: dict, request: Request, current_user=Depends(get_current_user)):
    try:
        key = unwrap_transport_key(str(body.get("wrappedKey", "")))
        if len(key) != 32:
            raise ValueError("AES key must be 256 bits")
    except Exception as exc:
        raise HTTPException(status_code=400, detail={"code": "INVALID_KEY_EXCHANGE", "message": "Could not establish the encrypted message channel."}) from exc
    session = db.sessions.get(extract_session_id(request) or "")
    if not session:
        raise HTTPException(status_code=401, detail={"code": "SESSION_EXPIRED", "message": "Session expired."})
    import base64
    session["messageTransportKey"] = base64.b64encode(key).decode("ascii")
    return {"success": True, "data": {"status": "secure_channel_ready", "keyExchange": "RSA-OAEP-SHA256"}}


@router.get("/")
async def get_messages(request: Request, projectId: str = None, current_user=Depends(get_current_user)):
    if not projectId:
        raise HTTPException(status_code=400, detail={"code": "MISSING_PARAM", "message": "projectId is required."})
    _require_member(projectId, current_user)
    key = _transport_key(request) if is_secure() else None
    messages = sorted((m for m in db.messages if m["projectId"] == projectId), key=lambda m: m["createdAt"])
    enriched = []
    for message in messages:
        if current_user["_id"] not in message.get("readBy", []):
            message.setdefault("readBy", []).append(current_user["_id"])
        item = dict(message)
        stored = str(message.get("content", ""))
        seals = verify_message_seals(message) if is_secure() else {
            "integrityVerified": False, "hmacVerified": False, "signatureVerified": False,
        }
        item.update(seals)
        item["isEncryptedInStorage"] = stored.startswith("ENC:")
        item["rawStoredSnippet"] = stored[:40] + ("..." if len(stored) > 40 else "")
        item["signatureAlgorithm"] = message.get("signatureAlgorithm", "")
        if is_secure():
            if not seals["integrityVerified"]:
                item["content"] = "[Message integrity check failed]"
                item["isTampered"] = True
            else:
                plain = decrypt_chat_message(stored)
                if plain.startswith("[Decryption Failed:"):
                    item["content"] = "[Message decryption failed]"
                    item["isTampered"] = True
                else:
                    item["content"] = encrypt_transport_payload(plain, key)
                    item["isTampered"] = False
        else:
            item["content"] = stored
            item["isTampered"] = False
        enriched.append(item)
    return {"success": True, "data": enriched}


@router.post("/", status_code=201)
async def send_message(body: SendMessageRequest, request: Request, current_user=Depends(get_current_user)):
    if not body.content or not body.content.strip():
        raise HTTPException(status_code=400, detail={"code": "INVALID_INPUT", "message": "Message content cannot be empty."})
    _require_member(body.projectId, current_user)
    if is_secure():
        key = _transport_key(request)
        try:
            raw_input = decrypt_transport_payload(body.content, key)
        except Exception as exc:
            raise HTTPException(status_code=400, detail={"code": "INVALID_ENVELOPE", "message": "Message transport encryption could not be verified."}) from exc
    else:
        raw_input = body.content.strip()
    if not raw_input.strip():
        raise HTTPException(status_code=400, detail={"code": "INVALID_INPUT", "message": "Message content cannot be empty."})
    safe_text = html.escape(raw_input.strip()) if is_secure() else raw_input.strip()
    stored_content = encrypt_chat_message(safe_text) if is_secure() else safe_text
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    message = {
        "_id": f"msg_{secrets.token_hex(6)}", "projectId": body.projectId,
        "senderId": current_user["_id"], "senderName": current_user["fullName"],
        "content": stored_content, "createdAt": now, "readBy": [current_user["_id"]],
    }
    if is_secure():
        message.update(seal_message(message))
    db.messages.append(message)
    for member in db.project_memberships:
        if member["projectId"] == body.projectId and member["userId"] != current_user["_id"]:
            db.add_notification({
                "_id": f"notif_{secrets.token_hex(6)}", "userId": member["userId"],
                "title": "New Message in Project", "message": f"A new protected message was sent by {current_user['fullName']}.",
                "type": "message", "link": "/projects", "read": False, "createdAt": now,
            })
    try:
        from core.ws_manager import ws_manager
        import asyncio
        asyncio.create_task(ws_manager.broadcast_chat_message(body.projectId, {
            "type": "new_chat_message", "message": {"_id": message["_id"], "projectId": body.projectId},
        }))
    except Exception:
        pass
    response = dict(message)
    if is_secure():
        response["content"] = encrypt_transport_payload(safe_text, _transport_key(request))
        response.update(verify_message_seals(message))
    response["isEncryptedInStorage"] = is_secure()
    response["rawStoredSnippet"] = stored_content[:40] + ("..." if len(stored_content) > 40 else "")
    response["isTampered"] = False
    return {"success": True, "data": response}
