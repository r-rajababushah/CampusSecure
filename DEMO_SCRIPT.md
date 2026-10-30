# SecureCampus Evaluation & Demonstration Script

This walkthrough guides evaluators and security assessors through every core module and security control implemented in SecureCampus.

---

## Stage 1: Faculty Attendance & Cryptographic HMAC Signing

1. Open the application on `http://localhost:3000`.
2. On the login screen, click **Faculty: Prof. Alan Chen** (or use `dr.chen@campus.edu` / `Faculty@SecurePass2026!`).
3. In the sidebar, select **Attendance & HMAC**.
4. Notice course selector set to **CS-401: Network Security & Penetration Testing**.
5. Click **New Session**:
   - Title: `Lecture 14: Automated Scanners & Defenses`
   - Date: Select today's date.
   - Click **Initialize Session**.
6. In the student roster table:
   - For **Maya Patel**: Click **Present**.
   - Notice the feedback toast showing HMAC signature generated via SHA-256 canonical string hashing.
   - For **Lucas Kim**: Click **Late**.
   - For **Sarah Jenkins**: Click **Absent**.
7. **Authorized Correction Workflow**:
   - On Sarah Jenkins' row, click **Correct**.
   - Select New Status: **Present**.
   - Enter Mandatory Reason: `Presented valid medical dispensary verification slip.`
   - Click **Save & Recompute HMAC**.
   - Notice the correction note attached to the record and new HMAC computed.

---

## Stage 2: Student Attendance % & Real-Time Project Collaboration

1. In the top navbar, click the **Persona Switcher** dropdown and select **Student (Maya Patel)** (or log in as `maya.patel@student.campus.edu`).
2. Go to **Attendance & HMAC**:
   - Observe Maya's overall attendance percentage calculated across her enrolled courses.
   - Expand **CS-401** to view the individual session records, timestamps, and verifiable HMAC signatures.
3. In the sidebar, select **Projects & Secure Chat**:
   - Select project space **Zero-Trust Campus Auth Proxy**.
   - Switch to the **Tasks** tab:
     - Click **Add Task**: Title `Review OWASP ZAP baseline scan results`, Priority `High`, Assigned To `Lucas Kim`.
     - Click **Create Task**.
   - Switch to the **Secure Chat** tab:
     - Type a message in the chat input: `Hey team, task assigned. The HMAC verification endpoint passed inspection.`
     - Click the send button.
     - Observe real-time Socket.IO message persistence with sender name and timestamp.
   - Switch to the **Team Members** tab:
     - Notice enrolled members (Maya Patel, Lucas Kim) and permissions.

---

## Stage 3: IDOR & BOLA Defense Demonstration

1. Still logged in as student **Maya Patel**, navigate to **Courses & Rosters** in the sidebar.
2. In the course list, find **SE-350: Full-Stack Software Architecture** (Maya is NOT enrolled; only Lucas and Sarah are).
3. Click **SE-350**:
   - Notice that the backend strictly returns **403 Forbidden** (`FORBIDDEN`).
   - The UI displays an explicit security banner: **Access Denied (RBAC / IDOR Protection)**.
   - The server simultaneously registers a high-severity `IDOR_STUDENT_ROSTER_DENIED` security event in the SOC database with Maya's user identity, IP address, and request correlation ID.

---

## Stage 4: Cryptographic Tampering Simulation & Detection

1. Switch back to **Faculty (Prof. Alan Chen)** using the top persona switcher.
2. Navigate to **Attendance & HMAC**.
3. Click the yellow button: **Simulate DB Tamper (Demo)**:
   - This intentionally alters an attendance status directly in storage without recomputing the HMAC signature, simulating a privileged database intruder or unauthorized modification.
4. Now click **Verify HMAC Integrity**:
   - The server iterates through every attendance record, reconstructs canonical strings, and tests HMAC signatures.
   - The tamper detection fires immediately:
     - **CRITICAL ALERT: Tampering detected on 1 record(s)**.
     - The corrupted record displays a prominent red warning: `HMAC Signature Mismatch!`.
     - A Critical Security Event `ATTENDANCE_TAMPER_DETECTED` is emitted to the Admin SOC via Socket.IO.

---

## Stage 5: Security Operations Center (SOC) & Scanner Ingestion

1. In the top navbar, switch persona to **Administrator (Dr. Sarah Connor)** (`admin@campus.edu`).
2. In the sidebar, click **Security Center (SOC)** (`/admin/security`):
3. **Overview Analytics**:
   - Review KPI metrics for Total Events, Real Application Events vs Simulated Probes, Unreviewed Incidents, and Blocked Requests.
4. **Live Event Feed**:
   - Observe real-time events logged from the earlier IDOR attempt (`IDOR_STUDENT_ROSTER_DENIED`) and the HMAC tampering event (`ATTENDANCE_TAMPER_DETECTED`).
   - Click on the tampering event row to open the **Incident Investigation Drawer**:
     - Inspect sanitized telemetry: Correlation ID, Target Endpoint, Outcome, and Actor.
     - Change status from `Unreviewed` to `Investigating` or `Resolved`.
     - Add analyst notes: `Verified deliberate tampering simulation in staging test. Threat isolated.`
     - Click **Save Analyst Notes**.
5. **Interactive Attack Bench**:
   - Click the **Interactive Attack Simulator** tab.
   - Click **Simulate Brute Force Attack**, **Simulate NoSQL Query Injection**, or **Simulate BOLA / IDOR Attempt**.
   - Switch back to the **Live Event Feed** and watch the events appear live via Socket.IO with explicit `[SIMULATED DEMO]` badges!
6. **Vulnerability Scanner Register**:
   - Click the **Vulnerability Scanners** tab.
   - Click **Import OWASP ZAP** -> Click **Parse & Import ZAP Alerts**.
   - Notice the parsed findings, risk ratings, attack vectors, and solutions.
   - Change a finding's status from `Open Finding` to `Verified Fixed`.
7. **Audit Trail**:
   - In the sidebar, click **Audit Trail**.
   - Inspect the immutable log containing every login, user modification, attendance correction reason, and correlation ID.
