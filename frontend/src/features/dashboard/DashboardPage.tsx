import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { apiRequest } from '../../lib/api.js';
import {
  ShieldAlert,
  Users,
  BookOpen,
  CalendarCheck,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface DashboardPageProps {
  setActiveTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setActiveTab }) => {
  const { user } = useAuth();
  const [adminStats, setAdminStats] = useState<any>(null);
  const [studentSummary, setStudentSummary] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (user?.role === 'admin') {
          const stats = await apiRequest('/api/v1/security/stats');
          const cls = await apiRequest('/api/v1/classes');
          const usr = await apiRequest('/api/v1/users?limit=5');
          setAdminStats(stats);
          setClasses(cls || []);
        } else if (user?.role === 'student') {
          const att = await apiRequest('/api/v1/attendance/my');
          const cls = await apiRequest('/api/v1/classes');
          const proj = await apiRequest('/api/v1/projects');
          setStudentSummary(att);
          setClasses(cls || []);
          setProjects(proj || []);
        } else if (user?.role === 'faculty') {
          const cls = await apiRequest('/api/v1/classes');
          const proj = await apiRequest('/api/v1/projects');
          setClasses(cls || []);
          setProjects(proj || []);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-xs font-medium text-slate-500">Loading campus intelligence...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.fullName}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {user?.department} · Staff/Student ID: {user?.studentOrStaffId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Session Authenticated (HTTP-Only)
            </span>
          </div>
        </div>
      </div>

      {/* Role-Specific Metric Panels */}
      {user?.role === 'admin' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Security Events</span>
                <ShieldAlert className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {adminStats?.totalEvents || 0}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {adminStats?.realEventsCount || 0} real · {adminStats?.simulatedDemoCount || 0} simulated
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">High & Critical Incidents</span>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {(adminStats?.bySeverity?.critical || 0) + (adminStats?.bySeverity?.high || 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {adminStats?.bySeverity?.critical || 0} Critical · {adminStats?.bySeverity?.high || 0} High
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Scanner Findings</span>
                <TrendingUp className="h-4 w-4 text-sky-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {adminStats?.scannerFindingsCount || 0}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                OWASP ZAP & Burp Suite issues
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Active Courses</span>
                <BookOpen className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {classes.length}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Monitored course rosters
              </div>
            </div>
          </div>

          {/* Quick Nav Card for Admin */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div
              onClick={() => setActiveTab('security')}
              className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50/50 p-5 transition hover:border-blue-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Security Operations Center</h3>
                <ArrowRight className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Live event stream, attack category breakdown, ZAP & Burp JSON import, and incident management.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('users')}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">User Management</h3>
                <Users className="h-4 w-4 text-slate-600" />
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Inspect institutional accounts, configure roles, and toggle account activation.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('audit')}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Immutable Audit Trail</h3>
                <CheckCircle2 className="h-4 w-4 text-slate-600" />
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Cryptographic audit logs recording actor actions with request correlation IDs.
              </p>
            </div>
          </div>
        </>
      )}

      {user?.role === 'faculty' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Assigned Courses</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">{classes.length}</div>
              <p className="mt-1 text-[11px] text-slate-500">Active teaching assignments</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-medium text-slate-500">HMAC Integrity Guard</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-600">Active</span>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">SHA-256 canonical signature validation</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Student Collaborations</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">{projects.length}</div>
              <p className="mt-1 text-[11px] text-slate-500">Supervised capstone spaces</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Your Assigned Courses</h3>
                <p className="text-xs text-slate-500">Manage attendance sessions, rosters, and HMAC verification</p>
              </div>
              <button
                onClick={() => setActiveTab('attendance')}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                Open Attendance Center
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {classes.map((c) => (
                <div key={c._id} className="rounded-lg border border-slate-200 p-4 hover:border-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-sm">{c.code}: {c.name}</span>
                    <span className="text-xs text-slate-500">{c.enrollmentCount || 0} Students</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{c.description}</p>
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
                    <span>{c.room}</span>
                    <span>·</span>
                    <span>{c.schedule}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {user?.role === 'student' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Overall Attendance</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-blue-600">
                  {studentSummary?.overallAttendancePercentage ?? 100}%
                </span>
                <span className="text-xs text-slate-500">average</span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${studentSummary?.overallAttendancePercentage ?? 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Enrolled Courses</span>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">
                {studentSummary?.classes?.length || classes.length}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Fall 2026 Academic Term</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Project Spaces</span>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">{projects.length}</div>
              <p className="mt-1 text-[11px] text-slate-500">Active team collaborations</p>
            </div>
          </div>

          {/* Student Courses & Attendance Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Enrolled Course Attendance Breakdown</h3>
              <button
                onClick={() => setActiveTab('attendance')}
                className="text-xs text-blue-600 hover:underline"
              >
                View full history & HMAC records →
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {studentSummary?.classes?.map((item: any) => (
                <div key={item.classId} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      {item.classCode}: {item.className}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {item.presentCount} present · {item.lateCount} late · {item.absentCount} absent
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${
                      item.attendancePercentage >= 85
                        ? 'text-emerald-600'
                        : item.attendancePercentage >= 75
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}>
                      {item.attendancePercentage}%
                    </span>
                    <div className="text-[10px] text-slate-400">attendance</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
