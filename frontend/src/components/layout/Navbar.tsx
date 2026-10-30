import React, { useState, useEffect } from 'react';
import { useAuth } from '../../features/auth/AuthContext.js';
import { useSecurityMode } from '../../features/security-center/SecurityModeContext.js';
import { apiRequest } from '../../lib/api.js';
import { onNotification } from '../../lib/socket.js';
import { AppNotification } from '../../types/index.js';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Bell,
  CheckCircle,
  LogOut,
  UserCheck,
  ChevronDown,
  Menu,
  RotateCcw,
  Layers,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, activeTab, setActiveTab }) => {
  const { user, logout, switchRoleQuick } = useAuth();
  const { securityMode, isSecure, toggleSecurityMode, isLoading: modeLoading } = useSecurityMode();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await apiRequest<{ unreadCount: number; items: AppNotification[] }>('/api/v1/notifications');
      setNotifications(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Ignore network errors on unauthenticated state
    }
  };

  useEffect(() => {
    fetchNotifications();
    const unsub = onNotification((newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((c) => c + 1);
    });
    return unsub;
  }, [user]);

  const markAllRead = async () => {
    try {
      await apiRequest('/api/v1/notifications/read-all', { method: 'POST' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // Ignore
    }
  };

  const handleRoleSwitch = async (roleEmail: string, pass: string) => {
    setShowRoleSwitcher(false);
    await switchRoleQuick(roleEmail, pass);
  };

  const roleLabel =
    user?.role === 'admin'
      ? 'Administrator'
      : user?.role === 'faculty'
      ? 'Faculty Member'
      : 'Student';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 sm:px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden transition"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white">SecureCampus</span>
            <span className="hidden text-xs text-slate-400 sm:inline"> · Cyber Defense Suite</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Interactive Architecture Flow View Button */}
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
            activeTab === 'architecture'
              ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300 shadow-lg shadow-cyan-500/10'
              : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Open interactive Zero-Trust Architecture Flow"
        >
          <Layers className="h-3.5 w-3.5 text-cyan-400" />
          <span className="hidden md:inline">Architecture Flow</span>
        </button>

        {/* ========================================================================= */}
        {/* SECURITY ON / OFF TOGGLE SWITCH (Admin Control & Status Indicator)       */}
        {/* ========================================================================= */}
        <div className="flex items-center">
          {user?.role === 'admin' ? (
            <button
              onClick={() => toggleSecurityMode()}
              disabled={modeLoading}
              title={`Click to switch Security Mode ${isSecure ? 'OFF (Vulnerable Demo)' : 'ON (Protected)'}`}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-lg border ${
                isSecure
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                  : 'border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30 animate-pulse'
              }`}
            >
              {isSecure ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>SECURITY: ON</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                  <span>SECURITY: OFF</span>
                </>
              )}
            </button>
          ) : (
            <div
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border ${
                isSecure
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
              }`}
            >
              {isSecure ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">SECURITY: ON</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                  <span className="hidden sm:inline">SECURITY: OFF</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Institutional Account / Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:border-slate-700"
            title="Switch active user role"
          >
            <UserCheck className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden md:inline text-slate-400">Account:</span>
            <span className="font-bold text-white">{roleLabel}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showRoleSwitcher && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-800 bg-slate-950/98 p-2.5 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5 z-50 animate-fadeIn">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Switch Institutional Demo Account
              </div>
              <div className="mt-1.5 space-y-1">
                <button
                  onClick={() => handleRoleSwitch('admin@campus.edu', 'Admin@SecurePass2026!')}
                  className={`w-full rounded-xl px-3 py-2 text-left text-xs transition ${
                    user?.role === 'admin' ? 'bg-blue-600/20 border border-blue-500/40 text-blue-200 font-bold' : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="font-semibold text-white">Administrator: Dr. Sarah Connor</div>
                  <div className="text-[11px] text-slate-400">SOC Control, ZAP/Burp, Toggle Switch</div>
                </button>
                <button
                  onClick={() => handleRoleSwitch('dr.chen@campus.edu', 'Faculty@SecurePass2026!')}
                  className={`w-full rounded-xl px-3 py-2 text-left text-xs transition ${
                    user?.email === 'dr.chen@campus.edu' ? 'bg-blue-600/20 border border-blue-500/40 text-blue-200 font-bold' : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="font-semibold text-white">Faculty: Prof. Alan Chen</div>
                  <div className="text-[11px] text-slate-400">CS-401 & CS-420, Attendance HMAC Seals</div>
                </button>
                <button
                  onClick={() => handleRoleSwitch('prof.davis@campus.edu', 'Faculty@SecurePass2026!')}
                  className={`w-full rounded-xl px-3 py-2 text-left text-xs transition ${
                    user?.email === 'prof.davis@campus.edu' ? 'bg-blue-600/20 border border-blue-500/40 text-blue-200 font-bold' : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="font-semibold text-white">Faculty: Prof. Elena Davis</div>
                  <div className="text-[11px] text-slate-400">SE-350 Software Architecture</div>
                </button>
                <button
                  onClick={() => handleRoleSwitch('maya.patel@student.campus.edu', 'Student@SecurePass2026!')}
                  className={`w-full rounded-xl px-3 py-2 text-left text-xs transition ${
                    user?.email === 'maya.patel@student.campus.edu' ? 'bg-blue-600/20 border border-blue-500/40 text-blue-200 font-bold' : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="font-semibold text-white">Student: Maya Patel</div>
                  <div className="text-[11px] text-slate-400">Attendance %, Auth Proxy, RSA-AES Chat</div>
                </button>
                <button
                  onClick={() => handleRoleSwitch('alex.johnson2026@gmail.com', 'Student@Pass2026!')}
                  className={`w-full rounded-xl px-3 py-2 text-left text-xs transition ${
                    user?.email === 'alex.johnson2026@gmail.com' ? 'bg-blue-600/20 border border-blue-500/40 text-blue-200 font-bold' : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="font-semibold text-white">Mock Student: Alex Johnson</div>
                  <div className="text-[11px] text-emerald-400 font-mono">alex.johnson2026@gmail.com</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* In-app Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              if (!showNotifDropdown) fetchNotifications();
            }}
            className="relative rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            aria-label="View notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-md">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-800 bg-slate-950/98 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5 z-50 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white">Security Alerts &amp; Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:underline font-semibold"
                  >
                    <CheckCircle className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No active notifications.</div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif._id}
                      onClick={() => {
                        if (notif.link) {
                          if (notif.link.includes('attendance')) setActiveTab('attendance');
                          else if (notif.link.includes('project')) setActiveTab('projects');
                          else if (notif.link.includes('security')) setActiveTab('security');
                        }
                        setShowNotifDropdown(false);
                      }}
                      className={`p-3 text-xs cursor-pointer transition hover:bg-slate-900 ${
                        !notif.read ? 'bg-blue-950/30' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span>{notif.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-300 line-clamp-2 leading-relaxed">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity / Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="hidden text-right sm:block">
            <div className="text-xs font-bold text-white leading-tight">{user?.fullName}</div>
            <div className="text-[11px] font-mono text-cyan-400">{user?.studentOrStaffId}</div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-xs text-slate-400 transition hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
            title="Sign out securely"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
