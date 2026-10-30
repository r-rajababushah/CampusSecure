import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { apiRequest } from '../../lib/api.js';
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
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
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
          const myData = await apiRequest('/api/v1/attendance/my');
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
      const ros = await apiRequest<{ students: any[] }>(`/api/v1/classes/${classId}/roster`);
      setRoster(ros.students || []);

      if (sess && sess.length > 0) {
        handleSelectSession(sess[0]);
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
    if (!selectedClassId || !sessionTitle) return;

    try {
      const created = await apiRequest<AttendanceSession>('/api/v1/attendance/sessions', {
        method: 'POST',
        body: {
          classId: selectedClassId,
          date: sessionDate,
          title: sessionTitle,
        },
      });
      setShowCreateSessionModal(false);
      setSessionTitle('');
      setFeedback({
        message: `Attendance session "${created.title}" initialized.`,
        type: 'success',
      });
      await loadClassSessions(selectedClassId);
      handleSelectSession(created);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to create session.', type: 'error' });
    }
  };

  const handleMarkAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    if (!selectedSession) return;
    try {
      const record = await apiRequest<AttendanceRecord>(`/api/v1/attendance/sessions/${selectedSession._id}/records`, {
        method: 'POST',
        body: { studentId, status },
      });
      setFeedback({
        message: `Marked ${status.toUpperCase()} with HMAC signature: ${record.integrityHmac.slice(0, 12)}...`,
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
      const res = await apiRequest('/api/v1/attendance/verify', { method: 'POST' });
      setIntegrityResult(res);
      if (res.tamperedCount > 0) {
        setFeedback({
          message: `CRITICAL ALERT: Tampering detected on ${res.tamperedCount} record(s). Security event logged to SOC!`,
          type: 'error',
        });
      } else {
        setFeedback({
          message: `HMAC verification complete: All ${res.totalChecked} records conform to canonical cryptographic signatures.`,
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
      const res = await apiRequest('/api/v1/attendance/simulate-tampering', { method: 'POST' });
      setFeedback({
        message: res.message || 'Simulated silent database modification performed. Run integrity check to verify detection.',
        type: 'warning',
      });
      if (selectedSession) handleSelectSession(selectedSession);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Simulation failed.', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-xs font-medium text-slate-500">Loading attendance data...</div>
      </div>
    );
  }

  // STUDENT VIEW
  if (user?.role === 'student') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Personal Attendance Record</h1>
            <p className="text-xs text-slate-500">
              Verified attendance history with SHA-256 HMAC cryptographic signatures
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Overall Attendance:</span>
            <span className="text-base font-bold text-blue-600">
              {studentSummary?.overallAttendancePercentage ?? 100}%
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {studentSummary?.classes?.map((c: any) => (
            <div key={c.classId} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{c.classCode}</span>
                    <span className="text-xs text-slate-600">· {c.className}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {c.presentCount} Present · {c.lateCount} Late · {c.absentCount} Absent · {c.totalSessions} Sessions
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-blue-600">{c.attendancePercentage}%</div>
                    <div className="text-[10px] text-slate-400">weighted rate</div>
                  </div>
                </div>
              </div>

              {/* Individual Session History */}
              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Session Records & Integrity
                </div>
                {c.records.length === 0 ? (
                  <div className="text-xs text-slate-400 py-3">No recorded sessions for this course yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {c.records.map((r: any) => (
                      <div key={r._id} className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs">
                        <div>
                          <div className="font-medium text-slate-900">{r.sessionTitle}</div>
                          <div className="text-[11px] text-slate-500">
                            Session Date: {r.sessionDate} · Recorded: {new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {r.correctionReason && (
                            <div className="mt-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block">
                              Correction Note: {r.correctionReason}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 sm:mt-0 flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1 font-semibold ${
                            r.status === 'present'
                              ? 'text-emerald-700'
                              : r.status === 'late'
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }`}>
                            {r.status === 'present' && <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />}
                            {r.status === 'late' && <Clock className="h-3.5 w-3.5 text-amber-600" />}
                            {r.status === 'absent' && <XCircle className="h-3.5 w-3.5 text-red-600" />}
                            {r.status.toUpperCase()}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500" title={`HMAC: ${r.integrityHmac}`}>
                            HMAC: {r.integrityHmac.slice(0, 10)}...
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // FACULTY & ADMIN VIEW
  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Attendance & Cryptographic HMAC</h1>
          <p className="text-xs text-slate-500">
            Authorized session marking, reason-backed corrections, and tampering verification
          </p>
        </div>

        {/* Security Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunIntegrityCheck}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            title="Verify all records against HMAC secret"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Verify HMAC Integrity</span>
          </button>

          <button
            onClick={handleSimulateTamper}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
            title="Simulate silent database modification without key"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span>Simulate DB Tamper (Demo)</span>
          </button>

          <button
            onClick={() => setShowCreateSessionModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500"
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
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : feedback.type === 'warning'
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Course Selector */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-xs font-semibold text-slate-700">Select Course:</label>
        <select
          value={selectedClassId}
          onChange={handleClassChange}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
        >
          {classes.map((c) => (
            <option key={c._id} value={c._id}>
              {c.code}: {c.name} ({c.enrollmentCount || 0} students)
            </option>
          ))}
        </select>
      </div>

      {/* Sessions & Roster Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sessions list */}
        <div className="space-y-3 lg:col-span-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Sessions ({sessions.length})
          </div>
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
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
                      ? 'border-blue-500 bg-blue-50/40 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-xs">{sess.title}</span>
                    <span className="text-[11px] text-slate-500">{sess.date}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Code: {sess.sessionCode}</span>
                    <span className={`capitalize ${sess.status === 'open' ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
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
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{selectedSession.title}</h2>
                    <div className="text-xs text-slate-500">
                      Date: {selectedSession.date} · Code: {selectedSession.sessionCode}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {sessionRecords.length} / {roster.length} marked
                  </div>
                </div>
              </div>

              {/* Records List */}
              <div className="p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 font-medium">
                        <th className="pb-2">Student</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">HMAC Signature</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roster.map((student) => {
                        const record = sessionRecords.find((r) => r.studentId === student.studentId);
                        const isMarked = !!record;

                        return (
                          <tr key={student.studentId} className="hover:bg-slate-50">
                            <td className="py-2.5 font-medium text-slate-900">
                              {student.fullName}
                              <div className="text-[11px] text-slate-500">{student.studentNumber}</div>
                            </td>

                            <td className="py-2.5">
                              {isMarked ? (
                                <div className="space-y-1">
                                  <span className={`inline-flex items-center gap-1 font-semibold ${
                                    record.status === 'present'
                                      ? 'text-emerald-700'
                                      : record.status === 'late'
                                      ? 'text-amber-700'
                                      : 'text-red-700'
                                  }`}>
                                    {record.status === 'present' && <CheckCircle className="h-3 w-3" />}
                                    {record.status === 'late' && <Clock className="h-3 w-3" />}
                                    {record.status === 'absent' && <XCircle className="h-3 w-3" />}
                                    {record.status.toUpperCase()}
                                  </span>
                                  {record.correctionReason && (
                                    <div className="text-[10px] text-slate-500">
                                      Correction: {record.correctionReason}
                                    </div>
                                  )}
                                  {record.isTampered && (
                                    <div className="text-[10px] text-red-600 font-semibold flex items-center gap-1">
                                      <ShieldAlert className="h-3 w-3 text-red-600" />
                                      HMAC Signature Mismatch!
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Unmarked</span>
                              )}
                            </td>

                            <td className="py-2.5 font-mono text-[10px] text-slate-500">
                              {isMarked ? (
                                <span title={record.integrityHmac}>{record.integrityHmac.slice(0, 14)}...</span>
                              ) : (
                                '—'
                              )}
                            </td>

                            <td className="py-2.5 text-right">
                              {!isMarked ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleMarkAttendance(student.studentId, 'present')}
                                    className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                                  >
                                    Present
                                  </button>
                                  <button
                                    onClick={() => handleMarkAttendance(student.studentId, 'late')}
                                    className="rounded bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100"
                                  >
                                    Late
                                  </button>
                                  <button
                                    onClick={() => handleMarkAttendance(student.studentId, 'absent')}
                                    className="rounded bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
                                  >
                                    Absent
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenCorrection(record)}
                                  className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                                >
                                  <Edit3 className="h-3 w-3 text-slate-500" />
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
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              Select or create an attendance session to mark records.
            </div>
          )}
        </div>
      </div>

      {/* Create Session Modal */}
      {showCreateSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Create Attendance Session</h3>
              <button onClick={() => setShowCreateSessionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSession} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Session Date</label>
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Lecture / Topic Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lecture 14: Threat Modeling"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateSessionModal(false)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                >
                  Initialize Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Authorized Correction Modal */}
      {correctingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Authorized Attendance Correction</h3>
              <button onClick={() => setCorrectingRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitCorrection} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">New Status</label>
                <select
                  value={correctionStatus}
                  onChange={(e: any) => setCorrectionStatus(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Mandatory Reason for Correction (Logged to Audit Trail)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Verified official medical note from clinic administrator."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCorrectingRecord(null)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
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
    </div>
  );
};
