# SecureCampus Architecture & Security Model

## 1. System Overview

SecureCampus is engineered as a secure, modular monolith application with a React single-page frontend and a Node.js/Express RESTful backend coupled with a real-time Socket.IO event gateway.

```
                           ┌───────────────────────────────┐
                           │      React 19 SPA Client      │
                           │  (Tailwind v4 / Lucide Icons) │
                           └───────────────┬───────────────┘
                                           │
                        HTTPS / Cookies    │    WSS / Socket.IO
                     (SameSite=Lax, CSRF)  │  (Room-based auth)
                                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                             Express Backend                              │
│                                                                          │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌─────────────────┐  │
│  │    Security Filter    │ │    Authentication    │ │  Anti-CSRF &    │  │
│  │ (Helmet CSP, CORS, RL)│ │  (Session Rotation)  │ │ Double-Submit   │  │
│  └───────────┬───────────┘ └──────────┬───────────┘ └────────┬────────┘  │
│              │                        │                      │           │
│              └────────────────────────┼──────────────────────┘           │
│                                       ▼                                  │
│                   ┌──────────────────────────────────────┐               │
│                   │      Feature Modules (/api/v1)       │               │
│                   │  Auth · Users · Classes · Attendance │               │
│                   │  Projects · Tasks · Chat · SOC · Logs│               │
│                   └──────────────────┬───────────────────┘               │
│                                      │                                   │
│  ┌─────────────────────────┐         ▼        ┌────────────────────────┐ │
│  │  HMAC-SHA-256 Integrity │◄────────────────►│   Socket.IO Gateway    │ │
│  │ (External Secret Key)   │                  │ (Admin SOC, Chat Room) │ │
│  └─────────────────────────┘                  └────────────────────────┘ │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       │
                                       ▼
                 ┌───────────────────────────────────────────┐
                 │       Persistent Schema Document DB       │
                 │    (Compound Unique Constraints & Mongoose│
                 │      compatible query interface)          │
                 └───────────────────────────────────────────┘
```

---

## 2. Database Model & Relationship Architecture

1. **User**: Primary identity model.
   - Index: `email` (unique).
   - Roles: `admin`, `faculty`, `student`.
2. **Class**: Course offering.
   - Index: `code` (unique). References `facultyId` -> `User`.
3. **Enrollment**: Links student to class.
   - **Compound Unique Index**: `(classId, studentId)`.
4. **AttendanceSession**: Single class lecture/session.
   - References `classId`, `facultyId`.
5. **AttendanceRecord**: Individual student attendance state.
   - **Compound Unique Index**: `(sessionId, studentId)` to prevent duplicate records.
   - Fields: `status`, `markedAt`, `markedBy`, `integrityHmac`, `isTampered`, `correctionReason`, `correctedBy`.
6. **Project**: Collaboration space.
   - References `ownerId` -> `User`, optional `classId`.
7. **ProjectMembership**: Team membership and permissions.
   - **Compound Unique Index**: `(projectId, userId)` to prevent multiple memberships.
   - Roles: `leader`, `member`.
8. **Task**: Deliverables in project space.
   - References `projectId`, optional `assignedTo` -> `User`.
9. **Message**: Persistent group chat in project.
   - References `projectId`, `senderId`.
10. **Notification**: User notification.
    - References `userId`.
11. **SecurityEvent**: Structured SOC event.
    - Fields: `eventCategory`, `severity`, `eventType`, `message`, `affectedResource`, `outcome`, `correlationId`, `ip`, `isSimulatedDemo`, `investigationStatus`, `notes`.
12. **ScannerFinding**: Normalized vulnerability finding.
    - Fields: `source` (OWASP_ZAP, BURP_SUITE), `alertName`, `severity`, `confidence`, `url`, `method`, `remediationStatus`.
13. **AuditLog**: Immutable action log with correlation ID.

---

## 3. Cryptographic Attendance Integrity Mechanism

### Canonical String Formation
To ensure deterministic verification regardless of JSON serialization ordering or whitespace, a canonical representation is formed:
```
canonical = "sessionId=" + sessionId + "|studentId=" + studentId + "|status=" + status + "|date=" + date
```

### HMAC-SHA-256 Calculation
The signature is generated using a cryptographically random secret (`HMAC_ATTENDANCE_SECRET`) stored **outside** the database in environment configuration:
```ts
crypto.createHmac('sha256', secret).update(canonical).digest('hex')
```

### Verification & Tamper Detection
- On marking attendance: Signature is computed and stored in `integrityHmac`.
- On authorized correction: Faculty provides a required explanation `reason`; the server re-computes the HMAC signature and registers an audit log.
- During periodic integrity sweeps or on-demand checks (`POST /api/v1/attendance/verify`): Each record's canonical string is re-hashed and compared in constant time (`crypto.timingSafeEqual`). If a discrepancy exists:
  1. The record is flagged with `isTampered: true`.
  2. A `CRITICAL` severity `ATTENDANCE_TAMPER_DETECTED` SecurityEvent is created.
  3. Real-time alert is broadcast via Socket.IO to the Admin SOC stream.

*Limitation Note*: HMAC detects unauthorized database tampering only while the HMAC secret key remains uncompromised outside the database. It does not prevent privileged attackers with root OS and server environment access from regenerating both records and HMAC signatures.

---

## 4. Threat Model & Defenses (OWASP Top 10 Alignment)

| Vulnerability Category | SecureCampus Implementation & Mitigation |
| :--- | :--- |
| **A01: Broken Access Control (IDOR / BOLA)** | All protected routes enforce resource-level ownership and enrollment checks on the server. Non-members cannot access private projects, rosters, or student records. |
| **A02: Cryptographic Failures** | Passwords hashed using Argon2/Bcrypt with work factor salt rounds = 12. Attendance protected by HMAC-SHA-256. Constant-time buffer comparisons prevent timing attacks. |
| **A03: Injection (SQL / NoSQL / Command)** | Input validation with Zod schemas. Scalar type enforcement. Keys prefixed with `$` or containing dots are stripped by recursive input sanitizer. |
| **A04: Insecure Design** | Separation of duties (Student / Faculty / Admin). Double-submit Anti-CSRF protection on state-changing operations. Session ID rotation upon authentication. |
| **A05: Security Misconfiguration** | Helmet CSP configured. Strict CORS. Server banner suppression. Error handler strips stack traces in responses. |
| **A06: Vulnerable & Outdated Components** | Minimal, modern dependency tree audited via npm. |
| **A07: Identification & Authentication Failures** | Server-side sessions with 32-byte entropy. Account lockout after 5 consecutive failed attempts. Sliding idle timeout (60 min) and absolute lifetime (12 hrs). |
| **A08: Software & Data Integrity Failures** | Canonical HMAC-SHA-256 over attendance records. Integrity sweeps alert on modification. |
| **A09: Security Logging & Monitoring Failures** | Real-time SOC event stream via Socket.IO. Comprehensive logging of failed auth, rate limit violations, IDOR denials, and tampering attempts with correlation IDs. |
| **A10: Server-Side Request Forgery (SSRF)** | No arbitrary outbound URL fetching. Scanner report importers strictly process user-supplied JSON structures without making outbound requests. |
