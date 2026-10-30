# SecureCampus Security Test Plan: OWASP ZAP & Burp Suite

This document establishes an authorized security testing procedure for SecureCampus in a local development or staging environment using **OWASP Zed Attack Proxy (ZAP)** and **PortSwigger Burp Suite Professional/Community**.

> **Important**: Testing must strictly be limited to your own deployed instance (`http://localhost:3000` or assigned staging container). Do not target external production infrastructure.

---

## 1. Test Objectives
1. Verify authentication, lockout mechanisms, and session rotation.
2. Confirm immunity against Cross-Site Request Forgery (CSRF).
3. Validate prevention of Broken Object Level Authorization (BOLA / IDOR).
4. Verify NoSQL operator injection neutralization.
5. Verify HMAC attendance tampering detection and SOC alerting.
6. Ingest scanner results into the SecureCampus Security Operations Center (`/admin/security`).

---

## 2. OWASP ZAP Assessment Workflow

### Step 1: Baseline Spidering & Context Definition
1. Open OWASP ZAP and configure proxy to `127.0.0.1:8080`.
2. Configure browser proxy or use ZAP built-in browser.
3. Define Context: `http://localhost:3000`.
4. Include in Context:
   - `http://localhost:3000/api/v1/.*`
   - `http://localhost:3000/.*`
5. Run the **ZAP Spider** against `http://localhost:3000` to enumerate endpoints.

### Step 2: Authentication & Session Configuration
1. Login with student persona: `maya.patel@student.campus.edu` / `Student@SecurePass2026!`.
2. Observe cookie `campus_session` (marked `HttpOnly`, `SameSite=Lax`).
3. Notice header `X-CSRF-Token` transmitted on POST/PATCH/DELETE calls.

### Step 3: Active Vulnerability Scan
Run targeted active scans on:
- `/api/v1/auth/login` (Brute force & credential stuffing rules)
- `/api/v1/classes` (SQL/NoSQL injection, Reflected XSS)
- `/api/v1/projects/:id` (IDOR / access control checks)
- `/api/v1/attendance/sessions/:sessionId/records` (Integrity & parameter tampering)

### Step 4: Exporting ZAP Report to SecureCampus SOC
1. In OWASP ZAP, go to **Report** > **Generate Report**.
2. Select **JSON Report** format.
3. Save the report file.
4. Log into SecureCampus as Administrator (`admin@campus.edu`).
5. Navigate to **Security Center (SOC)** in the sidebar (`/admin/security`).
6. Click **Import OWASP ZAP**.
7. Paste the JSON report and click **Parse & Import ZAP Alerts**.
8. Verify that findings are normalized with risk severity, confidence, attack vector, solution, and remediation tracker.

---

## 3. Burp Suite Assessment Workflow

### Step 1: Proxy Setup & Target Scope
1. Set Burp Proxy listener on `127.0.0.1:8080`.
2. Add `http://localhost:3000` to Target Scope.
3. Walk through all core workflows (Faculty marking attendance, Student viewing project chat).

### Step 2: BOLA / IDOR Verification via Burp Repeater
1. Intercept `GET /api/v1/classes/cls_se350/roster` using Maya's session.
2. Observe that Maya is enrolled only in `CS-401` and `CS-420`.
3. Send request: Expected response is `403 Forbidden` (`FORBIDDEN`).
4. Check the SecureCampus SOC: Observe that an `IDOR_STUDENT_ROSTER_DENIED` event was generated and logged in real-time.

### Step 3: Anti-CSRF Token Validation
1. Intercept state-changing request `POST /api/v1/classes`.
2. Remove or alter the `X-CSRF-Token` header.
3. Send request: Expected response is `403 Forbidden` (`CSRF_FAILED`).
4. Check the SecureCampus SOC: Notice `CSRF_VALIDATION_FAILED` security alert with source IP and user identity.

### Step 4: NoSQL Injection Probe
1. Intercept `POST /api/v1/auth/login`.
2. Replace body with: `{"email": {"$gt": ""}, "password": {"$gt": ""}}`.
3. Send request: Expected response is `400 Bad Request` or validation rejection by Zod.
4. Check the SecureCampus SOC: Confirm that query operator injections are stripped and neutralized.

### Step 5: Exporting Burp Issues to SecureCampus SOC
1. In Burp Target > Site map, right click target > **Issues** > **Export Issues** (or copy issue array).
2. In SecureCampus as Administrator, open **Security Center (SOC)**.
3. Click **Import Burp Suite**.
4. Paste the JSON findings and click **Parse & Import Burp Issues**.
5. Track remediation status (`Open`, `In Remediation`, `Verified Fixed`, `Accepted Risk`).
