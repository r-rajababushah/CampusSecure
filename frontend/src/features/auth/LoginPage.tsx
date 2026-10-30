import React, { useState } from 'react';
import { useAuth } from './AuthContext.js';
import { apiRequest } from '../../lib/api.js';
import {
  Shield,
  ShieldCheck,
  Lock,
  AlertTriangle,
  KeyRound,
  ArrowRight,
  UserPlus,
  LogIn,
  Fingerprint,
  MessageSquare,
  Activity,
  CheckCircle2,
  Cpu,
  Mail,
  User,
  Sparkles,
  Database,
  Radio,
} from 'lucide-react';

type Tab = 'login' | 'register';

const DEPARTMENTS = [
  'Computer Science',
  'Cybersecurity Engineering',
  'Information Systems',
  'Software Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Business Administration',
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
      setLoginError('Please provide both institutional email and password.');
      return;
    }
    setLoginError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed. Please check credentials.');
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
    if (!regEmail.trim() || !regEmail.includes('@')) { setRegError('A valid email address is required.'); return; }
    if (regPassword.length < 8) { setRegError('Password must contain at least 8 characters.'); return; }
    if (regPassword !== regConfirm) { setRegError('Passwords do not match.'); return; }

    setIsRegistering(true);
    try {
      await apiRequest('/api/v1/auth/register', {
        method: 'POST',
        body: {
          fullName: regFullName.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          role: regRole,
          department: regDepartment,
        },
      });

      // Auto-login after registration
      await login(regEmail.trim().toLowerCase(), regPassword);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Background Cyber Glow Gradients */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-blue-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-indigo-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-emerald-500/5 blur-[180px]" />

      <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* ── LEFT SHOWCASE COLUMN (Enterprise Hero & Architecture Highlights) ─ */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400 backdrop-blur-md">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span>Team Crusaders · Cybersecurity Hackathon Suite</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Zero-Trust Architecture for <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">Modern Campuses</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Enterprise student-faculty operations fortified with cryptographic HMAC integrity seals, end-to-end encrypted messaging, and autonomous SOC intrusion defense.
            </p>
          </div>

          {/* 3 Core Security Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 backdrop-blur-md hover:border-emerald-500/40 transition">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2.5">
                <Fingerprint className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-white">HMAC Seals</h3>
              <p className="mt-1 text-[11px] text-slate-400 leading-normal">
                Canonical SHA-256 seals catch database tampering instantly.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 backdrop-blur-md hover:border-fuchsia-500/40 transition">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 mb-2.5">
                <Lock className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-white">Hybrid RSA+AES</h3>
              <p className="mt-1 text-[11px] text-slate-400 leading-normal">
                E2E chat encryption wraps session keys with zero plaintext stored.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 backdrop-blur-md hover:border-blue-500/40 transition">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2.5">
                <Radio className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-white">Live SOC Stream</h3>
              <p className="mt-1 text-[11px] text-slate-400 leading-normal">
                Real-time WebSocket telemetry for brute-force &amp; SQLi attacks.
              </p>
            </div>
          </div>

          {/* Defense Badges Strip */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 rounded-md bg-slate-900/80 px-2 py-1 border border-slate-800">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Parameterized SQL
            </span>
            <span className="flex items-center gap-1 rounded-md bg-slate-900/80 px-2 py-1 border border-slate-800">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Argon2id Salted Hashes
            </span>
            <span className="flex items-center gap-1 rounded-md bg-slate-900/80 px-2 py-1 border border-slate-800">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Strict Session Rotation
            </span>
            <span className="flex items-center gap-1 rounded-md bg-slate-900/80 px-2 py-1 border border-slate-800">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              OWASP Top 10 Defended
            </span>
          </div>
        </div>

        {/* ── RIGHT COLUMN (Frosted Glass Auth Gateway) ────────────────────── */}
        <div className="lg:col-span-5">
          <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">
            
            {/* Header Shield */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Security Gateway</h2>
                  <p className="text-[11px] text-slate-400">Authenticate to enter zero-trust environment</p>
                </div>
              </div>

              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                TLS 1.3
              </span>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold mb-5">
              <button
                type="button"
                onClick={() => { setTab('login'); setLoginError(null); }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition ${
                  tab === 'login'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => { setTab('register'); setRegError(null); }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition ${
                  tab === 'register'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Create Account</span>
              </button>
            </div>

            {/* ── LOGIN FORM ──────────────────────────────────────────────── */}
            {tab === 'login' && (
              <>
                {loginError && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Institutional Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@campus.edu or name@gmail.com"
                        className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-300">
                        Password
                      </label>
                      <span className="text-[10px] text-slate-500 font-mono">Argon2id Salted</span>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Verifying Cryptographic Credentials...</span>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        <span>Authenticate &amp; Enter Portal</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Fast One-Click Demo Personas (Sleek 2x2 Grid) */}
                <div className="mt-5 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Rapid Assessment Personas (One-Click)
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">Instant Demo</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left">
                    <button
                      type="button"
                      onClick={() => handleQuickDemo('admin@campus.edu', 'Admin@SecurePass2026!')}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 hover:border-blue-500/40 hover:bg-slate-900 transition text-left group"
                    >
                      <div className="text-xs font-bold text-white group-hover:text-blue-300">Admin: Dr. Connor</div>
                      <div className="text-[10px] text-slate-400 truncate">SOC, ZAP, Toggle</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDemo('dr.chen@campus.edu', 'Faculty@SecurePass2026!')}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 hover:border-emerald-500/40 hover:bg-slate-900 transition text-left group"
                    >
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300">Faculty: Prof. Chen</div>
                      <div className="text-[10px] text-slate-400 truncate">CS-401 &amp; HMAC Seals</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDemo('maya.patel@student.campus.edu', 'Student@SecurePass2026!')}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 hover:border-cyan-500/40 hover:bg-slate-900 transition text-left group"
                    >
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300">Student: Maya Patel</div>
                      <div className="text-[10px] text-slate-400 truncate">Attendance %, RSA Chat</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDemo('alex.johnson2026@gmail.com', 'Student@Pass2026!')}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 hover:border-fuchsia-500/40 hover:bg-slate-900 transition text-left group"
                    >
                      <div className="text-xs font-bold text-white group-hover:text-fuchsia-300">Mock: Alex Johnson</div>
                      <div className="text-[10px] text-emerald-400 truncate font-mono">alex...2026@gmail.com</div>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── REGISTER FORM ───────────────────────────────────────────── */}
            {tab === 'register' && (
              <>
                {regError && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <span>{regError}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="Alex Parker"
                        className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="alex.parker@gmail.com"
                        className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as 'student' | 'faculty')}
                        className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-xs text-white transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="student">Student</option>
                        <option value="faculty">Faculty Member</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                      <select
                        value={regDepartment}
                        onChange={(e) => setRegDepartment(e.target.value)}
                        className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-xs text-white transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 8 chars"
                        className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-xs text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm</label>
                      <input
                        type="password"
                        required
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        placeholder="Repeat password"
                        className={`w-full rounded-xl border px-3 py-2 text-xs text-white placeholder-slate-500 transition focus:outline-none bg-slate-950/70 ${
                          regConfirm && regPassword !== regConfirm
                            ? 'border-red-500'
                            : 'border-slate-700/80 focus:border-blue-500'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isRegistering || (!!regConfirm && regPassword !== regConfirm)}
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                  >
                    {isRegistering ? (
                      <span>Enrolling Identity in Database...</span>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span>Register &amp; Launch Session</span>
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-3.5 text-center text-xs text-slate-400">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold underline"
                  >
                    Sign in here
                  </button>
                </p>
              </>
            )}

            {/* Bottom Security Note */}
            <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/60 pt-3">
              <span className="flex items-center gap-1 font-mono text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Double-Submit CSRF Active
              </span>
              <span className="font-mono text-slate-400">32-Byte Session Entropy</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
