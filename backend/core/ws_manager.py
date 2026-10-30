"""
Real-time WebSocket connection manager for SecureCampus.
Handles live project chat room broadcasting and security event streaming.
"""
from typing import Dict, Set, Any
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        # projectId -> Set[WebSocket]
        self.project_rooms: Dict[str, Set[WebSocket]] = {}
        # userId -> Set[WebSocket]
        self.user_connections: Dict[str, Set[WebSocket]] = {}
        # security admin stream
        self.admin_stream: Set[WebSocket] = set()

    async def connect_project(self, websocket: WebSocket, project_id: str, user_id: str = None):
        await websocket.accept()
        self.project_rooms.setdefault(project_id, set()).add(websocket)
        if user_id:
            self.user_connections.setdefault(user_id, set()).add(websocket)

    def disconnect_project(self, websocket: WebSocket, project_id: str, user_id: str = None):
        if project_id in self.project_rooms:
            self.project_rooms[project_id].discard(websocket)
            if not self.project_rooms[project_id]:
                del self.project_rooms[project_id]
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)

    async def broadcast_chat_message(self, project_id: str, message_data: dict):
        """Broadcasts a newly sent decrypted/rendered chat message to all members in the project room."""
        if project_id not in self.project_rooms:
            return

        dead_sockets = set()
        payload = {
            "type": "new_chat_message",
            "projectId": project_id,
            "message": message_data,
        }

        for ws in self.project_rooms[project_id]:
            try:
                await ws.send_json(payload)
            except Exception:
                dead_sockets.add(ws)

        for ws in dead_sockets:
            self.project_rooms[project_id].discard(ws)


ws_manager = WebSocketManager()

