import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { apiRequest } from '../../lib/api.js';
import { ClassItem } from '../../types/index.js';
import {
  BookOpen,
  Plus,
  Users,
  Search,
  UserPlus,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  X,
  AlertCircle,
} from 'lucide-react';

export const ClassesPage: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New class form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCredits, setNewCredits] = useState(3);
  const [newRoom, setNewRoom] = useState('Science Bldg 201');
  const [newSchedule, setNewSchedule] = useState('Tue/Thu 10:00 AM');

  const fetchClasses = async () => {
    try {
      const data = await apiRequest<ClassItem[]>('/api/v1/classes');
      setClasses(data || []);
      if (!selectedClass && data && data.length > 0) {
        handleSelectClass(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load courses:', err);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleSelectClass = async (cls: ClassItem) => {
    setSelectedClass(cls);
    setLoadingRoster(true);
    setRosterError(null);
    try {
      const data = await apiRequest<{ students: any[] }>(`/api/v1/classes/${cls._id}/roster`);
      setRoster(data.students || []);
    } catch (err: any) {
      setRoster([]);
      setRosterError(err.message || 'Access Denied: You do not have permission to view this roster.');
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleOpenEnroll = async () => {
    if (!selectedClass) return;
    try {
      // In admin/faculty mode, get student users for selection
      const data = await apiRequest<{ items: any[] }>('/api/v1/users?role=student&limit=50').catch(() => ({ items: [] }));
      setAvailableStudents(data.items || []);
      if (data.items && data.items.length > 0) {
        setSelectedStudentId(data.items[0]._id);
      }
      setShowEnrollModal(true);
    } catch {
      setShowEnrollModal(true);
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedStudentId) return;

    try {
      await apiRequest(`/api/v1/classes/${selectedClass._id}/enroll`, {
        method: 'POST',
        body: { studentId: selectedStudentId },
      });
      setShowEnrollModal(false);
      setActionSuccess('Student enrolled successfully into course.');
      handleSelectClass(selectedClass);
      fetchClasses();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionSuccess(`Error: ${err.message || 'Enrollment failed.'}`);
      setTimeout(() => setActionSuccess(null), 5000);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiRequest<ClassItem>('/api/v1/classes', {
        method: 'POST',
        body: {
          code: newCode,
          name: newName,
          description: newDesc,
          credits: Number(newCredits),
          room: newRoom,
          schedule: newSchedule,
          facultyId: user?.id,
        },
      });
      setShowCreateModal(false);
      setActionSuccess(`Course ${created.code} created successfully.`);
      fetchClasses();
      handleSelectClass(created);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionSuccess(`Error: ${err.message || 'Failed to create course.'}`);
      setTimeout(() => setActionSuccess(null), 5000);
    }
  };

  const filteredClasses = classes.filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Courses & Rosters</h1>
          <p className="text-xs text-slate-500">
            {user?.role === 'student' ? 'Your enrolled courses and classmate rosters' : 'Authorized course management and verified rosters'}
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'faculty') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            <span>Create Course</span>
          </button>
        )}
      </div>

      {actionSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Grid: Left list, Right detail & roster */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Course List Column */}
        <div className="space-y-4 lg:col-span-5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search courses by code or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            {filteredClasses.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                No courses found matching criteria.
              </div>
            ) : (
              filteredClasses.map((cls) => {
                const isSelected = selectedClass?._id === cls._id;
                return (
                  <div
                    key={cls._id}
                    onClick={() => handleSelectClass(cls)}
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{cls.code}</span>
                          <span className="text-[11px] text-slate-500">· {cls.credits} Credits</span>
                        </div>
                        <h3 className="mt-0.5 text-xs font-semibold text-slate-800">{cls.name}</h3>
                      </div>
                      <div className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {cls.enrollmentCount || 0} Enrolled
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="truncate">{cls.facultyName || 'Instructor Assigned'}</span>
                      <span>·</span>
                      <span>{cls.schedule}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Course Roster & Details */}
        <div className="space-y-4 lg:col-span-7">
          {selectedClass ? (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900">{selectedClass.code}</span>
                      <span className="text-xs text-slate-500">· {selectedClass.semester} {selectedClass.academicYear}</span>
                    </div>
                    <h2 className="text-sm font-semibold text-slate-700">{selectedClass.name}</h2>
                  </div>
                  {(user?.role === 'admin' || user?.role === 'faculty') && (
                    <button
                      onClick={handleOpenEnroll}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <UserPlus className="h-3.5 w-3.5 text-slate-600" />
                      <span>Enroll Student</span>
                    </button>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {selectedClass.description}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedClass.room}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedClass.schedule}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>Instructor: {selectedClass.facultyName}</span>
                  </div>
                </div>
              </div>

              {/* Roster Table */}
              <div className="p-5">
                <div className="flex items-center justify-between pb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Official Student Roster ({roster.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">Unique Enrollment Enforced</span>
                </div>

                {loadingRoster ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading verified roster...</div>
                ) : rosterError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <div>
                      <div className="font-semibold">Access Denied (RBAC / IDOR Protection)</div>
                      <div className="mt-0.5">{rosterError}</div>
                    </div>
                  </div>
                ) : roster.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">No students actively enrolled in this section.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-500 font-medium">
                          <th className="pb-2">Student Name</th>
                          <th className="pb-2">Student ID</th>
                          <th className="pb-2">Department</th>
                          <th className="pb-2 text-right">Enrolled Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {roster.map((s) => (
                          <tr key={s.enrollmentId || s.studentId} className="hover:bg-slate-50">
                            <td className="py-2.5 font-medium text-slate-900">
                              {s.fullName}
                              <div className="text-[11px] text-slate-400">{s.email}</div>
                            </td>
                            <td className="py-2.5 font-mono text-slate-600">{s.studentNumber || 'N/A'}</td>
                            <td className="py-2.5 text-slate-600">{s.department}</td>
                            <td className="py-2.5 text-right text-slate-500">
                              {new Date(s.enrolledAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              Select a course to inspect details and verified roster.
            </div>
          )}
        </div>
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Create New Course</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateClass} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS-450"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Course Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Applied Cryptography & PKI"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={newCredits}
                    onChange={(e) => setNewCredits(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Room</label>
                  <input
                    type="text"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Schedule</label>
                <input
                  type="text"
                  value={newSchedule}
                  onChange={(e) => setNewSchedule(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Student Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Enroll Student in {selectedClass?.code}
              </h3>
              <button onClick={() => setShowEnrollModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleEnrollStudent} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Select Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  {availableStudents.map((stu) => (
                    <option key={stu._id} value={stu._id}>
                      {stu.fullName} ({stu.studentOrStaffId || stu.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                >
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
