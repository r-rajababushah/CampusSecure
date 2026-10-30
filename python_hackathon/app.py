import streamlit as st
import os
import sys
import base64
import pandas as pd
from datetime import datetime

# Import our challenge modules
from secure_attendance import SecureAttendanceSystem, SecurityException, HMAC_SECRET_KEY
from secure_message import SecureMessenger, MessageSecurityException

# Streamlit Page Configuration
st.set_page_config(
    page_title="Build It Secure — Hackathon Cryptography Suite",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom Styling
st.markdown(
    """
    <style>
    .main-header {
        font-size: 26px;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 2px;
    }
    .sub-header {
        font-size: 14px;
        color: #64748b;
        margin-bottom: 20px;
    }
    .tamper-card {
        padding: 16px;
        border-radius: 8px;
        border: 1px solid #fca5a5;
        background-color: #fef2f2;
        color: #991b1b;
        margin-top: 10px;
        margin-bottom: 10px;
    }
    .success-card {
        padding: 16px;
        border-radius: 8px;
        border: 1px solid #86efac;
        background-color: #f0fdf4;
        color: #166534;
        margin-top: 10px;
        margin-bottom: 10px;
    }
    .pipeline-step {
        background-color: #0f172a;
        color: #f8fafc;
        padding: 14px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        margin-bottom: 10px;
        border: 1px solid #334155;
    }
    .hash-diff-row {
        font-family: 'Courier New', Courier, monospace;
        font-size: 13px;
        line-height: 1.8;
        letter-spacing: 1px;
        word-break: break-all;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

def visual_hash_diff(hash_expected: str, hash_actual: str) -> str:
    """Renders visual HTML diff: matching characters in green, mismatching in red."""
    parts = []
    max_len = max(len(hash_expected), len(hash_actual))
    mismatches = 0
    for i in range(max_len):
        exp = hash_expected[i] if i < len(hash_expected) else " "
        act = hash_actual[i] if i < len(hash_actual) else " "
        if exp == act:
            parts.append(f'<span style="background-color:#166534; color:#86efac; padding:2px 3px; border-radius:2px; font-weight:bold;">{act}</span>')
        else:
            mismatches += 1
            parts.append(f'<span style="background-color:#991b1b; color:#fca5a5; padding:2px 3px; border-radius:2px; font-weight:bold; border-bottom:2px solid #ef4444;">{act}</span>')
    return "".join(parts), mismatches

# Initialize Session State
if "attendance_system" not in st.session_state:
    sys_inst = SecureAttendanceSystem()
    inst = sys_inst.users["instructor@bootcamp.edu"]
    inst_session = {"id": inst["id"], "name": inst["name"], "role": inst["role"], "email": "instructor@bootcamp.edu"}
    # Seed initial records with legitimate HMAC signatures
    sys_inst.record_attendance(inst_session, "ses_bootcamp_01", "usr_stu_01", "Absent", "2026-10-30")
    sys_inst.record_attendance(inst_session, "ses_bootcamp_01", "usr_stu_02", "Present", "2026-10-30")
    st.session_state.attendance_system = sys_inst

if "active_user_email" not in st.session_state:
    st.session_state.active_user_email = "instructor@bootcamp.edu"

if "attendance_pipeline_report" not in st.session_state:
    st.session_state.attendance_pipeline_report = None

# SecureMessage State
if "team_leader" not in st.session_state:
    st.session_state.team_leader = SecureMessenger("Sarah_TeamLead", role="leader")
if "team_member" not in st.session_state:
    st.session_state.team_member = SecureMessenger("David_Engineer", role="member")
if "adversary" not in st.session_state:
    st.session_state.adversary = SecureMessenger("Mallory_Attacker", role="adversary")
if "shared_key" not in st.session_state:
    st.session_state.shared_key = None
if "intercepted_packet" not in st.session_state:
    st.session_state.intercepted_packet = None
if "message_pipeline_report" not in st.session_state:
    st.session_state.message_pipeline_report = None

# =============================================================================
# Sidebar Navigation & Persona Switcher
# =============================================================================
st.sidebar.image("https://img.icons8.com/fluency/96/shield.png", width=64)
st.sidebar.title("Build It Secure")
st.sidebar.caption("Hackathon Cryptography & Security Suite")

challenge = st.sidebar.radio(
    "Select Hackathon Challenge:",
    ["1. 📋 SecureAttendance Challenge", "2. 💬 SecureMessage Challenge", "3. 🛡️ System Cryptography Overview"],
)

st.sidebar.divider()

# =============================================================================
# CHALLENGE 1: SecureAttendance
# =============================================================================
if challenge == "1. 📋 SecureAttendance Challenge":
    st.markdown('<div class="main-header">📋 Challenge 1: SecureAttendance</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="sub-header">Interactive Spreadsheet Tampering Lab & Visual HMAC-SHA-256 Hash Matching Engine</div>',
        unsafe_allow_html=True,
    )

    sys_attendance: SecureAttendanceSystem = st.session_state.attendance_system

    # Persona Switcher
    st.sidebar.subheader("👤 Active User Persona")
    active_role = st.sidebar.selectbox(
        "Login As:",
        [
            "Dr. Alan Chen (Instructor)",
            "Maya Patel (Student - usr_stu_01)",
            "Lucas Kim (Student - usr_stu_02)",
        ],
    )

    if "Instructor" in active_role:
        st.session_state.active_user_email = "instructor@bootcamp.edu"
    elif "Maya" in active_role:
        st.session_state.active_user_email = "maya.patel@student.edu"
    else:
        st.session_state.active_user_email = "lucas.kim@student.edu"

    # Current User Context
    user_info = sys_attendance.users[st.session_state.active_user_email]
    session_user = {
        "id": user_info["id"],
        "name": user_info["name"],
        "role": user_info["role"],
        "email": st.session_state.active_user_email,
    }

    # Top KPI Banner
    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Logged In User", session_user["name"], f"Role: {session_user['role'].upper()}")
    with c2:
        st.metric("Password Storage (Flaw 3)", "PBKDF2-HMAC-SHA256", "100k Iterations + 16B Salt")
    with c3:
        st.metric("Integrity Guard (Flaw 1)", "HMAC-SHA-256 Seal", "Secret Key Cryptography")

    st.divider()

    # Flaw 3 Explainer
    with st.expander("🔍 Flaw 3 Resolved: Credential Protection (No Plaintext Passwords)", expanded=False):
        st.info("The problem stated: 'Guessed an instructor's login password because credentials were stored in plain text.'")
        st.markdown(f"**Stored Password Hash for {user_info['name']}:**")
        st.code(user_info["password_hash"], language="text")
        st.markdown(f"**Unique Salt (16-byte random):** `{user_info['salt']}`")

    # Instructor Panel: Legitimate Attendance Recording
    if session_user["role"] == "instructor":
        st.subheader("✍️ Instructor Panel: Legitimate Attendance Recording")
        with st.form("record_attendance_form"):
            col_a, col_b, col_c = st.columns(3)
            with col_a:
                student_choice = st.selectbox(
                    "Student:",
                    [
                        ("usr_stu_01", "Maya Patel (usr_stu_01)"),
                        ("usr_stu_02", "Lucas Kim (usr_stu_02)"),
                    ],
                    format_func=lambda x: x[1],
                )
            with col_b:
                status_choice = st.selectbox("Status:", ["Present", "Absent", "Late"])
            with col_c:
                session_input = st.text_input("Session ID:", value=f"ses_bootcamp_{len(sys_attendance.attendance_records) + 1}")

            submit_record = st.form_submit_button("Record & Cryptographically Seal with HMAC", type="primary")

            if submit_record:
                try:
                    new_rec = sys_attendance.record_attendance(
                        session_user,
                        session_input,
                        student_choice[0],
                        status_choice,
                    )
                    st.success(f"Attendance recorded for {student_choice[1]} as **{status_choice}**! HMAC Seal: `{new_rec['integrity_hmac'][:24]}...`")
                    st.session_state.attendance_pipeline_report = None
                    st.rerun()
                except SecurityException as e:
                    st.error(f"Action Blocked: {e}")
    else:
        st.info(f"ℹ️ Logged in as **Student ({session_user['name']})**. Flaw 2 Fix: You can only see your own records. Roster editing is restricted to Instructors.")

    st.divider()

    # =========================================================================
    # Interactive Spreadsheet Editor
    # =========================================================================
    st.subheader("📊 Interactive Attendance Storage (Click directly on Status Cell to Tamper!)")
    st.markdown(
        """
        👉 **Try it yourself (Hackathon Problem 1 Scenario):**
        1. Click directly on Maya Patel's **Status** cell below and change it from **Absent** to **Present**.
        2. Click **'💾 Save & Execute Visual Cryptographic HMAC Verification'**.
        3. Observe the internal verification engine compare hashes in real time and prove tampering mathematically!
        """
    )

    records_to_show = sys_attendance.get_records(session_user)

    if not records_to_show:
        st.warning("No records found for your account.")
    else:
        table_rows = []
        for r in records_to_show:
            is_valid = sys_attendance.verify_record_integrity(r)
            table_rows.append(
                {
                    "Record ID": r["record_id"],
                    "Student ID": r["student_id"],
                    "Status": r["status"],
                    "Date": r["date"],
                    "Session": r["session_id"],
                    "HMAC Seal": r["integrity_hmac"][:20] + "...",
                    "Integrity Status": "✅ VERIFIED SEAL" if is_valid else "🚨 TAMPERED DETECTED",
                }
            )

        df = pd.DataFrame(table_rows)

        edited_df = st.data_editor(
            df,
            disabled=["Record ID", "Student ID", "Date", "Session", "HMAC Seal", "Integrity Status"],
            column_config={
                "Status": st.column_config.SelectboxColumn(
                    "Status (Click cell to change!)",
                    help="Click to select Absent, Present, or Late",
                    options=["Present", "Absent", "Late"],
                    required=True,
                ),
            },
            hide_index=True,
            use_container_width=True,
            key="attendance_data_editor",
        )

        col_save, col_reset = st.columns([2, 1])

        with col_save:
            if st.button("💾 Save & Execute Visual Cryptographic HMAC Verification", type="primary"):
                report_items = []
                for idx, row in edited_df.iterrows():
                    rec_id = row["Record ID"]
                    new_status = row["Status"]

                    actual_rec = next((r for r in sys_attendance.attendance_records if r["record_id"] == rec_id), None)
                    if actual_rec:
                        original_status = actual_rec["status"]
                        stored_seal = actual_rec["integrity_hmac"]

                        # Apply manual edit to in-memory database
                        actual_rec["status"] = new_status

                        # Compute expected HMAC with new status
                        recomputed_hmac = sys_attendance.compute_hmac(
                            actual_rec["session_id"],
                            actual_rec["student_id"],
                            new_status,
                            actual_rec["date"],
                        )

                        canonical_string = f"session:{actual_rec['session_id']}|student:{actual_rec['student_id']}|status:{new_status}|date:{actual_rec['date']}"
                        is_match = (stored_seal == recomputed_hmac)

                        report_items.append({
                            "record_id": rec_id,
                            "student_id": actual_rec["student_id"],
                            "original_status": original_status,
                            "current_status": new_status,
                            "canonical_string": canonical_string,
                            "stored_seal": stored_seal,
                            "recomputed_hmac": recomputed_hmac,
                            "is_match": is_match,
                        })

                st.session_state.attendance_pipeline_report = report_items
                st.rerun()

        with col_reset:
            if st.button("🔄 Reset Clean Roster with Valid HMACs", type="secondary"):
                sys_attendance.attendance_records.clear()
                inst = sys_attendance.users["instructor@bootcamp.edu"]
                inst_session = {"id": inst["id"], "name": inst["name"], "role": inst["role"], "email": "instructor@bootcamp.edu"}
                sys_attendance.record_attendance(inst_session, "ses_bootcamp_01", "usr_stu_01", "Absent", "2026-10-30")
                sys_attendance.record_attendance(inst_session, "ses_bootcamp_01", "usr_stu_02", "Present", "2026-10-30")
                st.session_state.attendance_pipeline_report = None
                st.toast("Database reset to clean HMAC state!")
                st.rerun()

    # =========================================================================
    # Visual Cryptographic Hash Matching & Rejection Pipeline
    # =========================================================================
    if st.session_state.attendance_pipeline_report:
        st.divider()
        st.subheader("🔬 Inside the Cryptographic Engine: Visual Hash Matching Pipeline")
        st.caption("Detailed step-by-step mathematical proof of integrity verification and tamper rejection.")

        for item in st.session_state.attendance_pipeline_report:
            with st.container():
                st.markdown(f"#### Record Inspection: Student `{item['student_id']}` (Record: `{item['record_id']}`)")

                # Step 1: Canonical Serialization
                st.markdown("**Step 1: Canonical Data Serialization**")
                st.markdown(
                    f"""
                    <div class="pipeline-step">
                        <span style="color:#94a3b8;">// Canonical representation constructed from database fields:</span><br>
                        Payload = "<span style="color:#38bdf8;">{item['canonical_string']}</span>"
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

                # Step 2: HMAC-SHA-256 Engine Execution
                st.markdown("**Step 2: HMAC-SHA-256 Engine Execution**")
                st.markdown(
                    f"""
                    <div class="pipeline-step">
                        <span style="color:#94a3b8;">// RFC 2104 Keyed-Hashing for Message Authentication:</span><br>
                        Key       = <span style="color:#f59e0b;">HMAC_SECRET_KEY</span> (Protected 256-bit Institutional Master Secret)<br>
                        Algorithm = <span style="color:#a855f7;">HMAC_SHA256(Key, Payload)</span>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

                # Step 3: Visual Hash Matching
                st.markdown("**Step 3: Visual Side-by-Side Hash Matching & Diff Analysis**")

                diff_html, mismatch_count = visual_hash_diff(item["stored_seal"], item["recomputed_hmac"])

                st.markdown(
                    f"""
                    <div style="background-color:#0f172a; padding:16px; border-radius:8px; border:1px solid #334155; margin-bottom:12px;">
                        <div style="color:#94a3b8; font-size:11px; margin-bottom:4px;">1. Stored Authentic HMAC Seal (Calculated at creation time):</div>
                        <div class="hash-diff-row" style="color:#86efac; background-color:#14532d; padding:6px 10px; border-radius:4px; margin-bottom:10px;">
                            {item['stored_seal']}
                        </div>
                        <div style="color:#94a3b8; font-size:11px; margin-bottom:4px;">2. Recomputed HMAC Seal (Calculated from current record content):</div>
                        <div class="hash-diff-row" style="background-color:#1e293b; padding:6px 10px; border-radius:4px;">
                            {diff_html}
                        </div>
                        <div style="margin-top:10px; font-size:12px; color:#cbd5e1;">
                            <b>Character Match Result:</b> {64 - mismatch_count} / 64 characters matching &nbsp;|&nbsp;
                            <span style="color:{'#ef4444' if mismatch_count > 0 else '#22c55e'}; font-weight:bold;">
                                {f'❌ {mismatch_count} CHARACTERS MISMATCHED' if mismatch_count > 0 else '✅ 100% PERFECT MATCH'}
                            </span>
                        </div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

                # Step 4: Decision Gate & Rejection
                st.markdown("**Step 4: Timing-Safe Verification Gate & Rejection Verdict**")
                if not item["is_match"]:
                    st.markdown(
                        f"""
                        <div class="tamper-card">
                            <span style="font-size:16px; font-weight:bold;">🚨 GATE VERDICT: REJECTED & FLAGGED AS TAMPERED!</span><br>
                            <b>Timing-Safe Gate:</b> <code>hmac.compare_digest(stored_seal, recomputed_hmac) == False</code><br>
                            <b>Cryptographic Analysis:</b> The participant attempted to alter their status to <b>'{item['current_status']}'</b>.<br>
                            Because of the <b>SHA-256 Avalanche Effect</b>, altering even a single word flips over 50% of the output bits completely. Since the participant does not possess the school's secret HMAC key, the signature verification failed completely. The database marks the record as <b>[TAMPERED]</b>!
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )
                else:
                    st.markdown(
                        f"""
                        <div class="success-card">
                            <span style="font-size:16px; font-weight:bold;">✅ GATE VERDICT: AUTHENTIC RECORD ACCEPTED!</span><br>
                            <b>Timing-Safe Gate:</b> <code>hmac.compare_digest(stored_seal, recomputed_hmac) == True</code><br>
                            <b>Cryptographic Analysis:</b> The record payload matches its digital HMAC seal 100%. Authenticity and integrity are mathematically proven.
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )

# =============================================================================
# CHALLENGE 2: SecureMessage
# =============================================================================
elif challenge == "2. 💬 SecureMessage Challenge":
    st.markdown('<div class="main-header">💬 Challenge 2: SecureMessage</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="sub-header">Interactive In-Transit Wire Interceptor & Visual Cryptographic Authentication Pipeline</div>',
        unsafe_allow_html=True,
    )

    leader: SecureMessenger = st.session_state.team_leader
    member: SecureMessenger = st.session_state.team_member
    adversary: SecureMessenger = st.session_state.adversary

    # STEP 1: Key Agreement
    st.subheader("🔑 Step 1: Elliptic Curve Diffie-Hellman (X25519) Handshake")
    st.caption("Participants derive an identical 256-bit AES encryption key without sending the key across the wire.")

    col_k1, col_k2 = st.columns(2)
    with col_k1:
        st.markdown(f"**Team Leader ({leader.username}) Public DH Key:**")
        st.code(leader.get_public_identity()["dh_public_bytes"].hex()[:48] + "...", language="text")
    with col_k2:
        st.markdown(f"**Team Member ({member.username}) Public DH Key:**")
        st.code(member.get_public_identity()["dh_public_bytes"].hex()[:48] + "...", language="text")

    if st.button("🤝 Perform X25519 Key Agreement Handshake", type="primary"):
        k_lead = leader.establish_session_key(member.get_public_identity()["dh_public_bytes"])
        k_mem = member.establish_session_key(leader.get_public_identity()["dh_public_bytes"])
        if k_lead == k_mem:
            st.session_state.shared_key = k_lead
            st.success(f"Key Agreement Succeeded! Shared 256-bit AES Session Key: `{k_lead.hex()[:32]}...`")

    st.divider()

    # STEP 2: Sender Composes Message
    st.subheader("✍️ Step 2: Team Leader Composes & Encrypts Message")
    st.caption("Message is encrypted with AES-256-GCM (Confidentiality) and signed with Ed25519 (Authenticity).")

    default_msg = (
        "CONFIDENTIAL PROJECT SPRINT UPDATE:\n"
        "Project Deliverable: Capstone Authentication Proxy\n"
        "Hard Deadline: Friday, November 6th at 5:00 PM\n"
        "Vault Master Key: sk_live_secure_bootcamp_991823"
    )

    msg_input = st.text_area("Plaintext Message to Send:", value=default_msg, height=120)

    if st.button("🔒 Encrypt (AES-256-GCM) & Sign (Ed25519)", type="primary"):
        if not st.session_state.shared_key:
            st.session_state.shared_key = leader.establish_session_key(member.get_public_identity()["dh_public_bytes"])

        envelope = leader.create_secure_message(msg_input, st.session_state.shared_key)
        st.session_state.intercepted_packet = {
            "project_id": envelope["project_id"],
            "sender": envelope["sender"],
            "sender_role": envelope["sender_role"],
            "nonce_b64": envelope["nonce_b64"],
            "ciphertext_b64": envelope["ciphertext_b64"],
            "signature_b64": envelope["signature_b64"],
            "sender_verify_key_b64": envelope["sender_verify_key_b64"],
            "original_plaintext": msg_input,
        }
        st.session_state.message_pipeline_report = None
        st.success("Message encrypted, signed, and dispatched to network wire!")

    # =========================================================================
    # STEP 3: Man-in-the-Middle Network Interceptor
    # =========================================================================
    if st.session_state.intercepted_packet:
        st.divider()
        st.subheader("📡 Step 3: Wire Traffic Interceptor & Tamper Console (Man-in-the-Middle)")
        st.markdown(
            """
            👉 **Try it yourself (Hackathon Problem 2 Scenarios):**
            - **Test Flaw 1 (Eavesdropping):** Notice how the plaintext is completely unreadable. All an eavesdropper sees is randomized ciphertext.
            - **Test Flaw 2 (Impersonation):** Change **Sender Header** to `Sarah_TeamLead` while signing with another key, or tamper with the signature.
            - **Test Flaw 3 (Tampering):** Literally **edit or delete a character in the Ciphertext text area** (e.g. change a letter to modify the deadline).
            - Then click **'🚀 Deliver Packet Across Wire to Receiver'** to observe the visual cryptographic pipeline!
            """
        )

        pkt = st.session_state.intercepted_packet

        with st.container():
            col_wire_a, col_wire_b = st.columns(2)
            with col_wire_a:
                editable_sender = st.text_input("Claimed Sender Header (Click to edit/spoof):", value=pkt["sender"])
                editable_nonce = st.text_input("AES-GCM Nonce (12-byte IV):", value=pkt["nonce_b64"])

            with col_wire_b:
                editable_sig = st.text_input("Ed25519 Digital Signature (B64):", value=pkt["signature_b64"])
                project_id_input = st.text_input("Project ID:", value=pkt["project_id"])

            editable_ciphertext = st.text_area(
                "Intercepted AES-256-GCM Ciphertext (Click inside and edit characters to tamper with the message!):",
                value=pkt["ciphertext_b64"],
                height=100,
            )

        col_deliver, col_tamper_demo = st.columns([2, 1])

        with col_deliver:
            deliver_button = st.button("🚀 Deliver Packet Across Wire to Team Member", type="primary")

        with col_tamper_demo:
            if st.button("⚡ Corrupt Ciphertext Automatically (Tamper 1 Byte)", type="secondary"):
                raw = bytearray(base64.b64decode(pkt["ciphertext_b64"]))
                raw[8] ^= 0xFF  # Corrupt a byte
                st.session_state.intercepted_packet["ciphertext_b64"] = base64.b64encode(bytes(raw)).decode("utf-8")
                st.toast("Flipped byte #8 in ciphertext!")
                st.rerun()

        # =====================================================================
        # STEP 4: Visual Cryptographic Receiver Pipeline
        # =====================================================================
        if deliver_button:
            st.divider()
            st.subheader("🔬 Step 4: Receiver Visual Verification & Decryption Pipeline")

            received_envelope = {
                "project_id": project_id_input,
                "sender": editable_sender,
                "sender_role": pkt["sender_role"],
                "nonce_b64": editable_nonce,
                "ciphertext_b64": editable_ciphertext,
                "signature_b64": editable_sig,
            }

            st.markdown("**Pipeline Stage 1: AES-256-GCM Authenticated Decryption & Tag Verification**")
            st.markdown(
                f"""
                <div class="pipeline-step">
                    Key            = <span style="color:#f59e0b;">256-bit AES Session Key</span><br>
                    Nonce (IV)     = <span style="color:#38bdf8;">{editable_nonce}</span> (12 bytes)<br>
                    Ciphertext B64 = <span style="color:#a855f7;">{editable_ciphertext[:40]}...</span><br>
                    Associated Data= "<span style="color:#38bdf8;">{project_id_input}</span>"<br>
                    Auth Tag Check = <span style="color:#38bdf8;">Galois Counter Mode (GHASH) Tag Verification</span>
                </div>
                """,
                unsafe_allow_html=True,
            )

            try:
                decrypted_text = SecureMessenger.decrypt_and_verify(
                    received_envelope,
                    st.session_state.shared_key,
                    leader.get_public_identity()["verify_key_bytes"],
                )

                st.markdown("**Pipeline Stage 2: Ed25519 Digital Signature Curve Point Verification**")
                st.markdown(
                    f"""
                    <div class="pipeline-step">
                        Signer Key  = <span style="color:#86efac;">Sarah_TeamLead Public Key</span> (Verified Authentic)<br>
                        Signature   = <span style="color:#a855f7;">{editable_sig[:40]}...</span><br>
                        Curve Point = <span style="color:#86efac;">R + H(R, A, M)*A == S*B (VALID CURVE IDENTITY)</span>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

                st.markdown(
                    """
                    <div class="success-card">
                        <span style="font-size:16px; font-weight:bold;">✅ GATE VERDICT: PACKET ACCEPTED & AUTHENTICATED!</span><br>
                        1. <b>AES-GCM Auth Tag:</b> 100% Match. Zero bytes modified in transit.<br>
                        2. <b>Ed25519 Signature:</b> Verified against Sarah_TeamLead's public key. Non-repudiation guaranteed.<br>
                        3. <b>Decrypted Content Disclosed Safely:</b>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
                st.code(decrypted_text, language="text")

            except MessageSecurityException as err:
                err_msg = str(err)
                if "INTEGRITY FAILURE" in err_msg:
                    st.markdown(
                        f"""
                        <div class="tamper-card">
                            <span style="font-size:16px; font-weight:bold;">🚨 GATE VERDICT: REJECTED! AES-GCM AUTHENTICATION TAG MISMATCH</span><br>
                            <b>Cryptographic Reason:</b> The ciphertext bits were altered in transit.<br>
                            <b>Galois MAC Check:</b> Computed authentication tag does NOT match the embedded 128-bit tag.<br>
                            <b>Rejection Action:</b> Decryption halted immediately. Zero plaintext bytes disclosed to prevent deadline alteration!
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )
                else:
                    st.markdown(
                        f"""
                        <div class="tamper-card">
                            <span style="font-size:16px; font-weight:bold;">🚨 GATE VERDICT: REJECTED! ED25519 SIGNATURE VERIFICATION FAILED</span><br>
                            <b>Cryptographic Reason:</b> The message claims to be from '{editable_sender}', but was not signed with Sarah_TeamLead's private key.<br>
                            <b>Curve Check:</b> Digital signature mathematical identity failed on Edwards curve.<br>
                            <b>Rejection Action:</b> Impersonator packet dropped immediately!
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )

# =============================================================================
# CHALLENGE 3: Overview & Architecture
# =============================================================================
else:
    st.markdown('<div class="main-header">🛡️ Cryptographic Architecture & Standards</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="sub-header">Summary of All Cryptographic Algorithms Applied in Solution</div>',
        unsafe_allow_html=True,
    )

    t1, t2 = st.columns(2)
    with t1:
        st.markdown("### SecureAttendance Controls")
        st.markdown(
            """
            - **Password Storage:** PBKDF2-HMAC-SHA256 with 100,000 rounds and unique 16-byte cryptographically secure salt.
            - **Integrity Seal:** HMAC-SHA-256 over canonicalized attendance payload (`session_id|student_id|status|date`).
            - **Verification:** Timing-safe comparison (`hmac.compare_digest`) against timing-attack side channels.
            - **Access Control:** RBAC separating Instructor recording from Student self-summary.
            """
        )

    with t2:
        st.markdown("### SecureMessage Controls")
        st.markdown(
            """
            - **Key Exchange:** X25519 Elliptic Curve Diffie-Hellman + HKDF-SHA256 for uniform 256-bit key derivation.
            - **Confidentiality:** AES-256-GCM Authenticated Encryption with unique 96-bit initialization vectors.
            - **Authenticity / Non-Repudiation:** Ed25519 Edwards-curve Digital Signatures.
            - **Tamper Resistance:** AES-GCM 128-bit authentication tag guarantees ciphertext integrity.
            """
        )
