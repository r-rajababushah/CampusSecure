## | Role | Email | Password |
## |---|---|---|
## | Teacher | `dr.chen@campus.edu` | `Faculty@SecurePass2026!` |
## | Teacher | `prof.davis@campus.edu` | `Faculty@SecurePass2026!` |
## | Student | `maya.patel@student.campus.edu` | `Student@SecurePass2026!` |
## | Student | `lucas.kim@student.campus.edu` | `Student@SecurePass2026!` |

# SecureCampus — Cybersecurity Hackathon Demo App

Student-Faculty Management Platform with an interactive **SECURITY ON / OFF Toggle** for live cybersecurity attack & defense demonstrations.

---

## 🛡️ Hackathon Security Mode (ON vs OFF)

The system features a centralized server-side flag `SECURITY_MODE` (default: **ON**) read per-request without restarting.
- **SECURITY ON (Protected)**: Full zero-trust security controls (CSP, parameterized SQL, Argon2/salted PBKDF2, HMAC digital seals, AES-256-GCM chat encryption, rate limits, account lockout, and strict server-side RBAC).
- **SECURITY OFF (Insecure Demo Mode)**: Demonstrates vulnerabilities on specific demo endpoints. Displays a persistent red warning banner:
  > **⚠️ INSECURE DEMO MODE - LOCAL ONLY ⚠️**

> **STRICT SAFETY RULE**: The application binds exclusively to `127.0.0.1` (localhost only). OFF mode must never be deployed on public networks.

---

## 🚀 How to Run Locally

### One-command setup and launch (macOS / Linux)
From the project directory, run:
```bash
./run.sh
```
The launcher checks for Node.js and Python, creates the backend virtual environment, installs missing frontend/backend packages, and starts both services on localhost. It reuses a healthy app already running on the expected ports. Press **Ctrl+C** to stop the services started by the launcher.

## Demo Accounts and Courses

The sign-in page offers two student and two teacher demo accounts. Select a card to sign in, or use these credentials:

| Role | Email | Password |
| --- | --- | --- |
| Teacher | `dr.chen@campus.edu` | `Faculty@SecurePass2026!` |
| Teacher | `prof.davis@campus.edu` | `Faculty@SecurePass2026!` |
| Student | `maya.patel@student.campus.edu` | `Student@SecurePass2026!` |
| Student | `lucas.kim@student.campus.edu` | `Student@SecurePass2026!` |

The demo includes five courses: Cybersecurity & Network Defense, Artificial Intelligence & Machine Learning, Business Management & Entrepreneurship, Computer Science & Software Design, and Data Science & Cloud Computing. Teachers can create dated attendance sessions from the Attendance page; each session is attached to the selected course.

### 1. Run with Docker Compose
```bash
docker-compose up --build
```
- Frontend: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- Backend: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Swagger Docs: [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)

### 2. Run Manually (Localhost)

**Backend:**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate      # Windows (or source venv/bin/activate on Linux/Mac)
pip install -r requirements.txt
python main.py              # Binds strictly to 127.0.0.1:8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev                 # Binds strictly to 127.0.0.1:5173
```

### 3. Resetting / Seeding Database
```bash
cd backend
python seed.py --reset
```
Or click the **"Reset & Re-seed DB"** button in the Security Center as an Administrator.

---

## 📋 Hackathon Demo Checklist Table

| Attack Vector | What to Show in OFF Mode (Insecure) | What Happens in ON Mode (Secure) | Verification / Alert |
| :--- | :--- | :--- | :--- |
| **1. Login SQLi** | Enter email: `admin@campus.edu' --`<br>Logs in as Admin **without password** via SQL concatenation bypass. | SQL concatenation blocked. Parameterized query requires valid salted password hash. | Returns `401 Unauthorized`. |
| **2. Stored XSS** | Post message or project description with `<img src=x onerror=alert(document.cookie)>`. Script executes and cookie is stolen (HttpOnly=False). | Input is HTML-escaped. Strict CSP (`default-src 'self'`) blocks inline script execution. | Script blocked by CSP; rendered as escaped text. |
| **3. Brute Force** | Submit 6+ failed password attempts. Attacker can attempt passwords infinitely with zero rate limits or lockout. | 5th failure triggers 15-minute account lockout (`HTTP 429 Account Locked`). | High-severity SOC event `ACCOUNT_LOCKED_BRUTE_FORCE_PROTECTION`. |
| **4. IDOR** | Log in as Student 1 (Maya). Change URL to `/api/v1/attendance/my-records?studentId=usr_stu_02`. Dumps Lucas Kim's full private attendance. | Student cannot inspect other students' records. Access denied (`HTTP 403 Forbidden`). | High-severity event `IDOR_ATTEMPT_BLOCKED` sent to Admin. |
| **5. Broken Access Control (RBAC)** | Log in as Student. Call Admin route `GET /api/v1/users/` or `POST /api/v1/users/`. Endpoint executes successfully. | Server-side role check rejects non-admin users with `HTTP 403 Forbidden`. | RBAC check blocks request immediately. |
| **6. Password Storage** | Inspect database or query raw credentials table. Passwords stored with fast, unsalted MD5 hashes (`md5$...`). | Passwords hashed using Argon2 / PBKDF2 (100,000 iterations + 16-byte cryptographic salt). | Rainbow table attacks impossible. |
| **7. Chat Confidentiality** | Inspect database `db.messages`. Chat messages stored in **plain text**; eavesdropper/DB admin can read sensitive API keys. | Chat messages encrypted using **AES-256-GCM** before database write (`ENC:AES-GCM:...`). | Raw storage contains only ciphertext & nonce. |
| **8. Attendance Tampering** | Click on attendance status and change "Absent" to "Present". Tampered record is accepted without any notice. | Re-calculates **HMAC-SHA-256 digital seal**. Signature mismatch flagged as `[TAMPERED RECORD]`. | Critical SOC alert sent to Admin with IP, time, user ID, and what changed. |
| **9. Security Headers & CSP** | Inspect HTTP response headers. No `Content-Security-Policy`. Trigger 500 error to reveal raw Python traceback. | Strict CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`. Errors are sanitized. | Generic `INTERNAL_ERROR` without stack traces. |
| **10. Session Cookie Flags** | Inspect browser cookies (`document.cookie`). `campus_session` lacks `HttpOnly` and can be read by JavaScript. | `campus_session` has `HttpOnly=True` and `SameSite=Lax`. Protected against script theft. | Inaccessible via `document.cookie`. |

---

## 🧪 Automated Test Suite

Run the full security test suite:
```bash
cd backend
python -m pytest tests/test_security_toggle.py -v
```
Verifies all 14 test cases across both ON and OFF modes.
