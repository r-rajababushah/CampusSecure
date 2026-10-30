import React, { useState } from 'react';
import { useAuth } from './AuthContext.js';
import { apiRequest } from '../../lib/api.js';
import { Shield, Lock, AlertTriangle, KeyRound, ArrowRight, UserPlus, LogIn } from 'lucide-react';

type Tab = 'login' | 'register';

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Business Administration',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Other',
];

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [tab, setTab] = useState<Tab>('login');

  // ── Login state ────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Register state ────────────────────────────────────────────────────────
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regDepartment, setRegDepartment] = useState('Computer Science');
  const [regRole, setRegRole] = useState<'student' | 'faculty'>('student');
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // ── Login handlers ─────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError('Please provide both email address and password.');
      return;
    }
    setLoginError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoginError(null);
    setIsSubmitting(true);
    try {
      await login(demoEmail, demoPass);
    } catch (err: any) {
      setLoginError(err.message || 'Quick login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Register handler ───────────────────────────────────────────────────────
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regFullName.trim()) { setRegError('Full name is required.'); return; }
    if (!regEmail.trim() || !regEmail.includes('@')) { setRegError('A valid email is required.'); return; }
    if (regPassword.length < 8) { setRegError('Password must be at least 8 characters.'); return; }
    if (regPassword !== regConfirm) { setRegError('Passwords do not match.'); return; }

    setIsRegistering(true);
    try {
      const res = await apiRequest<{ user: any; sessionId: string }>('/api/v1/auth/register', {
        method: 'POST',
        body: {
          fullName: regFullName.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          role: regRole,
          department: regDepartment,
        },
      });

      // Auto-login after registration — apiRequest already triggered cookie set server-side.
      // Refresh auth state by re-logging in using the login helper so sockets etc. are set up.
      await login(regEmail.trim().toLowerCase(), regPassword);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100 flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-md">
            <Shield className="h-7 w-7 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          SecureCampus Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Authenticated College Operations &amp; Security Monitoring Environment
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        {/* Tab switcher */}
        <div className="flex rounded-lg border border-slate-800 bg-slate-950/60 p-1 mb-4">
          <button
            type="button"
            onClick={() => { setTab('login'); setLoginError(null); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition ${
              tab === 'login'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setRegError(null); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition ${
              tab === 'register'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Create Account
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6 sm:p-8 shadow-2xl backdrop-blur-sm">

          {/* ── LOGIN TAB ─────────────────────────────────────────────────── */}
          {tab === 'login' && (
            <>
              {loginError && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Institutional Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@campus.edu"
                    className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-300">
                      Password
                    </label>
                    <span className="text-[11px] text-slate-500">Argon2id/PBKDF2 Hashed</span>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Authenticating Session...</span>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      <span>Authenticate Session</span>
                    </>
                  )}
                </button>
              </form>

              {/* Quick Bootstrap Personas */}
              <div className="mt-6 border-t border-slate-800/80 pt-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                  Rapid Assessment Personas (One-Click)
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('admin@campus.edu', 'Admin@SecurePass2026!')}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-left text-xs transition hover:border-slate-700 hover:bg-slate-900"
                  >
                    <div>
                      <div className="font-medium text-white">Administrator: Dr. Sarah Connor</div>
                      <div className="text-[11px] text-slate-400">Security Operations Center, ZAP/Burp imports, audit logs</div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('dr.chen@campus.edu', 'Faculty@SecurePass2026!')}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-left text-xs transition hover:border-slate-700 hover:bg-slate-900"
                  >
                    <div>
                      <div className="font-medium text-white">Faculty: Prof. Alan Chen</div>
                      <div className="text-[11px] text-slate-400">CS-401 &amp; CS-420, attendance sessions &amp; HMAC signing</div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('maya.patel@student.campus.edu', 'Student@SecurePass2026!')}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-left text-xs transition hover:border-slate-700 hover:bg-slate-900"
                  >
                    <div>
                      <div className="font-medium text-white">Student: Maya Patel</div>
                      <div className="text-[11px] text-slate-400">Enrolled courses, attendance %, project spaces &amp; live chat</div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await apiRequest('/api/v1/auth/bootstrap', { method: 'POST' });
                      setLoginError('Demo database refreshed successfully with full dataset.');
                    } catch (err: any) {
                      setLoginError(err.message || 'Failed to refresh demo dataset.');
                    }
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-800 py-1.5 text-[11px] text-slate-400 hover:border-slate-700 hover:text-slate-300"
                >
                  <span>Reload / Reset Fresh Demo Data</span>
                </button>
              </div>
            </>
          )}

          {/* ── REGISTER TAB ──────────────────────────────────────────────── */}
          {tab === 'register' && (
            <>
              {regError && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-300">Full Name</label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Dr. Jane Smith"
                    className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-300">Institutional Email</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@campus.edu"
                    className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Role + Department row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300">Role</label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as 'student' | 'faculty')}
                      className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300">Department</label>
                    <select
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-300">Password</label>
                    <span className="text-[11px] text-slate-500">Min 8 chars, upper/lower/digit/symbol</span>
                  </div>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-medium text-slate-300">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="••••••••••••"
                    className={`mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm text-white placeholder-slate-500 transition focus:outline-none focus:ring-1 bg-slate-900 ${
                      regConfirm && regPassword !== regConfirm
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                  />
                  {regConfirm && regPassword !== regConfirm && (
                    <p className="mt-1 text-[11px] text-red-400">Passwords do not match.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isRegistering || (!!regConfirm && regPassword !== regConfirm)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50"
                >
                  {isRegistering ? (
                    <span>Creating Account...</span>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Create Account &amp; Sign In</span>
                    </>
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-[11px] text-slate-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Sign in here
                </button>
              </p>
            </>
          )}
        </div>

        {/* Security Posture Note */}
        <div className="mt-4 rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>Strict Session Rotation &amp; Anti-CSRF Protection Active</span>
          </div>
          <span>OWASP ZAP Ready</span>
        </div>
      </div>
    </div>
  );
};
