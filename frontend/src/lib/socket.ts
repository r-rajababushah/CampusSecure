import { io, Socket } from 'socket.io-client';
import { ChatMessage, SecurityEvent, AppNotification } from '../types/index.js';

let socket: Socket | null = null;
let activeSessionId: string | null = null;

export function getSocket(sessionId?: string): Socket {
  if (sessionId) {
    activeSessionId = sessionId;
  }

  if (!socket) {
    socket = io(window.location.origin, {
      path: '/socket.io',
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling'],
      auth: activeSessionId ? { sessionId: activeSessionId, token: activeSessionId } : undefined,
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to real-time gateway');
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Gateway connection notice:', err.message);
    });
  } else if (sessionId && (!socket.auth || (socket.auth as any).sessionId !== sessionId)) {
    socket.auth = { sessionId, token: sessionId };
    socket.disconnect().connect();
  }

  return socket;
}

export function setSocketSession(sessionId?: string | null) {
  activeSessionId = sessionId || null;
  if (socket) {
    socket.auth = activeSessionId ? { sessionId: activeSessionId, token: activeSessionId } : {};
    socket.disconnect().connect();
  } else if (sessionId) {
    getSocket(sessionId);
  }
}

export function disconnectSocket() {
  activeSessionId = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function registerSocketUser(userId: string) {
  const s = getSocket();
  s.emit('register_user', userId);
}

export function subscribeToSecurityStream() {
  const s = getSocket();
  s.emit('subscribe_security', { role: 'admin' });
}

export function joinProjectRoom(projectId: string, userId?: string) {
  const s = getSocket();
  s.emit('join_project', { projectId, userId });
}

export function leaveProjectRoom(projectId: string) {
  const s = getSocket();
  s.emit('leave_project', { projectId });
}

export function onNewMessage(callback: (msg: ChatMessage) => void) {
  const s = getSocket();
  s.on('new_message', callback);
  return () => {
    s.off('new_message', callback);
  };
}

export function onSecurityEvent(callback: (event: SecurityEvent) => void) {
  const s = getSocket();
  s.on('security_event', callback);
  return () => {
    s.off('security_event', callback);
  };
}

export function onNotification(callback: (notif: AppNotification) => void) {
  const s = getSocket();
  s.on('notification', callback);
  return () => {
    s.off('notification', callback);
  };
}

