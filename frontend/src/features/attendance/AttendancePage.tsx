import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { apiRequest } from '../../lib/api.js';
import { useSecurityProcess } from '../../hooks/useSecurityProcess.js';
import { SecurityProcessModal } from '../../components/security/SecurityProcessModal.js';
import { ClassItem, AttendanceSession, AttendanceRecord } from '../../types/index.js';
import {
  CalendarCheck,
  ShieldCheck,
  ShieldAlert,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  Edit3,
  X,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const securityProcess = useSecurityProcess();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [sessionRecords, setSessionRecords] = useState<AttendanceRecord[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [studentSummary, setStudentSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // New session modal
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [sessionTitle, setSessionTitle] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [createSessionError, setCreateSessionError] = useState<string | null>(null);

  // Correction modal
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<'present' | 'absent' | 'late'>('present');
  const [correctionReason, setCorrectionReason] = useState('');

  // Integrity verification result
  const [integrityResult, setIntegrityResult] = useState<any>(null);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        if (user?.role === 'student') {
          const myData = await apiRequest('/api/v1/attendance/my-records');
          setStudentSummary(myData);
        } else {
          const clsList = await apiRequest<ClassItem[]>('/api/v1/classes');
          setClasses(clsList || []);
          if (clsList && clsList.length > 0) {
            setSelectedClassId(clsList[0]._id);
            await loadClassSessions(clsList[0]._id);
          }
        }
      } catch (err: any) {
        console.error('Failed to init attendance:', err);
        setFeedback({ message: err.message || 'Attendance could not be loaded. Check your account role and course enrollment.', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user]);

  const loadClassSessions = async (classId: string) => {
    try {
      const sess = await apiRequest<AttendanceSession[]>(`/api/v1/attendance/sessions?classId=${classId}`);
      setSessions(sess || []);

      // Fetch student roster supporting both endpoints and formats
      try {
        const ros = await apiRequest<any>(`/api/v1/classes/${classId}/students`);
        const studentList = Array.isArray(ros) ? ros : (ros?.students || ros?.data || []);
        setRoster(studentList);
      } catch (e) {
        const fallbackRos = await apiRequest<any>(`/api/v1/classes/${classId}/roster`);
        const fallbackList = Array.isArray(fallbackRos) ? fallbackRos : (fallbackRos?.students || fallbackRos?.data || []);
        setRoster(fallbackList);
      }

      if (sess && sess.length > 0) {
        await handleSelectSession(sess[0]);
      } else {
        setSelectedSession(null);
        setSessionRecords([]);
      }
    } catch (err: any) {
      console.error('Failed to load class sessions:', err);
    }
  };

  const handleSelectSession = async (session: AttendanceSession) => {
    setSelectedSession(session);
    try {
      const records = await apiRequest<AttendanceRecord[]>(`/api/v1/attendance/sessions/${session._id}/records`);
      setSessionRecords(records || []);
    } catch (err: any) {
      console.error('Failed to load records:', err);
    }
  };

  const handleClassChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    setSelectedClassId(classId);
    await loadClassSessions(classId);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = sessionTitle.trim();
    if (!selectedClassId) {
      setCreateSessionError('Select a course before creating an attendance session.');
      return;
    }
    if (!title) {
      setCreateSessionError('Enter a session title.');
      return;
    }

    setIsCreatingSession(true);
    setCreateSessionError(null);
    try {
      const created = await apiRequest<AttendanceSession>('/api/v1/attendance/sessions', {
        method: 'POST',
        body: {
          classId: selectedClassId,
          date: sessionDate,
          title,
        },
      });
      setSessions((existing) => [created, ...existing.filter((session) => session._id !== created._id)]
        .sort((left, right) => right.date.localeCompare(left.date)));
      setSelectedSession(created);
      setSessionRecords([]);
      // Refresh the selected course before focusing the newly created session.
      await loadClassSessions(selectedClassId);
      await handleSelectSession(created);
      setShowCreateSessionModal(false);
      setSessionTitle('');
      setCreateSessionError(null);
      setFeedback({
        message: `Attendance session "${created.title}" initialized for ${classes.find((course) => course._id === selectedClassId)?.code || 'the selected course'}.`,
        type: 'success',
      });
    } catch (err: any) {
      const message = err.message || 'Failed to create session.';
      setCreateSessionError(message);
      setFeedback({ message, type: 'error' });
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleMarkAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    if (!selectedSession) return;
    try {
      const record = await securityProcess.run({
        title: 'Sealing attendance record',
        subtitle: 'Attendance is bound to the selected session and protected against unauthorized edits.',
        steps: [
          'Check teacher role, class assignment, and student enrollment',
          'Bind student, session, status, and session date into canonical data',
          'Compute HMAC-SHA-256 with the server secret',
          'Save record and audit who marked it',
          'Verify the HMAC when student or teacher views the record',
        ],
      }, () => apiRequest<AttendanceRecord>(`/api/v1/attendance/sessions/${selectedSession._id}/records`, {
        method: 'POST', body: { studentId, status },
      }), (created) => `Attendance recorded as ${created.status.toUpperCase()}. HMAC verified: ${created.integrityVerified ? 'yes' : 'no'}.`);
      setFeedback({
        message: `Marked ${status.toUpperCase()} with HMAC signature: ${record.integrityHmac.slice(0, 14)}...`,
        type: 'success',
      });
      handleSelectSession(selectedSession);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to mark attendance.', type: 'error' });
    }
  };

  const handleOpenCorrection = (rec: AttendanceRecord) => {
    setCorrectingRecord(rec);
    setCorrectionStatus(rec.status);
    setCorrectionReason('');
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord || !correctionReason) return;

    try {
      await apiRequest(`/api/v1/attendance/records/${correctingRecord._id}`, {
        method: 'PATCH',
        body: {
          status: correctionStatus,
          reason: correctionReason,
        },
      });
      setCorrectingRecord(null);
      setFeedback({
        message: `Authorized correction recorded and HMAC recalculated with audit trail.`,
        type: 'success',
      });
      if (selectedSession) handleSelectSession(selectedSession);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Correction failed.', type: 'error' });
    }
  };

  const handleRunIntegrityCheck = async () => {
    try {
      const res = await apiRequest<any>('/api/v1/attendance/verify', { method: 'POST' });
      const verifyData = res;
      setIntegrityResult(verifyData);
      if (verifyData.tamperedCount > 0) {
        setFeedback({
          message: `🚨 CRITICAL ALERT: HMAC mismatch on ${verifyData.tamperedCount} record(s). Alteration detected and forensic log saved to SQLite!`,
          type: 'error',
        });
      } else {
        setFeedback({
          message: `HMAC verification complete: All ${verifyData.totalChecked} records conform to canonical cryptographic signatures.`,
          type: 'success',
        });
      }
      if (selectedSession) handleSelectSession(selectedSession);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Integrity check failed.', type: 'error' });
    }
  };

  const handleSimulateTamper = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<any>('/api/v1/attendance/simulate-tampering', { method: 'POST' });
      // Automatically run HMAC integrity verification on simulation
      const verifyRes = await apiRequest<any>('/api/v1/attendance/verify', { method: 'POST' });
      const verifyData = verifyRes;
      setIntegrityResult(verifyData);

      if (verifyData.tamperedCount > 0) {
        setFeedback({
          message: `🚨 TAMPER DETECTED: Record ${res.recordId || ''} altered to '${res.newStatus || ''}'. Immediate HMAC check caught ${verifyData.tamperedCount} tampered record(s)! Alert sent to SOC & logged to SQLite attendance_tamper_logs.`,
          type: 'error',
        });
      } else {
        setFeedback({
          message: `Simulation executed in OFF mode: record ${res.recordId || ''} changed to '${res.newStatus || ''}' without integrity verification.`,
          type: 'warning',
        });
      }

      if (selectedSession) await handleSelectSession(selectedSession);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Tamper simulation failed.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-xs font-medium text-slate-400 animate-pulse">Loading attendance records & roster...</div>
      </div>
    );
  }

  // STUDENT VIEW
  if (user?.role === 'student') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Personal Attendance Record</h1>
            <p className="text-xs text-slate-400">
              Verified attendance history with SHA-256 HMAC cryptographic signatures
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Overall Attendance:</span>
            <span className="text-base font-bold text-blue-400">
              {studentSummary?.overallAttendancePercentage ?? 100}%
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {feedback?.type === 'error' && <div role="alert" className="rounded-lg border border-rose-700/50 bg-rose-950/30 p-3 text-sm text-rose-200">{feedback.message}</div>}
          {!studentSummary?.classes?.length && <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-300">No course attendance is linked to this account yet. Newly registered students are enrolled in CS-401 automatically.</div>}
          {studentSummary?.classes?.map((c: any) => (
            <div key={c.classId} className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{c.classCode}</span>
                    <span className="text-xs text-slate-400">· {c.className}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {c.presentCount} Present · {c.lateCount} Late · {c.absentCount} Absent · {c.totalSessions} Sessions
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-blue-400">{c.attendancePercentage}%</div>
                    <div className="text-[10px] text-slate-500">weighted rate</div>
                  </div>
                </div>
              </div>

              {/* Individual Session History */}
              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Session Records & Integrity
                </div>
                {c.records.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3">No recorded sessions for this course yet.</div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {c.records.map((r: any) => (
                      <div key={r._id} className={`py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs ${r.isTampered ? 'rounded bg-rose-950/40 px-2' : ''}`}>
                        <div>
                          <div className="font-medium text-slate-200">{r.sessionTitle}</div>
                          <div className="text-[11px] text-slate-400">
                            Session Date: {r.sessionDate} · Recorded: {new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {r.correctionReason && (
                            <div className="mt-1 text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded inline-block">
                              Correction Note: {r.correctionReason}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 sm:mt-0 flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1 font-semibold ${
                            r.status === 'present'
                              ? 'text-emerald-400'
                              : r.status === 'late'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}>
                            {r.status === 'present' && <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />}
                            {r.status === 'late' && <Clock className="h-3.5 w-3.5 text-amber-400" />}
                            {r.status === 'absent' && <XCircle className="h-3.5 w-3.5 text-rose-400" />}
                            {r.status.toUpperCase()}
                          </span>
                          {r.isTampered ? <span className="font-bold text-rose-300">TAMPER DETECTED · excluded from percentage</span> : <span className="font-mono text-[10px] text-slate-400" title={`HMAC: ${r.integrityHmac}`}>
                            HMAC: {r.integrityHmac.slice(0, 10)}...
                          </span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <SecurityProcessModal process={securityProcess.process} onClose={securityProcess.close} />
      </div>
    );
  }

  // FACULTY & ADMIN VIEW
  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Attendance & Cryptographic HMAC</span>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-blue-400 border border-blue-500/20">
              SHA-256 SEALS
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Authorized session marking, reason-backed corrections, and tampering verification
          </p>
        </div>

        {/* Security Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunIntegrityCheck}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-sm hover:bg-slate-700 transition"
            title="Verify all records against HMAC secret"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Verify HMAC Integrity</span>
          </button>

          <button
            onClick={handleSimulateTamper}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition"
            title="Simulate silent database modification without key"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span>Simulate DB Tamper (Demo)</span>
          </button>

          <button
            onClick={() => { setCreateSessionError(null); setShowCreateSessionModal(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`rounded-lg p-3 text-xs flex items-center justify-between border ${
          feedback.type === 'success'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : feedback.type === 'warning'
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
        }`}>
          <span className="font-medium">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Course Selector */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur p-4 shadow-sm">
        <label className="text-xs font-semibold text-slate-300">Select Course:</label>
        <select
          value={selectedClassId}
          onChange={handleClassChange}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 focus:border-blue-500 focus:outline-none"
        >
          {classes.map((c) => (
            <option key={c._id} value={c._id}>
              {c.code}: {c.name} ({c.enrollmentCount ?? 0} students)
            </option>
          ))}
        </select>
        <span className="ml-auto text-[11px] text-slate-400">
          Enrolled Roster: <strong className="text-blue-400">{roster.length} students</strong>
        </span>
      </div>

      {/* Sessions & Roster Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sessions list */}
        <div className="space-y-3 lg:col-span-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Sessions ({sessions.length})</span>
            <span className="text-[10px] text-slate-500 font-mono">COURSE SESSIONS</span>
          </div>
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 text-center text-xs text-slate-500">
              No sessions created yet. Click "New Session" to initialize.
            </div>
          ) : (
            sessions.map((sess) => {
              const isSelected = selectedSession?._id === sess._id;
              return (
                <div
                  key={sess._id}
                  onClick={() => handleSelectSession(sess)}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    isSelected
                      ? 'border-blue-500/80 bg-blue-500/10 shadow-sm'
                      : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs">{sess.title}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{sess.date}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono text-[10px] text-slate-500">Code: {sess.sessionCode}</span>
                    <span className={`capitalize px-2 py-0.5 rounded text-[10px] font-semibold ${
                      sess.status === 'open' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-slate-400 bg-slate-800'
                    }`}>
                      {sess.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Session Records Table */}
        <div className="space-y-4 lg:col-span-8">
          {selectedSession ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm overflow-hidden backdrop-blur">
              <div className="border-b border-slate-800 p-5 bg-slate-900/90">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{selectedSession.title}</span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                        {selectedSession.sessionCode}
                      </span>
                    </h2>
                    <div className="text-xs text-slate-400">
                      Session Date: {selectedSession.date}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    <span className="text-emerald-400 font-bold">{sessionRecords.length}</span> / {roster.length} marked
                  </div>
                </div>
              </div>

              {/* Records List */}
              <div className="p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-medium">
                        <th className="pb-3">Student Name & ID</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">HMAC Seal</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {roster.map((student) => {
                        const sId = student.studentId || student.userId || student.studentOrStaffId;
                        const record = sessionRecords.find(
                          (r) => r.studentId === sId || r.studentId === student.userId || r.studentId === student.studentId
                        );
                        const isMarked = !!record;

                        return (
                          <tr key={sId} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 font-medium text-slate-200">
                              <div>{student.fullName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {student.studentNumber || student.studentOrStaffId || student.email}
                              </div>
                            </td>

                            <td className="py-3">
                              {isMarked ? (
                                <div className="space-y-1">
                                  <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[11px] ${
                                    record.status === 'present'
                                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                      : record.status === 'late'
                                      ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                                      : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                                  }`}>
                                    {record.status === 'present' && <CheckCircle className="h-3 w-3" />}
                                    {record.status === 'late' && <Clock className="h-3 w-3" />}
                                    {record.status === 'absent' && <XCircle className="h-3 w-3" />}
                                    {record.status.toUpperCase()}
                                  </span>
                                  {record.correctionReason && (
                                    <div className="text-[10px] text-slate-400 italic">
                                      Note: {record.correctionReason}
                                    </div>
                                  )}
                                  {record.isTampered && (
                                    <div className="text-[10px] text-rose-400 font-semibold flex items-center gap-1 mt-1 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                                      <ShieldAlert className="h-3 w-3 text-rose-400" />
                                      HMAC Signature Mismatch!
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">Unmarked</span>
                              )}
                            </td>

                            <td className="py-3 font-mono text-[11px] text-slate-400">
                              {isMarked ? (
                                <span title={record.integrityHmac} className="rounded bg-slate-800/80 px-2 py-0.5 border border-slate-700 text-slate-300">
                                  {record.integrityHmac.slice(0, 14)}...
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>

                            <td className="py-3 text-right">
                              {!isMarked ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleMarkAttendance(student.studentId || student.userId, 'present')}
                                    className="rounded bg-emerald-500/20 text-emerald-300 px-2.5 py-1 text-[11px] font-semibold hover:bg-emerald-500/30 border border-emerald-500/30 transition"
                                  >
                                    Present
                                  </button>
                                  <button
                                    onClick={() => handleMarkAttendance(student.studentId || student.userId, 'late')}
                                    className="rounded bg-amber-500/20 text-amber-300 px-2.5 py-1 text-[11px] font-semibold hover:bg-amber-500/30 border border-amber-500/30 transition"
                                  >
                                    Late
                                  </button>
                                  <button
                                    onClick={() => handleMarkAttendance(student.studentId || student.userId, 'absent')}
                                    className="rounded bg-rose-500/20 text-rose-300 px-2.5 py-1 text-[11px] font-semibold hover:bg-rose-500/30 border border-rose-500/30 transition"
                                  >
                                    Absent
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenCorrection(record)}
                                  className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700 transition"
                                >
                                  <Edit3 className="h-3 w-3 text-slate-400" />
                                  <span>Correct</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-8 text-center text-xs text-slate-500">
              Select or create an attendance session to mark records.
            </div>
          )}
        </div>
      </div>

      {/* Create Session Modal */}
      {showCreateSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white">Create Attendance Session</h3>
              <button onClick={() => setShowCreateSessionModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            {createSessionError && <div role="alert" className="mt-3 rounded-lg border border-rose-700/50 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">{createSessionError}</div>}
            <form onSubmit={handleCreateSession} className="mt-4 space-y-3">
              <div>
                <label htmlFor="attendance-session-course" className="block text-xs font-medium text-slate-300">Course</label>
                <select id="attendance-session-course" required value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setCreateSessionError(null); }} className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none">
                  {classes.map((course) => <option key={course._id} value={course._id}>{course.code}: {course.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Session Date</label>
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(e) => { setSessionDate(e.target.value); setCreateSessionError(null); }}
                  className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Lecture / Topic Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lecture 14: Threat Modeling"
                  value={sessionTitle}
                  onChange={(e) => { setSessionTitle(e.target.value); setCreateSessionError(null); }}
                  className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isCreatingSession}
                  onClick={() => setShowCreateSessionModal(false)}
                  className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSession || !selectedClassId || !sessionTitle.trim()}
                  className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingSession ? 'Initializing…' : 'Initialize Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Authorized Correction Modal */}
      {correctingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white">Authorized Attendance Correction</h3>
              <button onClick={() => setCorrectingRecord(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitCorrection} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300">New Status</label>
                <select
                  value={correctionStatus}
                  onChange={(e: any) => setCorrectionStatus(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Mandatory Reason for Correction (Logged to Audit Trail)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Verified official medical note from clinic administrator."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCorrectingRecord(null)}
                  className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                >
                  Save & Recompute HMAC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <SecurityProcessModal process={securityProcess.process} onClose={securityProcess.close} />
    </div>
  );
};
