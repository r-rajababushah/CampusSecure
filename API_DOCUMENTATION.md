# SecureCampus REST API Documentation

All API routes are served under prefix `/api/v1` and require authenticated session cookies (`campus_session`) or Bearer authorization headers (`Authorization: Bearer <sessionId>`).

---

## Headers & Security Conventions
- `Content-Type: application/json`
- `X-CSRF-Token`: Required for state-changing browser requests (`POST`, `PATCH`, `PUT`, `DELETE`).
- `X-Request-Id`: Automatically assigned or accepted; reflected in all responses and audit logs.
- Status codes:
  - `200 OK`: Request succeeded.
  - `201 Created`: Resource successfully created.
  - `400 Bad Request`: Payload validation failed (`VALIDATION_ERROR`).
  - `401 Unauthorized`: Missing or invalid session (`UNAUTHENTICATED`).
  - `403 Forbidden`: RBAC or IDOR access denied (`FORBIDDEN`).
  - `409 Conflict`: Uniqueness constraint violation (`DUPLICATE_ATTENDANCE_RECORD`, `ALREADY_MEMBER`).
  - `429 Too Many Requests`: Rate limit or lockout exceeded (`RATE_LIMIT_EXCEEDED`, `ACCOUNT_LOCKED`).

---

## Endpoints Summary

### Authentication (`/api/v1/auth`)
- `POST /login`: Authenticate with `{ email, password }`. Sets HTTP-only `campus_session` cookie and returns user profile. Rotates session ID on success.
- `POST /logout`: Invalidate current server session and clears cookies.
- `GET /me`: Returns current user identity, role, and CSRF token.
- `POST /bootstrap`: Development reset to initial standard accounts and sample records.

### User Management (`/api/v1/users`) — Admin Only
- `GET /`: List users with search, role filter, status filter, and pagination (`limit`, `offset`).
- `POST /`: Create user account `{ email, password, fullName, role, studentOrStaffId, department }`.
- `PATCH /:id`: Update user role, status (`active` / `suspended`), or department.

### Classes & Rosters (`/api/v1/classes`)
- `GET /`: List classes. Role-aware: Students receive enrolled classes; Faculty receive assigned courses; Admins receive all.
- `GET /:id`: Class details. Enforces enrollment verification for students.
- `GET /:id/roster`: Class student roster. Enforces instructor or enrolled student verification. Rejects unauthorized access with 403.
- `POST /`: Create course (Faculty or Admin).
- `POST /:id/enroll`: Enroll student in course. Enforces unique enrollment constraint.

### Attendance & HMAC Integrity (`/api/v1/attendance`)
- `GET /sessions?classId=...`: List attendance sessions for course.
- `POST /sessions`: Create new session `{ classId, date, title, sessionCode? }` (Faculty or Admin).
- `POST /sessions/:sessionId/records`: Mark attendance `{ studentId, status: 'present'|'absent'|'late' }`. Computes HMAC-SHA-256 signature. Prevents duplicates per session and student.
- `PATCH /records/:recordId`: Authorized correction `{ status, reason }`. Re-computes HMAC signature and logs to audit trail.
- `GET /sessions/:sessionId/records`: View session attendance records (Instructor or Admin).
- `GET /my`: Student personal attendance breakdown with calculated attendance percentages.
- `POST /verify`: Run HMAC verification sweep across records. Identifies tampered records and triggers SOC alert.
- `POST /simulate-tampering`: Test action to alter record status without HMAC update.

### Projects & Spaces (`/api/v1/projects`)
- `GET /`: List projects where user is member or leader.
- `POST /`: Create project space `{ title, description, isPrivate }`.
- `GET /:id`: View project details and member roster. Enforces membership check to prevent IDOR.
- `POST /:id/members`: Invite student/faculty to project space `{ userEmailOrId, role }`. Enforces unique membership.
- `DELETE /:id/members/:targetUserId`: Remove member (Leader or Admin or self).

### Tasks (`/api/v1/tasks`)
- `GET /?projectId=...`: List project tasks. Enforces membership.
- `POST /`: Create task `{ projectId, title, description, priority, dueDate, assignedTo }`.
- `PATCH /:id`: Update task status (`todo`, `in_progress`, `review`, `completed`), priority, or assignee.

### Messages & Secure Chat (`/api/v1/messages`)
- `GET /?projectId=...`: Fetch persistent message history. Enforces project membership (IDOR prevention).
- `POST /`: Send message `{ projectId, content }`. Broadcasts in real-time to Socket.IO room `project:${projectId}`.

### Notifications (`/api/v1/notifications`)
- `GET /`: Retrieve authenticated user's notifications.
- `PATCH /:id/read`: Mark single notification as read.
- `POST /read-all`: Mark all notifications as read.

### Security Operations Center (`/api/v1/security`) — Admin Only
- `GET /stats`: Aggregated metrics (events by category, severity, unresolved count).
- `GET /events`: Security event feed with search, category, severity, and status filters.
- `PATCH /events/:id`: Update investigation status (`unreviewed`, `investigating`, `resolved`, `false_positive`) and analyst notes.
- `GET /scanners`: List imported OWASP ZAP and Burp Suite findings.
- `POST /scanners/zap`: Ingest OWASP ZAP JSON alert export.
- `POST /scanners/burp`: Ingest normalized Burp Suite issues export.
- `PATCH /scanners/:id`: Update finding remediation status (`open`, `in_remediation`, `verified_fixed`, `accepted_risk`).
- `POST /simulate-attack`: Test action triggering simulated attack (`brute_force`, `idor_attempt`, `nosql_probe`, `csrf_tamper`, `integrity_violation`).

### Audit Trail (`/api/v1/audit`) — Admin Only
- `GET /`: Query immutable audit records with filters for actor, action, resource type, and date.
