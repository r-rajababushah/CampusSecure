"""
Messages router — /api/v1/messages
Supports dual-mode behavior governed by is_secure():
- Chat Storage: ON = Encrypted with AES-256-GCM before database storage.
                OFF = Stored in raw plaintext.
- XSS: ON = HTML sanitized/escaped before storage.
       OFF = Raw unescaped strings stored (allowing script/img tag injection).
"""
import html
import secrets
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends

from core.database import db
from core.security_mode import is_secure
from core.chat_crypto import encrypt_chat_message, decrypt_chat_message
from models.schemas import SendMessageRequest
from routers.deps import get_current_user

router = APIRouter()


@router.get("/")
async def get_messages(projectId: str = None, current_user=Depends(get_current_user)):
    if not projectId:
        raise HTTPException(status_code=400, detail={"code": "MISSING_PARAM", "message": "projectId is required."})

    # Verify membership in ON mode
    if is_secure() and current_user["role"] != "admin":
        is_member = any(m["projectId"] == projectId and m["userId"] == current_user["_id"] for m in db.project_memberships)
        if not is_member:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You are not a member of this project."})
    else:
        # In OFF mode: membership check bypassed
        pass

    messages = sorted(
        [m for m in db.messages if m["projectId"] == projectId],
        key=lambda m: m["createdAt"]
    )

    enriched = []
    for m in messages:
        # Mark as read
        if current_user["_id"] not in m.get("readBy", []):
            m.setdefault("readBy", []).append(current_user["_id"])

        stored_raw = m.get("content", "")
        is_encrypted = stored_raw.startswith("ENC:AES-GCM:")

        # Decrypt for authenticated user display
        decrypted_text = decrypt_chat_message(stored_raw)

        msg_copy = dict(m)
        msg_copy["content"] = decrypted_text
        msg_copy["isEncryptedInStorage"] = is_encrypted
        msg_copy["rawStoredSnippet"] = stored_raw[:40] + ("..." if len(stored_raw) > 40 else "")
        enriched.append(msg_copy)

    return {"success": True, "data": enriched}


@router.post("/", status_code=201)
async def send_message(body: SendMessageRequest, current_user=Depends(get_current_user)):
    if not body.content or not body.content.strip():
        raise HTTPException(status_code=400, detail={"code": "INVALID_INPUT", "message": "Message content cannot be empty."})

    # Verify membership
    if is_secure() and current_user["role"] != "admin":
        is_member = any(m["projectId"] == body.projectId and m["userId"] == current_user["_id"] for m in db.project_memberships)
        if not is_member:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You are not a member of this project."})

    raw_input = body.content.strip()

    if is_secure():
        # SECURE PATH:
        # 1. Sanitize HTML to prevent Stored XSS
        sanitized = html.escape(raw_input)
        # 2. Encrypt with AES-256-GCM before DB write
        final_content = encrypt_chat_message(sanitized)
    else:
        # DEMO-ONLY INSECURE PATH:
        # 1. Raw unescaped string stored (vulnerable to Stored XSS: <img src=x onerror=...>)
        # 2. Raw plaintext stored in database without encryption
        final_content = raw_input

    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    message = {
        "_id": f"msg_{secrets.token_hex(6)}",
        "projectId": body.projectId,
        "senderId": current_user["_id"],
        "senderName": current_user["fullName"],
        "content": final_content,
        "createdAt": now,
        "readBy": [current_user["_id"]],
    }
    db.messages.append(message)

    # Notify members
    members = [m for m in db.project_memberships if m["projectId"] == body.projectId and m["userId"] != current_user["_id"]]
    for member in members:
        notif = {
            "_id": f"notif_{secrets.token_hex(6)}",
            "userId": member["userId"],
            "title": "New Message in Project",
            "message": f"{current_user['fullName']}: \"{raw_input[:60]}\"",
            "type": "message",
            "link": "/projects",
            "read": False,
            "createdAt": now,
        }
        db.add_notification(notif)

    # Real-time WebSocket broadcast to project room
    try:
        from core.ws_manager import ws_manager
        import asyncio
        asyncio.create_task(ws_manager.broadcast_chat_message(body.projectId, {
            **message,
            "content": raw_input,
            "displayContent": raw_input,
            "isEncryptedInStorage": is_secure(),
        }))
    except Exception:
        pass

    return {
        "success": True,
        "data": {
            **message,
            "content": raw_input,
            "displayContent": raw_input,
            "rawStoredSnippet": final_content[:40] + ("..." if len(final_content) > 40 else ""),
            "isEncryptedInStorage": is_secure(),
        }
    }
