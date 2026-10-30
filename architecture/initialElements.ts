/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Node, Edge, MarkerType } from '@xyflow/react';

// ============================================================================
// 1. OVERALL ZERO-TRUST ARCHITECTURE FLOW (12 Nodes, 14 Edges)
// ============================================================================
export const overallNodes: Node[] = [
  // ── Column 1: Ingress & Perimeter Protection (X: 80) ──────────────────────
  {
    id: 'client-perimeter',
    type: 'clientPerimeter',
    position: { x: 80, y: 80 },
    data: {
      category: 'core',
      badge: 'CLIENT INGRESS',
      badgeColor: 'blue',
      title: 'Browser Client (React 19 SPA)',
      isActive: false,
      description: 'Single-Page Application dispatching state-changing mutations with credentials: "include" and X-CSRF-Token headers.',
      protocol: 'HTTPS / TLS 1.3 + WSS (Socket.IO)',
      securityLayer: 'SameSite=Lax Session Cookies & Anti-CSRF Double-Submit Token',
      specFormula: 'Origin: https://campus.secure | Credentials: omit-third-party',
    },
  },
  {
    id: 'security-filter',
    type: 'securityFilter',
    position: { x: 80, y: 400 },
    data: {
      category: 'core',
      badge: 'PERIMETER WAF',
      badgeColor: 'indigo',
      title: 'Perimeter WAF & Security Headers Gate',
      isActive: false,
      description: 'Express HTTP security middleware applying strict Content Security Policy, nosniff, and anti-framing directives.',
      protocol: 'Express HTTP Middleware Pipeline',
      securityLayer: "Content-Security-Policy: default-src 'self'; X-Content-Type-Options: nosniff",
      specFormula: 'CSP: script-src self; frame-ancestors none; nosniff: 1',
    },
  },
  {
    id: 'auth-rate-limiter',
    type: 'authRateLimiter',
    position: { x: 80, y: 720 },
    data: {
      category: 'core',
      badge: 'IDENTITY GUARD',
      badgeColor: 'cyan',
      title: 'Auth & Sliding Rate-Limiter',
      isActive: false,
      description: 'Authenticates users with salted PBKDF2 hashes. Locks out brute-force probes after 5 consecutive failures.',
      protocol: 'Salted PBKDF2 (100,000 rounds, SHA-256)',
      securityLayer: '15 req / 60s Sliding Window Limiter & 15-Minute Brute-Force Lockout',
      specFormula: 'PBKDF2(pass, salt, 100000, 32, "sha256") -> timingSafeEqual()',
    },
  },
  {
    id: 'csrf-guard',
    type: 'csrfGuard',
    position: { x: 80, y: 1040 },
    data: {
      category: 'core',
      badge: 'STATE GUARD',
      badgeColor: 'purple',
      title: 'Double-Submit Anti-CSRF Guard',
      isActive: false,
      description: 'Intercepts POST, PUT, PATCH, and DELETE requests, verifying that the X-CSRF-Token matches the authenticated session token.',
      protocol: 'Cryptographic Timing-Safe String Comparison',
      securityLayer: 'Zero-Tolerance CSRF Validation (HTTP 403 CSRF_INVALID on mismatch)',
      specFormula: 'Req.Header["X-CSRF-Token"] === Session.Token (Constant-Time)',
    },
  },

  // ── Column 2: Identity, Access & Cryptographic Engines (X: 580) ───────────
  {
    id: 'rbac-gate',
    type: 'rbacGate',
    position: { x: 580, y: 240 },
    data: {
      category: 'core',
      badge: 'ACCESS CONTROL',
      badgeColor: 'teal',
      title: 'RBAC & IDOR Authorization Gate',
      isActive: false,
      description: 'Server-side role-based access control protecting admin and faculty endpoints against Insecure Direct Object References.',
      protocol: 'Express Router Authorization Dependency',
      securityLayer: 'Server-Side Role Guard (admin, faculty, student) & Ownership Bounds Check',
      specFormula: 'Assert user.role IN requiredRoles && resource.owner === user.id',
    },
  },
  {
    id: 'attendance-hmac',
    type: 'attendanceHmac',
    position: { x: 580, y: 560 },
    data: {
      category: 'crypto',
      badge: 'INTEGRITY SEAL',
      badgeColor: 'emerald',
      title: 'Attendance HMAC-SHA256 Integrity Seal',
      isActive: false,
      description: 'Generates and verifies cryptographic seals across canonical attendance strings to detect any illicit database tampering.',
      protocol: 'HMAC-SHA-256 with External Secret',
      securityLayer: 'Constant-Time crypto.timingSafeEqual Verification Sweep',
      specFormula: 'HMAC-SHA256(canonicalStr, secretKey) where canonical = sId|stuId|status|date',
    },
  },
  {
    id: 'chat-crypto',
    type: 'chatCrypto',
    position: { x: 580, y: 880 },
    data: {
      category: 'crypto',
      badge: 'CONFIDENTIALITY',
      badgeColor: 'fuchsia',
      title: 'Hybrid RSA-2048 + AES-256-GCM Chat Engine',
      isActive: false,
      description: 'Encrypts each project chat message with a fresh 256-bit ephemeral AES key wrapped in an RSA-2048 OAEP envelope.',
      protocol: 'Hybrid RSA-2048-OAEP + AES-256-GCM AEAD',
      securityLayer: '96-bit Unique Nonce + 128-bit Authentication Tag + Anti-XSS Sanitizer',
      specFormula: 'Ciphertext = AES-GCM(K_ephem, IV, msg, AAD) | EncKey = RSA_Encrypt(PubKey, K_ephem)',
    },
  },

  // ── Column 3: Data Integrity, Database Defense & SOC (X: 1080) ────────────
  {
    id: 'audit-ledger',
    type: 'auditLedger',
    position: { x: 1080, y: 400 },
    data: {
      category: 'crypto',
      badge: 'FORENSIC STORE',
      badgeColor: 'violet',
      title: 'Immutable Audit Trail Ledger',
      isActive: false,
      description: 'Append-only chronological audit log recording every security-critical event with client IP and request correlation ID.',
      protocol: 'Correlated Append-Only Forensic Store',
      securityLayer: 'Non-Repudiation Audit Logs with Actor, Resource, and Timestamp Stamping',
      specFormula: 'AuditEntry = { eventId, actorId, role, action, ip, correlationId, ts }',
    },
  },
  {
    id: 'sqli-engine',
    type: 'sqliEngine',
    position: { x: 1080, y: 720 },
    data: {
      category: 'soc',
      badge: 'DATABASE DEFENSE',
      badgeColor: 'amber',
      title: 'Wasm SQLite & SQLi Defense Engine',
      isActive: false,
      description: 'Evaluates user queries in WebAssembly SQLite. Parameterizes inputs in ON mode, neutralizing UNION and sqlite_master injection.',
      protocol: 'Wasm SQLite 3 (sql.js) Query Engine',
      securityLayer: 'Prepared Statements & Pre-Execution Heuristic Signature Filter',
      specFormula: 'db.prepare("SELECT * FROM users WHERE name = ?").bind([safeParam])',
    },
  },
  {
    id: 'soc-telemetry',
    type: 'socTelemetry',
    position: { x: 1080, y: 1040 },
    data: {
      category: 'soc',
      badge: 'SOC OPERATIONS',
      badgeColor: 'rose',
      title: 'Real-Time SOC & Telemetry Gateway',
      isActive: false,
      description: 'Socket.IO event bus broadcasting instant security alerts to SOC analysts, parsing OWASP ZAP and Burp Suite reports.',
      protocol: 'Socket.IO WSS Real-Time Stream (/socket.io)',
      securityLayer: 'Automated Threat Ingestion, ZAP/Burp Normalizer, and Severity Scoring',
      specFormula: 'io.emit("security:threat_alert", { type, severity, ip, timestamp })',
    },
  },

  // ── Column 4: Certified Terminal Outcomes (X: 1580) ───────────────────────
  {
    id: 'zero-trust-verified',
    type: 'zeroTrustVerified',
    position: { x: 1580, y: 400 },
    data: {
      category: 'terminal',
      badge: 'VERIFIED STATE',
      badgeColor: 'emerald',
      title: 'Zero-Trust Integrity Certified',
      isActive: false,
      description: 'Request successfully authenticated, authorized, verified for cryptographic integrity, and logged in the immutable audit trail.',
      protocol: 'Zero-Trust Collegiate Compliance Standard',
      securityLayer: '100% Security Defense Verification + Celebration Confetti Cannon 🎉',
      specFormula: 'Auth + CSRF + RBAC + HMAC + Audit = CERTIFIED SECURE',
    },
  },
  {
    id: 'incident-mitigated',
    type: 'incidentMitigated',
    position: { x: 1580, y: 880 },
    data: {
      category: 'terminal',
      badge: 'REMEDIATED',
      badgeColor: 'fuchsia',
      title: 'SOC Incident Mitigated & Certified',
      isActive: false,
      description: 'Simulated attack detected by real-time heuristics, blocked by zero-trust guards, and resolved in the SOC incident console.',
      protocol: 'Forensic Remediation & Incident Sign-Off',
      securityLayer: 'Threat Neutralization Certified + Celebration Confetti Cannon 🎊',
      specFormula: 'Attack Blocked -> SOC Alert -> Dynamic Rule Hardening Applied',
    },
  },
];

export const overallEdges: Edge[] = [
  // 1. Client Perimeter -> Security Filter (Perimeter WAF)
  {
    id: 'e-client-filter',
    source: 'client-perimeter',
    target: 'security-filter',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    label: 'HTTPS & Strict CSP Ingress',
    labelStyle: { fill: '#93c5fd', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 2. Client Perimeter -> SQLi Engine (Interactive Query Probe)
  {
    id: 'e-client-sqli',
    source: 'client-perimeter',
    sourceHandle: 'right',
    target: 'sqli-engine',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '4 4' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
    label: 'SQL Query Probe',
    labelStyle: { fill: '#fde68a', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 3. Security Filter -> Auth & Rate Limiter
  {
    id: 'e-filter-auth',
    source: 'security-filter',
    target: 'auth-rate-limiter',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    label: 'WAF Sanitized Request',
    labelStyle: { fill: '#a5b4fc', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 4. Auth & Rate Limiter -> CSRF Guard
  {
    id: 'e-auth-csrf',
    source: 'auth-rate-limiter',
    target: 'csrf-guard',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#06b6d4', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' },
    label: 'Authenticated Session (PBKDF2)',
    labelStyle: { fill: '#67e8f9', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 5. Auth Rate Limiter -> SOC Telemetry (Alert channel)
  {
    id: 'e-auth-soc',
    source: 'auth-rate-limiter',
    sourceHandle: 'alert',
    target: 'soc-telemetry',
    targetHandle: 'left-alert',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '4 4' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
    label: 'Failed Attempt / Lockout Alert',
    labelStyle: { fill: '#fde68a', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 6. CSRF Guard -> RBAC Gate
  {
    id: 'e-csrf-rbac',
    source: 'csrf-guard',
    target: 'rbac-gate',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#a855f7', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
    label: 'Anti-CSRF Token Verified',
    labelStyle: { fill: '#d8b4fe', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 7. RBAC Gate -> Attendance HMAC
  {
    id: 'e-rbac-att',
    source: 'rbac-gate',
    target: 'attendance-hmac',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    label: 'Authorized Class Session',
    labelStyle: { fill: '#6ee7b7', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 8. RBAC Gate -> Chat Crypto
  {
    id: 'e-rbac-chat',
    source: 'rbac-gate',
    sourceHandle: 'right',
    target: 'chat-crypto',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#d946ef', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#d946ef' },
    label: 'Project Member Authorization',
    labelStyle: { fill: '#f0abfc', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 9. Attendance HMAC -> Audit Ledger
  {
    id: 'e-att-audit',
    source: 'attendance-hmac',
    target: 'audit-ledger',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    label: 'HMAC-SHA256 Sealed',
    labelStyle: { fill: '#6ee7b7', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 10. Chat Crypto -> Audit Ledger
  {
    id: 'e-chat-audit',
    source: 'chat-crypto',
    target: 'audit-ledger',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#d946ef', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#d946ef' },
    label: 'AES-256-GCM Ciphertext Stored',
    labelStyle: { fill: '#f0abfc', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 11. Audit Ledger -> Zero-Trust Verified (Terminal)
  {
    id: 'e-audit-zt',
    source: 'audit-ledger',
    target: 'zero-trust-verified',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 3 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    label: 'Zero-Trust Certified (Confetti 🎉)',
    labelStyle: { fill: '#34d399', fontSize: 11, fontWeight: 700 },
    labelBgStyle: { fill: '#022c22', fillOpacity: 0.98 },
  },

  // 12. SQLi Engine -> SOC Telemetry
  {
    id: 'e-sqli-soc',
    source: 'sqli-engine',
    target: 'soc-telemetry',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#ef4444', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
    label: 'SQLi Attempt Intercepted & Parameterized',
    labelStyle: { fill: '#f87171', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#450a0a', fillOpacity: 0.95 },
  },

  // 13. SOC Telemetry -> Incident Mitigated (Terminal)
  {
    id: 'e-soc-mitigate',
    source: 'soc-telemetry',
    target: 'incident-mitigated',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#ec4899', strokeWidth: 3 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ec4899' },
    label: 'Incident Mitigated & Signed-Off (Confetti 🎊)',
    labelStyle: { fill: '#f472b6', fontSize: 11, fontWeight: 700 },
    labelBgStyle: { fill: '#500724', fillOpacity: 0.98 },
  },

  // 14. Incident Mitigated -> Perimeter WAF (Loopback feedback)
  {
    id: 'e-mitigate-filter',
    source: 'incident-mitigated',
    sourceHandle: 'loop',
    target: 'security-filter',
    targetHandle: 'loop-target',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#d946ef', strokeWidth: 2, strokeDasharray: '6 4' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#d946ef' },
    label: 'WAF Rule Hardening Loop ⟲',
    labelStyle: { fill: '#f0abfc', fontSize: 10, fontWeight: 700 },
    labelBgStyle: { fill: '#2e1065', fillOpacity: 0.95 },
  },
];


// ============================================================================
// 2. STUDENT MESSAGING SECURITY FLOW (12 Nodes, 14 Edges)
// End-to-End Hybrid RSA-2048 / AES-256-GCM Encryption & Zero-Knowledge Relay
// ============================================================================
export const studentMessagingNodes: Node[] = [
  // ── Column 1: Sender Browser Client Side (X: 80) ──────────────────────────
  {
    id: 'msg-sender-ui',
    type: 'msgSenderUi',
    position: { x: 80, y: 100 },
    data: {
      category: 'messaging',
      badge: 'STUDENT SENDER',
      badgeColor: 'blue',
      title: 'Student Sender Compose Client',
      isActive: false,
      description: 'Student drafts project chat message in React 19 UI. Plaintext exists strictly in ephemeral browser memory.',
      protocol: 'React Virtual DOM + Ephemeral Memory',
      securityLayer: 'Zero Local Disk Persistence & Anti-Keylogger Protection',
      specFormula: 'Message = { projectId: 402, recipient: "faculty_sharma", text: "..." }',
    },
  },
  {
    id: 'msg-ephemeral-key',
    type: 'msgEphemeralKey',
    position: { x: 80, y: 440 },
    data: {
      category: 'messaging',
      badge: 'KEY GENERATION',
      badgeColor: 'cyan',
      title: 'Ephemeral AES-256 Session Key Gen',
      isActive: false,
      description: 'Generates fresh 256-bit symmetric session key and 96-bit Initialization Vector (IV) using Web Crypto CSPRNG.',
      protocol: 'Web Crypto API crypto.getRandomValues()',
      securityLayer: 'Per-Message Unique Key (No Key Reuse Across Messages)',
      specFormula: 'K_msg = CSPRNG(256 bits) | IV = CSPRNG(96 bits) (RFC 5116)',
    },
  },
  {
    id: 'msg-rsa-envelope',
    type: 'msgRsaEnvelope',
    position: { x: 80, y: 780 },
    data: {
      category: 'messaging',
      badge: 'PUBLIC KEY ENVELOPE',
      badgeColor: 'purple',
      title: 'RSA-2048 OAEP Key Envelope',
      isActive: false,
      description: 'Fetches recipient’s verified public key from the campus directory. Encrypts ephemeral K_msg with RSA-OAEP SHA-256.',
      protocol: 'RSA-2048-OAEP (SHA-256 MGF1)',
      securityLayer: 'Asymmetric Key Wrapping (Only recipient private key can decrypt K_msg)',
      specFormula: 'EncKey = RSA-OAEP-Encrypt(PubKey_recipient, K_msg)',
    },
  },

  // ── Column 2: Payload Packaging & Cryptographic Integrity (X: 580) ────────
  {
    id: 'msg-aes-gcm',
    type: 'msgAesGcm',
    position: { x: 580, y: 260 },
    data: {
      category: 'messaging',
      badge: 'AEAD ENCRYPTION',
      badgeColor: 'fuchsia',
      title: 'AES-256-GCM AEAD Encryptor',
      isActive: false,
      description: 'Encrypts message plaintext with K_msg and IV. Injects authenticated data (AAD) to prevent contextual replay.',
      protocol: 'AES-256-GCM Authenticated Encryption',
      securityLayer: 'Confidentiality + 128-bit Authentication Tag (Tag_msg)',
      specFormula: 'Ciphertext, Tag = AES_GCM_Encrypt(K_msg, IV, Plaintext, AAD="securecampus_chat_v2")',
    },
  },
  {
    id: 'msg-hmac-seal',
    type: 'msgHmacSeal',
    position: { x: 580, y: 620 },
    data: {
      category: 'messaging',
      badge: 'INTEGRITY SEAL',
      badgeColor: 'emerald',
      title: 'Client-Side Message HMAC Seal',
      isActive: false,
      description: 'Signs encapsulated envelope, ciphertext, IV, sender ID, and timestamp into a 64-char non-repudiation signature.',
      protocol: 'HMAC-SHA-256 Signature',
      securityLayer: 'End-to-End Integrity Verification (Detects any relay manipulation)',
      specFormula: 'HMAC = SHA256(senderKey, senderId + channelId + ts + IV + ciphertext)',
    },
  },

  // ── Column 3: Zero-Knowledge Relay & Server Storage (X: 1080) ─────────────
  {
    id: 'msg-zk-relay',
    type: 'msgZkRelay',
    position: { x: 1080, y: 260 },
    data: {
      category: 'messaging',
      badge: 'ZERO-KNOWLEDGE RELAY',
      badgeColor: 'indigo',
      title: 'Zero-Knowledge Socket.IO Stream',
      isActive: false,
      description: 'Server routes encrypted envelope over authenticated WebSockets. Server possesses ZERO plaintext or private keys.',
      protocol: 'WSS / Socket.IO v4 Encrypted Payload Stream',
      securityLayer: 'Zero-Knowledge Server Architecture (Blind Blind Message Relay)',
      specFormula: 'Payload: { scheme: "RSA-2048-OAEP+AES-256-GCM", enc_key, nonce, ciphertext }',
    },
  },
  {
    id: 'msg-anti-xss-vault',
    type: 'msgAntiXssVault',
    position: { x: 1080, y: 620 },
    data: {
      category: 'messaging',
      badge: 'CIPHERTEXT VAULT',
      badgeColor: 'violet',
      title: 'Anti-XSS Vault & DB Storage',
      isActive: false,
      description: 'Validates payload structure, scrubs any script tags in metadata, and persists the ciphertext blob ENC:RSA-AES:... into SQLite.',
      protocol: 'Parameterized SQLite 3 Ciphertext Store',
      securityLayer: 'Ciphertext-at-Rest + Server-Side Payload Sanitization',
      specFormula: 'INSERT INTO chat_messages VALUES (?, ?, "ENC:RSA-AES:...", ?, ?)',
    },
  },
  {
    id: 'msg-mitm-defense',
    type: 'msgMitmDefense',
    position: { x: 1080, y: 960 },
    data: {
      category: 'messaging',
      badge: 'ADVERSARY PROBE',
      badgeColor: 'amber',
      title: 'MitM Eavesdrop / Tamper Probe',
      isActive: false,
      description: 'Simulated eavesdropper inspecting network traffic or trying to flip bits in ciphertext. Cryptographic auth tag detects tampering.',
      protocol: 'Cryptographic Adversary Defense Test',
      securityLayer: 'High Entropy Ciphertext (Plaintext Recovery Complexity: 2^256)',
      specFormula: 'Flipped Bit -> GCM Tag Mismatch -> Message Dropped & SOC Alert',
    },
  },

  // ── Column 4: Recipient Client & Zero-Plaintext DOM Render (X: 1580) ───────
  {
    id: 'msg-recipient-client',
    type: 'msgRecipientClient',
    position: { x: 1580, y: 120 },
    data: {
      category: 'messaging',
      badge: 'RECIPIENT CLIENT',
      badgeColor: 'blue',
      title: 'Recipient Student Client',
      isActive: false,
      description: 'Recipient student device receives real-time Socket.IO notification with encrypted payload and wrapped envelope.',
      protocol: 'Authenticated Client Socket.IO Ingress',
      securityLayer: 'Bearer Token Verified & Channel Membership Validated',
      specFormula: 'Event: "chat:new_encrypted_message" -> Dispatch to Crypto Unwrapper',
    },
  },
  {
    id: 'msg-rsa-unwrapper',
    type: 'msgRsaUnwrapper',
    position: { x: 1580, y: 460 },
    data: {
      category: 'messaging',
      badge: 'PRIVATE KEY UNWRAP',
      badgeColor: 'fuchsia',
      title: 'RSA-2048 Private Key Unwrapper',
      isActive: false,
      description: 'Recipient client unwraps ephemeral K_msg from the RSA envelope using its locally held private key.',
      protocol: 'RSA-2048-OAEP Private Key Decrypt',
      securityLayer: 'Zero Private Key Exposure (Private key never leaves recipient memory)',
      specFormula: 'K_msg = RSA-OAEP-Decrypt(PrivKey_recipient, enc_key)',
    },
  },
  {
    id: 'msg-gcm-authenticator',
    type: 'msgGcmAuthenticator',
    position: { x: 1580, y: 800 },
    data: {
      category: 'messaging',
      badge: 'AUTHENTICATED DECRYPT',
      badgeColor: 'emerald',
      title: 'AES-GCM Auth Tag & DOM Render',
      isActive: false,
      description: 'Validates 128-bit authentication tag. Upon tag match, decrypts plaintext in sandboxed React DOM with zero XSS risk.',
      protocol: 'AES-256-GCM Decrypt + DOM Sanitizer',
      securityLayer: 'AEAD Integrity Confirmed + XSS Neutralized',
      specFormula: 'Tag Verified -> Plaintext Rendered in React DOM -> K_msg Wiped',
    },
  },
  {
    id: 'msg-e2e-certified',
    type: 'msgE2eCertified',
    position: { x: 1580, y: 1140 },
    data: {
      category: 'terminal',
      badge: 'E2E CERTIFIED',
      badgeColor: 'emerald',
      title: 'E2E Confidentiality Certified',
      isActive: false,
      description: 'Message successfully encrypted client-side, relayed zero-knowledge, verified for integrity, and safely rendered for recipient.',
      protocol: 'End-to-End Cryptographic Guarantee',
      securityLayer: '100% Zero-Knowledge & Forward Secrecy Certified 🎉',
      specFormula: 'Zero-Knowledge + Ephemeral Keys + Authenticated AEAD = CERTIFIED',
    },
  },
];

export const studentMessagingEdges: Edge[] = [
  // 1. Sender UI -> Ephemeral Key Gen
  {
    id: 'e-msg-1',
    source: 'msg-sender-ui',
    target: 'msg-ephemeral-key',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    label: 'Trigger CSPRNG Key Gen',
    labelStyle: { fill: '#93c5fd', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 2. Ephemeral Key Gen -> RSA Envelope
  {
    id: 'e-msg-2',
    source: 'msg-ephemeral-key',
    target: 'msg-rsa-envelope',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#a855f7', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
    label: 'Wrap K_msg with Recipient PubKey',
    labelStyle: { fill: '#d8b4fe', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 3. Ephemeral Key Gen -> AES-GCM Encryptor
  {
    id: 'e-msg-3',
    source: 'msg-ephemeral-key',
    target: 'msg-aes-gcm',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#06b6d4', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' },
    label: 'Feed K_msg & 96-bit IV',
    labelStyle: { fill: '#67e8f9', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 4. Sender UI -> AES-GCM Encryptor (Plaintext stream)
  {
    id: 'e-msg-4',
    source: 'msg-sender-ui',
    target: 'msg-aes-gcm',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    label: 'Plaintext Stream (Local)',
    labelStyle: { fill: '#93c5fd', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 5. AES-GCM -> HMAC Seal
  {
    id: 'e-msg-5',
    source: 'msg-aes-gcm',
    target: 'msg-hmac-seal',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#d946ef', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#d946ef' },
    label: 'Ciphertext + 128-bit Tag',
    labelStyle: { fill: '#f0abfc', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 6. RSA Envelope -> HMAC Seal
  {
    id: 'e-msg-6',
    source: 'msg-rsa-envelope',
    target: 'msg-hmac-seal',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#a855f7', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
    label: 'Wrapped Envelope (enc_key)',
    labelStyle: { fill: '#d8b4fe', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 7. HMAC Seal -> Zero-Knowledge Relay
  {
    id: 'e-msg-7',
    source: 'msg-hmac-seal',
    target: 'msg-zk-relay',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    label: 'Sealed Encrypted Payload',
    labelStyle: { fill: '#6ee7b7', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 8. Zero-Knowledge Relay -> Anti-XSS Vault
  {
    id: 'e-msg-8',
    source: 'msg-zk-relay',
    target: 'msg-anti-xss-vault',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    label: 'Persist Ciphertext at Rest',
    labelStyle: { fill: '#a5b4fc', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 9. Zero-Knowledge Relay -> MitM Defense (Adversary Probe)
  {
    id: 'e-msg-9',
    source: 'msg-zk-relay',
    target: 'msg-mitm-defense',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '4 4' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
    label: 'Simulated MitM Interception Probe',
    labelStyle: { fill: '#fde68a', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 10. Zero-Knowledge Relay -> Recipient Client
  {
    id: 'e-msg-10',
    source: 'msg-zk-relay',
    target: 'msg-recipient-client',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    label: 'WebSocket Dispatch to Recipient',
    labelStyle: { fill: '#93c5fd', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 11. Recipient Client -> RSA Unwrapper
  {
    id: 'e-msg-11',
    source: 'msg-recipient-client',
    target: 'msg-rsa-unwrapper',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#a855f7', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
    label: 'Feed enc_key to Local Private Key',
    labelStyle: { fill: '#d8b4fe', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 12. RSA Unwrapper -> GCM Authenticator
  {
    id: 'e-msg-12',
    source: 'msg-rsa-unwrapper',
    target: 'msg-gcm-authenticator',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    label: 'Unwrapped K_msg + Tag Verification',
    labelStyle: { fill: '#6ee7b7', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 13. MitM Defense -> GCM Authenticator (Tamper Detection Signal)
  {
    id: 'e-msg-13',
    source: 'msg-mitm-defense',
    target: 'msg-gcm-authenticator',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#f43f5e', strokeWidth: 2, strokeDasharray: '4 4' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' },
    label: 'Tag Check Rejects Manipulated Blocks',
    labelStyle: { fill: '#fda4af', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 14. GCM Authenticator -> Terminal Certified
  {
    id: 'e-msg-14',
    source: 'msg-gcm-authenticator',
    target: 'msg-e2e-certified',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 3 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    label: 'E2E Confidentiality Verified (Confetti 🎉)',
    labelStyle: { fill: '#34d399', fontSize: 11, fontWeight: 700 },
    labelBgStyle: { fill: '#022c22', fillOpacity: 0.98 },
  },
];


// ============================================================================
// 3. ATTENDANCE TAMPERING & LEDGER VERIFICATION FLOW (11 Nodes, 14 Edges)
// Tamper Prevention, HMAC-SHA256 Seals, Cryptographic Chaining & SOC Defense
// ============================================================================
export const attendanceTamperingNodes: Node[] = [
  // ── Column 1: Physical Ingress & Token Generation (X: 80) ─────────────────
  {
    id: 'att-student-beacon',
    type: 'attStudentBeacon',
    position: { x: 80, y: 100 },
    data: {
      category: 'attendance',
      badge: 'CLIENT CHECK-IN',
      badgeColor: 'blue',
      title: 'Student Check-In Device',
      isActive: false,
      description: 'Student submits attendance verification with GPS coordinates, biometric/session credentials, and local device timestamp.',
      protocol: 'HTTPS / TLS 1.3 POST /api/v1/attendance',
      securityLayer: 'Hardware Fingerprint & Client Anti-Replay Nonce',
      specFormula: 'CheckInReq = { sessionId, studentId: "stu_109", coords, timestamp }',
    },
  },
  {
    id: 'att-geofence-gate',
    type: 'attGeofenceGate',
    position: { x: 80, y: 460 },
    data: {
      category: 'attendance',
      badge: 'PHYSICAL PERIMETER',
      badgeColor: 'teal',
      title: 'Geofence & Active Session Gate',
      isActive: false,
      description: 'Verifies GPS coordinates are within 50-meter classroom radius and validates that lecture session is actively unlocked by faculty.',
      protocol: 'Haversine Distance Formula + Faculty Token Gate',
      securityLayer: 'Geofence Bounds Check (< 50m) & Time-Window Validation (±5 min)',
      specFormula: 'Distance(DeviceCoords, ClassGPS) <= 50m && Session.Active === true',
    },
  },
  {
    id: 'att-canonical-serializer',
    type: 'attCanonicalSerializer',
    position: { x: 80, y: 820 },
    data: {
      category: 'attendance',
      badge: 'CANONICAL SERIALIZER',
      badgeColor: 'cyan',
      title: 'Canonical String Serializer',
      isActive: false,
      description: 'Transforms raw record into strict deterministic format. Prevents field reordering or padding attacks across platforms.',
      protocol: 'Deterministic Canonical Serialization',
      securityLayer: 'Field Normalization (Null-byte safe, sorted key order)',
      specFormula: 'canonical = "session:" + sId + "|student:" + stuId + "|status:" + status + "|date:" + date',
    },
  },

  // ── Column 2: Cryptographic Sealing & Chained Ledger (X: 580) ─────────────
  {
    id: 'att-hmac-engine',
    type: 'attHmacEngine',
    position: { x: 580, y: 260 },
    data: {
      category: 'attendance',
      badge: 'HMAC CRYPTO ENGINE',
      badgeColor: 'emerald',
      title: 'HMAC-SHA256 Integrity Engine',
      isActive: false,
      description: 'Generates unforgeable 64-character cryptographic seal using server-side master key ATTENDANCE_HMAC_SECRET.',
      protocol: 'HMAC-SHA-256 (RFC 2104)',
      securityLayer: '256-bit Keyed Cryptographic MAC (Mathematically Unforgeable)',
      specFormula: 'Seal = HMAC_SHA256(canonicalStr, ATTENDANCE_HMAC_SECRET)',
    },
  },
  {
    id: 'att-hash-chain-block',
    type: 'attHashChainBlock',
    position: { x: 580, y: 640 },
    data: {
      category: 'attendance',
      badge: 'CRYPTOGRAPHIC LEDGER',
      badgeColor: 'violet',
      title: 'Chained Ledger Block Store',
      isActive: false,
      description: 'Links each attendance entry into an append-only hash chain. Each block incorporates previous block hash + record HMAC.',
      protocol: 'SHA-256 Append-Only Merkle Chain',
      securityLayer: 'Cryptographic Immutability (Altering any block breaks the entire downstream chain)',
      specFormula: 'BlockHash_n = SHA256(BlockHash_{n-1} + RecordData + HMAC_Seal + Timestamp)',
    },
  },

  // ── Column 3: Tampering Attack Vector & Verification Sweep (X: 1080) ───────
  {
    id: 'att-attacker-tamper',
    type: 'attAttackerTamper',
    position: { x: 1080, y: 160 },
    data: {
      category: 'attendance',
      badge: 'ATTACK VECTOR',
      badgeColor: 'rose',
      title: 'Adversary DB Tampering Attack',
      isActive: false,
      description: 'Simulated adversary or rogue database administrator directly executes SQL UPDATE to flip status from ABSENT to PRESENT.',
      protocol: 'Direct SQLite Injection / Row Tampering Attempt',
      securityLayer: 'Adversary Lacks ATTENDANCE_HMAC_SECRET (Cannot re-seal modified row)',
      specFormula: 'MALICIOUS: UPDATE attendance SET status="PRESENT" WHERE id=402;',
    },
  },
  {
    id: 'att-constant-time-sweep',
    type: 'attConstantTimeSweep',
    position: { x: 1080, y: 520 },
    data: {
      category: 'attendance',
      badge: 'VERIFICATION SWEEP',
      badgeColor: 'amber',
      title: 'Constant-Time Verification Sweep',
      isActive: false,
      description: 'Recomputes expected HMAC over database fields and executes timing-safe comparison to prevent side-channel timing leaks.',
      protocol: 'Node.js crypto.timingSafeEqual()',
      securityLayer: 'Constant-Time Execution (Immune to Timing Discrepancy Attacks)',
      specFormula: 'isMatch = crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(recomputed))',
    },
  },
  {
    id: 'att-tamper-alarm',
    type: 'attTamperAlarm',
    position: { x: 1080, y: 880 },
    data: {
      category: 'attendance',
      badge: 'TAMPER DETECTED',
      badgeColor: 'rose',
      title: 'Tamper Alarm & Forensic Diff',
      isActive: false,
      description: 'Immediate alarm triggers upon signature mismatch or broken block hash! Flags tampered records in red with forensic diff.',
      protocol: 'Automated Integrity Violation Trigger',
      securityLayer: 'Instant Row Invalidation & Zero Blind Spots',
      specFormula: 'DIFF: Expected HMAC {4fa8...} != Found HMAC {9c12...} -> ALARM TRIGGERED',
    },
  },

  // ── Column 4: SIEM Incident Response & Forensic Certification (X: 1580) ────
  {
    id: 'att-siem-broadcast',
    type: 'attSiemBroadcast',
    position: { x: 1580, y: 260 },
    data: {
      category: 'attendance',
      badge: 'SIEM TELEMETRY',
      badgeColor: 'rose',
      title: 'Automated SIEM / SOC Dispatch',
      isActive: false,
      description: 'Broadcasts high-priority ATTENDANCE_TAMPER_DETECTED event across Socket.IO to campus SOC analysts and Dean of Academics.',
      protocol: 'Socket.IO WSS Real-Time Forensic Stream',
      securityLayer: 'Automated Severity 1 Incident Ticket Generation',
      specFormula: 'Emit: { event: "ATTENDANCE_TAMPERED", recordId: 402, originalStatus: "ABSENT" }',
    },
  },
  {
    id: 'att-quarantine-guard',
    type: 'attQuarantineGuard',
    position: { x: 1580, y: 640 },
    data: {
      category: 'attendance',
      badge: 'ACTIVE REMEDIATION',
      badgeColor: 'purple',
      title: 'Quarantine & Dynamic Account Ban',
      isActive: false,
      description: 'Isolates modified row from academic transcripts, flags rogue IP address in firewall, and freezes student attendance credits.',
      protocol: 'Autonomous Policy Enforcement Guard',
      securityLayer: 'Immediate Academic Transcript Quarantine & Dynamic IP Blocking',
      specFormula: 'Action: QuarantineRecord(402) + BlockIP(attackerIP) + NotifyAuditor()',
    },
  },
  {
    id: 'att-forensic-certified',
    type: 'attForensicCertified',
    position: { x: 1580, y: 1020 },
    data: {
      category: 'terminal',
      badge: 'LEDGER CERTIFIED',
      badgeColor: 'emerald',
      title: 'Attendance Ledger Certified',
      isActive: false,
      description: 'Cryptographic attendance ledger verified 100% intact. Tampering attempts thwarted and cryptographically sealed against illicit alteration.',
      protocol: 'Forensic Audit Standard Compliant',
      securityLayer: '100% Cryptographic Verification + Celebration Confetti Cannon 🎉',
      specFormula: 'HMAC Validated + Hash Chain Intact + Threats Neutralized = CERTIFIED',
    },
  },
];

export const attendanceTamperingEdges: Edge[] = [
  // 1. Student Beacon -> Geofence Gate
  {
    id: 'e-att-1',
    source: 'att-student-beacon',
    target: 'att-geofence-gate',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    label: 'Device GPS & Session Probe',
    labelStyle: { fill: '#93c5fd', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 2. Geofence Gate -> Canonical Serializer
  {
    id: 'e-att-2',
    source: 'att-geofence-gate',
    target: 'att-canonical-serializer',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#14b8a6', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#14b8a6' },
    label: 'Valid Geofence (< 50m)',
    labelStyle: { fill: '#5eead4', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 3. Canonical Serializer -> HMAC Engine
  {
    id: 'e-att-3',
    source: 'att-canonical-serializer',
    target: 'att-hmac-engine',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#06b6d4', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' },
    label: 'Deterministic Canonical String',
    labelStyle: { fill: '#67e8f9', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 4. HMAC Engine -> Chained Ledger Block Store
  {
    id: 'e-att-4',
    source: 'att-hmac-engine',
    target: 'att-hash-chain-block',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    label: 'Append 64-char HMAC-SHA256 Seal',
    labelStyle: { fill: '#6ee7b7', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 5. Attacker Tamper Attack -> Constant Time Sweep (Tamper vector)
  {
    id: 'e-att-5',
    source: 'att-attacker-tamper',
    target: 'att-constant-time-sweep',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#ef4444', strokeWidth: 2.5, strokeDasharray: '4 4' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
    label: 'Direct SQL Status Alteration Probe',
    labelStyle: { fill: '#fca5a5', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 6. Chained Ledger -> Constant-Time Verification Sweep
  {
    id: 'e-att-6',
    source: 'att-hash-chain-block',
    target: 'att-constant-time-sweep',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#8b5cf6', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
    label: 'Periodic Audit Sweep Trigger',
    labelStyle: { fill: '#c4b5fd', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 7. Constant-Time Sweep -> Tamper Alarm (Mismatch detected)
  {
    id: 'e-att-7',
    source: 'att-constant-time-sweep',
    target: 'att-tamper-alarm',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#f43f5e', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' },
    label: 'timingSafeEqual Mismatch Detected',
    labelStyle: { fill: '#fda4af', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 8. Tamper Alarm -> SIEM Broadcast
  {
    id: 'e-att-8',
    source: 'att-tamper-alarm',
    target: 'att-siem-broadcast',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#f43f5e', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' },
    label: 'Dispatch High-Priority Threat Event',
    labelStyle: { fill: '#fda4af', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 9. Tamper Alarm -> Quarantine Guard
  {
    id: 'e-att-9',
    source: 'att-tamper-alarm',
    target: 'att-quarantine-guard',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#a855f7', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
    label: 'Isolate Record & Freeze Creds',
    labelStyle: { fill: '#d8b4fe', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 10. Constant-Time Sweep -> Terminal Forensic Certified (Happy path validation)
  {
    id: 'e-att-10',
    source: 'att-constant-time-sweep',
    target: 'att-forensic-certified',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    label: 'All Signatures Verified 100% Valid',
    labelStyle: { fill: '#6ee7b7', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },

  // 11. Quarantine Guard -> Terminal Forensic Certified (Remediation confirmed)
  {
    id: 'e-att-11',
    source: 'att-quarantine-guard',
    target: 'att-forensic-certified',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    label: 'Tamper Neutralized & Audited (Confetti 🎉)',
    labelStyle: { fill: '#34d399', fontSize: 10, fontWeight: 700 },
    labelBgStyle: { fill: '#022c22', fillOpacity: 0.98 },
  },

  // 12. SIEM Broadcast -> Quarantine Guard
  {
    id: 'e-att-12',
    source: 'att-siem-broadcast',
    target: 'att-quarantine-guard',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '4 4' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ec4899' },
    label: 'SOC Automated Playbook Execution',
    labelStyle: { fill: '#f472b6', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
  },
];

// Defaults for backward compatibility
export const initialNodes = overallNodes;
export const initialEdges = overallEdges;
