import React from 'react';
import { useAuth } from '../../features/auth/AuthContext.js';
import {
  LayoutDashboard,
  BookOpen,
  CalendarCheck,
  FolderKanban,
  Users,
  ShieldAlert,
  FileText,
  X,
  Lock,
  Database,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'faculty', 'student'],
    },
    {
      id: 'classes',
      label: 'Courses & Rosters',
      icon: BookOpen,
      roles: ['admin', 'faculty', 'student'],
    },
    {
      id: 'attendance',
      label: 'Attendance & HMAC',
      icon: CalendarCheck,
      roles: ['admin', 'faculty', 'student'],
    },
    {
      id: 'projects',
      label: 'Projects & Secure Chat',
      icon: FolderKanban,
      roles: ['admin', 'faculty', 'student'],
    },
    {
      id: 'users',
      label: 'User Directory',
      icon: Users,
      roles: ['admin'],
    },
    {
      id: 'security',
      label: 'Security Center (SOC)',
      icon: ShieldAlert,
      roles: ['admin'],
      highlight: true,
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: FileText,
      roles: ['admin'],
    },
    {
      id: 'sqli-lab',
      label: 'SQL Injection Lab',
      icon: Database,
      roles: ['admin', 'faculty'],
      highlight: true,
    },
  ];

  const filteredNav = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800 bg-slate-950 text-slate-300 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-0 -translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 font-bold text-white text-xs">
              SC
            </div>
            <span className="font-semibold text-white tracking-tight">SecureCampus</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Platform Modules
          </div>

          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition ${
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.highlight && (
                  <span className="flex h-2 w-2 rounded-full bg-blue-400 ring-2 ring-blue-400/20" />
                )}
              </button>
            );
          })}
        </div>

        {/* Security Status Box in Sidebar Footer */}
        <div className="p-4 border-t border-slate-900">
          <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              <span>Zero-Trust Protocol</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              RBAC authorization enforced on all operations. Attendance verified via HMAC-SHA-256.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
