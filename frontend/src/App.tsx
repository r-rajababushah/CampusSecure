/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './features/auth/AuthContext.js';
import { SecurityModeProvider, useSecurityMode } from './features/security-center/SecurityModeContext.js';
import { LoginPage } from './features/auth/LoginPage.js';
import { Navbar } from './components/layout/Navbar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { DashboardPage } from './features/dashboard/DashboardPage.js';
import { ClassesPage } from './features/classes/ClassesPage.js';
import { AttendancePage } from './features/attendance/AttendancePage.js';
import { ProjectsPage } from './features/projects/ProjectsPage.js';
import { UsersPage } from './features/users/UsersPage.js';
import { SecurityCenterPage } from './features/security-center/SecurityCenterPage.js';
import { AuditPage } from './features/audit/AuditPage.js';
import { SqlInjectionLabPage } from './features/sqli-lab/SqlInjectionLabPage.js';
import { ArchitectureFlowPage } from './features/architecture/ArchitectureFlowPage.js';
import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';

const VALID_ROUTES = [
  'dashboard',
  'classes',
  'attendance',
  'projects',
  'users',
  'security',
  'audit',
  'sqli-lab',
  'architecture',
];

function getTabFromUrl(): string {
  const segment = window.location.pathname.replace(/^\/+/, '').split('/')[0].toLowerCase();
  if (segment === 'chat') return 'projects';
  return VALID_ROUTES.includes(segment) ? segment : 'dashboard';
}

function InsecureDemoBanner() {
  const { isSecure, toggleSecurityMode } = useSecurityMode();
  const { user } = useAuth();

  if (isSecure) return null;

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 bg-red-600 px-4 py-2 text-white shadow-md">
      <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider">
        <AlertTriangle className="h-4 w-4 animate-bounce text-yellow-300" />
        <span>⚠️ INSECURE DEMO MODE - LOCAL ONLY ⚠️</span>
      </div>
      <div className="hidden md:flex items-center gap-2 text-xs font-medium text-red-100">
        <span>Active Vulnerabilities: SQL Injection, Stored XSS, IDOR, No Rate Limits, Plaintext Chat</span>
      </div>
      {user?.role === 'admin' && (
        <button
          onClick={() => toggleSecurityMode('on')}
          className="rounded bg-white px-2.5 py-1 text-xs font-bold text-red-700 shadow hover:bg-red-50 transition"
        >
          🛡️ Re-enable Security ON
        </button>
      )}
    </div>
  );
}

function MainApp() {
  const { user, isLoading } = useAuth();
  const { isSecure } = useSecurityMode();
  const [activeTab, setActiveTabState] = useState<string>(getTabFromUrl);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync tab state with browser URL (HTML5 History API)
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    const targetPath = `/${tab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab }, '', targetPath);
    }
  };

  // Sync on initial mount & handle browser back/forward buttons
  useEffect(() => {
    if (window.location.pathname === '/' || window.location.pathname === '') {
      window.history.replaceState({ tab: 'dashboard' }, '', '/dashboard');
    }

    const handlePopState = () => {
      setActiveTabState(getTabFromUrl());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <div className="text-xs font-medium text-slate-400">Verifying authenticated session...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <InsecureDemoBanner />
        <LoginPage />
      </>
    );
  }

  // Guard admin and faculty tabs when in SECURE mode
  const isAdminTab = ['users', 'security', 'audit'].includes(activeTab);
  const isFacultyOrAdminTab = ['sqli-lab'].includes(activeTab);

  // In OFF mode, route protection is disabled (allows demonstrating broken access control)
  const canAccessTab = !isSecure || (
    (!isAdminTab || user.role === 'admin') &&
    (!isFacultyOrAdminTab || user.role !== 'student')
  );

  const effectiveTab = canAccessTab ? activeTab : 'dashboard';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans antialiased text-slate-900">
      {/* Global Insecure Demo Banner on every page */}
      <InsecureDemoBanner />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={effectiveTab}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Navbar
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            activeTab={effectiveTab}
            setActiveTab={setActiveTab}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              {effectiveTab === 'dashboard' && <DashboardPage setActiveTab={setActiveTab} />}
              {effectiveTab === 'classes' && <ClassesPage />}
              {effectiveTab === 'attendance' && <AttendancePage />}
              {effectiveTab === 'projects' && <ProjectsPage />}
              {effectiveTab === 'users' && (user.role === 'admin' || !isSecure) && <UsersPage />}
              {effectiveTab === 'security' && (user.role === 'admin' || !isSecure) && <SecurityCenterPage />}
              {effectiveTab === 'audit' && (user.role === 'admin' || !isSecure) && <AuditPage />}
              {effectiveTab === 'sqli-lab' && (user.role !== 'student' || !isSecure) && <SqlInjectionLabPage />}
              {effectiveTab === 'architecture' && <ArchitectureFlowPage />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const isFullscreenFlow =
    typeof window !== 'undefined' &&
    (window.location.search.includes('view=fullscreen-flow') ||
      window.location.pathname.startsWith('/architecture-fullscreen'));

  if (isFullscreenFlow) {
    return <ArchitectureFlowPage isStandalone={true} />;
  }

  return (
    <AuthProvider>
      <SecurityModeProvider>
        <MainApp />
      </SecurityModeProvider>
    </AuthProvider>
  );
}
