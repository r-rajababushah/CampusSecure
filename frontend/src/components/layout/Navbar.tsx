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

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, setActiveTab }) => {
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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Shield className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <span className="text-base font-semibold tracking-tight text-slate-900">SecureCampus</span>
            <span className="hidden text-xs text-slate-500 sm:inline"> — Hackathon Cyber Suite</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Interactive Architecture Flow View Button */}
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition border ${
            activeTab === 'architecture'
              ? 'border-blue-400 bg-blue-50 text-blue-700 shadow-sm'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Open interactive Zero-Trust Architecture Flow"
        >
          <Layers className="h-3.5 w-3.5 text-blue-600" />
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
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition shadow-sm border ${
                isSecure
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-red-400 bg-red-100 text-red-900 hover:bg-red-200 animate-pulse'
              }`}
            >
              {isSecure ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>SECURITY: ON</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  <span>SECURITY: OFF</span>
                </>
              )}
            </button>
          ) : (
            <div
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${
                isSecure
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-300 bg-red-50 text-red-700'
              }`}
            >
              {isSecure ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">SECURITY: ON</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
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
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
            title="Switch active user role"
          >
            <UserCheck className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden md:inline">Account:</span>
            <span className="font-semibold text-slate-900">{roleLabel}</span>
            <ChevronDown className="h-3 w-3 text-slate-500" />
          </button>

          {showRoleSwitcher && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-black/5 z-50">
              <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Switch Institutional Account / Role
              </div>
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => handleRoleSwitch('admin@campus.edu', 'Admin@SecurePass2026!')}
                  className={`w-full rounded px-2.5 py-2 text-left text-xs transition ${
                    user?.role === 'admin' ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium">Administrator: Dr. Sarah Connor</div>
                  <div className="text-[11px] text-slate-500">Security Operations Center, ZAP/Burp, Toggle Switch</div>
                </button>
                <button
                  onClick={() => handleRoleSwitch('dr.chen@campus.edu', 'Faculty@SecurePass2026!')}
                  className={`w-full rounded px-2.5 py-2 text-left text-xs transition ${
                    user?.email === 'dr.chen@campus.edu' ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium">Faculty: Prof. Alan Chen</div>
                  <div className="text-[11px] text-slate-500">CS-401 & CS-420, Attendance & HMAC Signing</div>
                </button>
                <button
                  onClick={() => handleRoleSwitch('prof.davis@campus.edu', 'Faculty@SecurePass2026!')}
                  className={`w-full rounded px-2.5 py-2 text-left text-xs transition ${
                    user?.email === 'prof.davis@campus.edu' ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium">Faculty: Prof. Elena Davis</div>
                  <div className="text-[11px] text-slate-500">SE-350 Software Architecture</div>
                </button>
                <button
                  onClick={() => handleRoleSwitch('maya.patel@student.campus.edu', 'Student@SecurePass2026!')}
                  className={`w-full rounded px-2.5 py-2 text-left text-xs transition ${
                    user?.email === 'maya.patel@student.campus.edu' ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium">Student: Maya Patel</div>
                  <div className="text-[11px] text-slate-500">Attendance %, Capstone Auth Proxy, Live Chat</div>
                </button>
                <button
                  onClick={() => handleRoleSwitch('lucas.kim@student.campus.edu', 'Student@SecurePass2026!')}
                  className={`w-full rounded px-2.5 py-2 text-left text-xs transition ${
                    user?.email === 'lucas.kim@student.campus.edu' ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium">Student: Lucas Kim</div>
                  <div className="text-[11px] text-slate-500">ZAP CI/CD Scanner Project Lead</div>
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
            className="relative rounded-md p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="View notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 z-50">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-900">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <CheckCircle className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No notifications yet.</div>
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
                      className={`p-3 text-xs cursor-pointer transition hover:bg-slate-50 ${
                        !notif.read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium text-slate-900">
                        <span>{notif.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-600 line-clamp-2">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity / Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="hidden text-right sm:block">
            <div className="text-xs font-medium text-slate-900 leading-tight">{user?.fullName}</div>
            <div className="text-[11px] text-slate-500">{user?.studentOrStaffId}</div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1 rounded-md p-1.5 text-xs text-slate-600 transition hover:bg-slate-100 hover:text-red-600"
            title="Sign out securely"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
