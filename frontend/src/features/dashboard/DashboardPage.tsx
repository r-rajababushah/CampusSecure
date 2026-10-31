import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { useSecurityMode } from '../security-center/SecurityModeContext.js';
import { apiRequest } from '../../lib/api.js';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  BookOpen,
  CalendarCheck,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Lock,
  KeyRound,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Activity,
  Fingerprint,
  Radio,
  FileCheck2,
  Database,
  ExternalLink,
} from 'lucide-react';

interface DashboardPageProps {
  setActiveTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setActiveTab }) => {
  const { user } = useAuth();
  const { isSecure, toggleSecurityMode } = useSecurityMode();
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
          const stats = await apiRequest('/api/v1/security-events/stats');
          const cls = await apiRequest('/api/v1/classes');
          setAdminStats(stats);
          setClasses(cls || []);
        } else if (user?.role === 'student') {
          const att = await apiRequest('/api/v1/attendance/my-records');
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
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <div className="absolute h-12 w-12 animate-ping rounded-full bg-blue-500/20" />
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
        <div className="font-mono text-xs text-slate-400">Loading campus intelligence matrix...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Executive Cyber Command Banner ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-blue-950/40 p-6 shadow-2xl backdrop-blur-xl">
        {/* Subtle decorative glow accents */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-400">
                <Radio className="h-3 w-3 animate-pulse text-blue-400" />
                Zero-Trust SOC Active
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${
                  isSecure
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-red-500/40 bg-red-500/15 text-red-400 animate-pulse'
                }`}
              >
                {isSecure ? (
                  <>
                    <ShieldCheck className="h-3 w-3 text-emerald-400" />
                    Security Mode: ON (Protected)
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 text-red-400" />
                    Security Mode: OFF (Demo Vulnerable)
                  </>
                )}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, <span className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">{user?.fullName}</span>
            </h1>
            <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-300">{user?.department}</span>
              <span>·</span>
              <span className="font-mono text-cyan-400">{user?.studentOrStaffId}</span>
              <span>·</span>
              <span className="capitalize text-slate-400">{user?.role} authorization scope</span>
            </p>
          </div>

          {/* Quick Actions in Banner */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveTab('architecture')}
              className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 text-xs font-bold text-cyan-300 shadow-lg shadow-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400 transition"
            >
              <Layers className="h-4 w-4 text-cyan-400" />
              <span>Interactive Architecture Flow</span>
              <ExternalLink className="h-3 w-3 text-cyan-400 opacity-70" />
            </button>

            {user?.role === 'admin' && (
              <button
                onClick={() => toggleSecurityMode()}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-lg ${
                  isSecure
                    ? 'border border-emerald-500/40 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                    : 'border border-red-500/50 bg-red-600/20 text-red-300 hover:bg-red-600/30 animate-pulse'
                }`}
              >
                {isSecure ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Toggle Demo OFF</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4 text-red-400" />
                    <span>Engage Security ON</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 Cryptographic Security Pillars (The Hackathon Core) ─────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pillar 1: Attendance HMAC Integrity */}
        <div
          onClick={() => setActiveTab('attendance')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-emerald-500/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Pillar 1: Integrity</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:scale-110 transition">
              <Fingerprint className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-lg font-bold text-white group-hover:text-emerald-300 transition">
            HMAC-SHA256 Seals
          </div>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Deterministic canonical signing protects attendance records against unauthorized database alterations.
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-emerald-400">
            <span>3 Tampered Records Flagged</span>
            <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Pillar 2: E2E Chat Confidentiality */}
        <div
          onClick={() => setActiveTab('projects')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-fuchsia-500/50 hover:shadow-fuchsia-500/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-fuchsia-400">Pillar 2: Confidentiality</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 group-hover:scale-110 transition">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-lg font-bold text-white group-hover:text-fuchsia-300 transition">
            Hybrid RSA + AES-256
          </div>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Project chat payloads are wrapped with RSA-2048 and encrypted with AES-256-GCM. Zero plaintext stored.
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-fuchsia-400">
            <span>Verified Leader Badges</span>
            <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Pillar 3: Injection Defense */}
        <div
          onClick={() => setActiveTab('sqli-lab')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-amber-500/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Pillar 3: Injection Defense</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 group-hover:scale-110 transition">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-lg font-bold text-white group-hover:text-amber-300 transition">
            Parameterized SQL
          </div>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Prepared statement queries neutralize auth bypass attacks like <code className="text-amber-300 font-mono text-[10px]">admin@campus.edu' --</code>.
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-amber-400">
            <span>Launch SQLi Cyber Lab</span>
            <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Pillar 4: Identity & Zero-Trust RBAC */}
        <div
          onClick={() => setActiveTab('security')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-cyan-500/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Pillar 4: Identity & RBAC</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 group-hover:scale-110 transition">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-lg font-bold text-white group-hover:text-cyan-300 transition">
            Argon2 & Rate Limits
          </div>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Salted hashing resists rainbow tables; 5-attempt threshold triggers instant 15-minute lockouts.
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-cyan-400">
            <span>Inspect SOC Telemetry</span>
            <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition" />
          </div>
        </div>
      </div>

      {/* ── Role-Specific Operational Panels ───────────────────────────────── */}
      {user?.role === 'admin' && (
        <>
          {/* Admin KPI Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Security Events</span>
                <Activity className="h-4 w-4 text-blue-400" />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-white">
                {adminStats?.totalEvents || 0}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>{adminStats?.realEventsCount || 0} genuine</span>
                <span>·</span>
                <span className="text-slate-500">{adminStats?.simulatedDemoCount || 0} simulated</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Critical & High Alerts</span>
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-amber-400">
                {(adminStats?.bySeverity?.critical || 0) + (adminStats?.bySeverity?.high || 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {adminStats?.bySeverity?.critical || 0} Critical · {adminStats?.bySeverity?.high || 0} High priority
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Scanner Findings</span>
                <TrendingUp className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-white">
                {adminStats?.scannerFindingsCount || 0}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                OWASP ZAP &amp; Burp Suite normalized
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Monitored Classes</span>
                <BookOpen className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-white">
                {classes.length}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Flagship security &amp; cloud courses
              </div>
            </div>
          </div>

          {/* Admin Navigation Hub */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div
              onClick={() => setActiveTab('security')}
              className="group cursor-pointer rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-blue-950/30 p-5 shadow-xl backdrop-blur-md hover:border-blue-500/50 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition">Security Operations Center</h3>
                </div>
                <ArrowRight className="h-4 w-4 text-blue-400 group-hover:translate-x-1 transition" />
              </div>
              <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                Real-time incident stream, attack classification, OWASP vulnerability imports, and automated threat response.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('users')}
              className="group cursor-pointer rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/30 p-5 shadow-xl backdrop-blur-md hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                    <Users className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-slate-200 transition">Identity &amp; Roster Control</h3>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
              </div>
              <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                Inspect 30 institutional accounts (including 20 Gmail mock students), manage RBAC roles, and unlock accounts.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('audit')}
              className="group cursor-pointer rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/30 p-5 shadow-xl backdrop-blur-md hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                    <FileCheck2 className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-slate-200 transition">Immutable Audit Trail</h3>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
              </div>
              <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                Forensic transaction ledger with cryptographic correlation IDs, actor timestamps, and IP tracking.
              </p>
            </div>
          </div>
        </>
      )}

      {user?.role === 'faculty' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-xl backdrop-blur-sm">
              <span className="text-xs font-semibold text-slate-400">Assigned Courses</span>
              <div className="mt-2 text-3xl font-extrabold text-white">{classes.length}</div>
              <p className="mt-1 text-[11px] text-slate-400">Active Fall 2026 instruction modules</p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-xl backdrop-blur-sm">
              <span className="text-xs font-semibold text-slate-400">Attendance Integrity Engine</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-3xl font-extrabold text-emerald-400">HMAC-Active</span>
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">10 sessions across October with 250 signed records</p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-xl backdrop-blur-sm">
              <span className="text-xs font-semibold text-slate-400">Supervised Collaborations</span>
              <div className="mt-2 text-3xl font-extrabold text-white">{projects.length}</div>
              <p className="mt-1 text-[11px] text-slate-400">Encrypted capstone team projects</p>
            </div>
          </div>

          {/* Faculty Assigned Courses List */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-2">
              <div>
                <h3 className="text-base font-bold text-white">Your Assigned Academic Courses</h3>
                <p className="text-xs text-slate-400">Inspect attendance sessions, student rosters, and cryptographic verification</p>
              </div>
              <button
                onClick={() => setActiveTab('attendance')}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition"
              >
                <Fingerprint className="h-3.5 w-3.5" />
                <span>Open Attendance &amp; HMAC</span>
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {classes.map((c) => (
                <div key={c._id} className="rounded-xl border border-slate-800/90 bg-slate-950/60 p-4 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{c.code}: {c.name}</span>
                    <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-400 border border-blue-500/20">
                      {c.enrollmentCount || 0} Students
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">{c.description}</p>
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400 border-t border-slate-900 pt-2 font-mono">
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
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-xl backdrop-blur-sm">
              <span className="text-xs font-semibold text-slate-400">Overall Attendance Score</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-blue-400">
                  {studentSummary?.overallAttendancePercentage ?? 100}%
                </span>
                <span className="text-xs text-slate-400">verified valid</span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                  style={{ width: `${studentSummary?.overallAttendancePercentage ?? 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-xl backdrop-blur-sm">
              <span className="text-xs font-semibold text-slate-400">Enrolled Courses</span>
              <div className="mt-2 text-4xl font-extrabold text-white">
                {studentSummary?.classes?.length || classes.length}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Fall 2026 Academic Term</p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-xl backdrop-blur-sm">
              <span className="text-xs font-semibold text-slate-400">Encrypted Capstone Spaces</span>
              <div className="mt-2 text-4xl font-extrabold text-white">{projects.length}</div>
              <p className="mt-1 text-[11px] text-slate-400">Zero-knowledge collaborative channels</p>
            </div>
          </div>

          {/* Student Courses & Attendance Breakdown */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Enrolled Course Attendance Breakdown</h3>
                <p className="text-xs text-slate-400">Zero-Trust IDOR guard ensures you only inspect your own signed records</p>
              </div>
              <button
                onClick={() => setActiveTab('attendance')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                View full history &amp; HMAC records →
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-800/80">
              {studentSummary?.classes?.map((item: any) => (
                <div key={item.classId} className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">
                      {item.classCode}: {item.className}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {item.presentCount} present · {item.lateCount} late · {item.absentCount} absent
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-extrabold ${
                      item.attendancePercentage >= 85
                        ? 'text-emerald-400'
                        : item.attendancePercentage >= 75
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}>
                      {item.attendancePercentage}%
                    </span>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Attendance</div>
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
