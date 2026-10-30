# Build It Secure — Hackathon Cryptography Suite

This subfolder contains the standalone Python solutions and interactive Streamlit UI for both Hackathon challenges:
1. **SecureAttendance** (Access control, password hashing, and HMAC integrity seals)
2. **SecureMessage** (X25519 key exchange, AES-256-GCM encryption, Ed25519 digital signatures, and tamper detection)

---

## Quick Start: Launch the Streamlit Web UI

Make sure dependencies are installed:
```bash
pip install -r requirements.txt
```

Run the Streamlit application:
```bash
cd python_hackathon
streamlit run app.py
```
Or from the project root:
```bash
streamlit run python_hackathon/app.py
```

---

## Running the Standalone CLI Scripts

### 1. SecureAttendance Verification
```bash
python secure_attendance.py
```
- Tests password hashing (PBKDF2-HMAC-SHA256).
- Tests role-based access control (Students cannot mark attendance).
- Tests privacy protection (Students cannot read records of other students).
- Tests tamper detection (Modifying "Absent" to "Present" is immediately caught by HMAC verification).

### 2. SecureMessage Verification
```bash
python secure_message.py
```
- Tests Elliptic Curve Diffie-Hellman (X25519) key exchange.
- Tests AES-256-GCM authenticated encryption.
- Tests Ed25519 digital signatures for author verification.
- Tests impersonation prevention (fake team leader update rejected).
- Tests in-transit tampering detection (altered project deadlines caught by AES-GCM Auth Tag).
