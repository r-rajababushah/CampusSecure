import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { useSecurityMode } from './SecurityModeContext.js';
import { apiRequest } from '../../lib/api.js';
import { onSecurityEvent } from '../../lib/socket.js';
import { SecurityEvent, ScannerFinding, SecuritySeverity, SecurityCategory } from '../../types/index.js';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Search,
  Filter,
  FileText,
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
  Play,
  RotateCw,
  Terminal,
  Layers,
  Lock,
} from 'lucide-react';

export const SecurityCenterPage: React.FC = () => {
  const { user } = useAuth();
  const { securityMode, isSecure, toggleSecurityMode, isLoading: modeLoading } = useSecurityMode();
  const [stats, setStats] = useState<any>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [scannerFindings, setScannerFindings] = useState<ScannerFinding[]>([]);
  const [activeSection, setActiveSection] = useState<'events' | 'scanners' | 'simulation'>('events');

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [includeSimulated, setIncludeSimulated] = useState<boolean>(true);

  // Selected incident for detail drawer
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [incidentNotes, setIncidentNotes] = useState('');
  const [updatingIncident, setUpdatingIncident] = useState(false);

  // Importer modals
  const [showZapModal, setShowZapModal] = useState(false);
  const [showBurpModal, setShowBurpModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Action status
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [sData, eData, fData] = await Promise.all([
        apiRequest('/api/v1/security/stats'),
        apiRequest<{ items: SecurityEvent[] }>('/api/v1/security/events?limit=100'),
        apiRequest<{ items: ScannerFinding[] }>('/api/v1/security/scanners?limit=100'),
      ]);
      setStats(sData);
      setEvents(eData.items || []);
      setScannerFindings(fData.items || []);
    } catch (err: any) {
      console.error('Failed to load security center data:', err);
    }
  };

  useEffect(() => {
    loadData();

    // Attach real-time SOC Socket.IO alert feed
    const unsub = onSecurityEvent((newEvent) => {
      setEvents((prev) => [newEvent, ...prev]);
      // Update quick counts
      setStats((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          totalEvents: prev.totalEvents + 1,
          realEventsCount: newEvent.isSimulatedDemo ? prev.realEventsCount : prev.realEventsCount + 1,
          simulatedDemoCount: newEvent.isSimulatedDemo ? prev.simulatedDemoCount + 1 : prev.simulatedDemoCount,
        };
      });
    });

    return unsub;
  }, []);

  const handleSelectEvent = (event: SecurityEvent) => {
    setSelectedEvent(event);
    setIncidentNotes(event.notes || '');
  };

  const handleUpdateIncidentStatus = async (status: SecurityEvent['investigationStatus']) => {
    if (!selectedEvent) return;
    setUpdatingIncident(true);
    try {
      const updated = await apiRequest<SecurityEvent>(`/api/v1/security/events/${selectedEvent._id}`, {
        method: 'PATCH',
        body: { investigationStatus: status, notes: incidentNotes },
      });
      setSelectedEvent(updated);
      setEvents((prev) => prev.map((e) => (e._id === updated._id ? updated : e)));
      loadData();
      setActionNotice(`Incident status updated to ${status.toUpperCase()}.`);
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      setActionNotice(`Error: ${err.message || 'Failed to update incident.'}`);
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setUpdatingIncident(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedEvent) return;
    setUpdatingIncident(true);
    try {
      const updated = await apiRequest<SecurityEvent>(`/api/v1/security/events/${selectedEvent._id}`, {
        method: 'PATCH',
        body: { notes: incidentNotes },
      });
      setSelectedEvent(updated);
      setEvents((prev) => prev.map((e) => (e._id === updated._id ? updated : e)));
      setActionNotice('Analyst incident notes updated.');
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      setActionNotice(`Error: ${err.message || 'Failed to save notes.'}`);
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setUpdatingIncident(false);
    }
  };

  const handleUpdateFindingStatus = async (findingId: string, status: ScannerFinding['remediationStatus']) => {
    try {
      const updated = await apiRequest<ScannerFinding>(`/api/v1/security/scanners/${findingId}`, {
        method: 'PATCH',
        body: { remediationStatus: status },
      });
      setScannerFindings((prev) => prev.map((f) => (f._id === updated._id ? updated : f)));
      setActionNotice(`Vulnerability finding status set to ${status.toUpperCase()}.`);
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      setActionNotice(`Error: ${err.message || 'Failed to update finding status.'}`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleTriggerSimulatedAttack = async (type: string) => {
    try {
      const res = await apiRequest('/api/v1/security/simulate-attack', {
        method: 'POST',
        body: { type },
      });
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice(`Simulation Error: ${err.message || 'Simulation failed.'}`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  // Sample payloads for testing importer
  const sampleZapPayload = JSON.stringify(
    [
      {
        pluginId: '40012',
        name: 'Cross Site Scripting (Reflected)',
        riskdesc: 'High (Medium)',
        riskcode: '3',
        confidence: 'Medium',
        desc: 'A malicious script could be executed in the context of the user session if query parameters are rendered without encoding.',
        solution: 'Apply contextual HTML/JSON entity encoding and configure strict CSP directives.',
        reference: 'https://owasp.org/www-community/attacks/xss/',
        instances: [
          {
            uri: 'http://localhost:3000/api/v1/classes?search=%3Cscript%3E',
            method: 'GET',
            param: 'search',
            attack: '<script>alert(1)</script>',
            evidence: '<script>alert(1)</script>',
          },
        ],
      },
    ],
    null,
    2
  );

  const sampleBurpPayload = JSON.stringify(
    [
      {
        serialNumber: 'BURP-9021',
        name: 'Strict-Transport-Security Header Not Enforced',
        host: 'http://localhost:3000',
        path: '/api/v1/auth/login',
        severity: 'Low',
        confidence: 'Certain',
        issueBackground: 'HTTP Strict Transport Security (HSTS) informs browsers that the site should only be accessed using HTTPS.',
        remediationBackground: 'Enable Strict-Transport-Security in Helmet header configuration with includeSubDomains.',
        issueDetail: 'The production deployment should enforce max-age=31536000.',
      },
    ],
    null,
    2
  );

  const handleImportZap = async () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const res = await apiRequest('/api/v1/security/scanners/zap', {
        method: 'POST',
        body: parsed,
      });
      setShowZapModal(false);
      setImportJsonText('');
      setImportMessage(null);
      setActionNotice(`Successfully imported ${res.importedCount} OWASP ZAP alerts.`);
      loadData();
      setActiveSection('scanners');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setImportMessage(`Invalid JSON format: ${err.message}`);
    }
  };

  const handleImportBurp = async () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const res = await apiRequest('/api/v1/security/scanners/burp', {
        method: 'POST',
        body: parsed,
      });
      setShowBurpModal(false);
      setImportJsonText('');
      setImportMessage(null);
      setActionNotice(`Successfully imported ${res.importedCount} Burp Suite issues.`);
      loadData();
      setActiveSection('scanners');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setImportMessage(`Invalid JSON format: ${err.message}`);
    }
  };

  // Filtered events
  const filteredEvents = events.filter((ev) => {
    if (selectedCategory && ev.eventCategory !== selectedCategory) return false;
    if (selectedSeverity && ev.severity !== selectedSeverity) return false;
    if (selectedStatus && ev.investigationStatus !== selectedStatus) return false;
    if (!includeSimulated && ev.isSimulatedDemo) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchText = `${ev.eventType} ${ev.message} ${ev.affectedResource} ${ev.ip} ${ev.actorEmail || ''}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* SOC Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Security Operations Center (SOC)</h1>
            <span className="inline-flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              Socket.IO Real-Time Stream
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Near-real-time event ingestion, OWASP ZAP & Burp Suite import, HMAC integrity analysis, and incident triage
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setImportJsonText(sampleZapPayload);
              setShowZapModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <Upload className="h-3.5 w-3.5 text-blue-600" />
            <span>Import OWASP ZAP</span>
          </button>

          <button
            onClick={() => {
              setImportJsonText(sampleBurpPayload);
              setShowBurpModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <Upload className="h-3.5 w-3.5 text-amber-600" />
            <span>Import Burp Suite</span>
          </button>

          <button
            onClick={loadData}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:bg-slate-100"
            title="Refresh SOC data"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CYBERSECURITY HACKATHON DEMO MODE TOGGLE CARD                             */}
      {/* ========================================================================= */}
      <div className={`rounded-xl border p-5 shadow-sm transition ${
        isSecure
          ? 'border-emerald-200 bg-emerald-50/50'
          : 'border-red-300 bg-red-50/70 ring-1 ring-red-400'
      }`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg text-white ${isSecure ? 'bg-emerald-600' : 'bg-red-600 animate-pulse'}`}>
              {isSecure ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Hackathon Security Mode: {isSecure ? 'ON (Defenses Active)' : 'OFF (Insecure Demo Mode)'}
                </h2>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  isSecure ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-200 text-red-900 border border-red-400 animate-pulse'
                }`}>
                  {securityMode.toUpperCase()}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {isSecure
                  ? 'All 10 security defenses active: Parameterized SQL, CSP, Rate Limiting, Argon2, HMAC Seals, AES-GCM Chat, RBAC.'
                  : 'Vulnerabilities active for attack demo: SQL Injection, Stored XSS, IDOR, No Rate Limits, Plaintext Chat.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => toggleSecurityMode()}
              disabled={modeLoading}
              className={`px-4 py-2 rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5 ${
                isSecure
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isSecure ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              <span>{isSecure ? 'Switch to SECURITY OFF (Demo)' : 'Switch to SECURITY ON (Protect)'}</span>
            </button>

            <button
              onClick={async () => {
                try {
                  await apiRequest('/api/v1/auth/reset', { method: 'POST' });
                  setActionNotice('Database wiped and re-seeded cleanly with initial demo data.');
                  loadData();
                } catch (e: any) {
                  setActionNotice(`Reset error: ${e.message}`);
                }
              }}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 flex items-center gap-1"
              title="Wipe and re-seed database with clean demo data"
            >
              <RotateCw className="h-3.5 w-3.5 text-slate-500" />
              <span>Reset & Re-seed DB</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Total Events</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{stats?.totalEvents || 0}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {stats?.realEventsCount || 0} real · {stats?.simulatedDemoCount || 0} demo
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Critical & High</span>
          <div className="mt-1 text-2xl font-bold text-red-600">
            {(stats?.bySeverity?.critical || 0) + (stats?.bySeverity?.high || 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {stats?.bySeverity?.critical || 0} Critical · {stats?.bySeverity?.high || 0} High
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Unreviewed Incidents</span>
          <div className="mt-1 text-2xl font-bold text-amber-600">
            {stats?.byStatus?.unreviewed || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Awaiting analyst review
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Blocked Requests</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {events.filter((e) => e.outcome === 'blocked').length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            NoSQL, IDOR & Rate-limit blocks
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Scanner Findings</span>
          <div className="mt-1 text-2xl font-bold text-blue-600">
            {stats?.scannerFindingsCount || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            ZAP & Burp normalized issues
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSection('events')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
            activeSection === 'events'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Live Event Feed ({filteredEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('scanners')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
            activeSection === 'scanners'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Vulnerability Scanners ({scannerFindings.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('simulation')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
            activeSection === 'simulation'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Play className="h-4 w-4 text-emerald-500" />
          <span>Interactive Attack Simulator (Testing)</span>
        </button>
      </div>

      {/* SECTION 1: LIVE EVENT FEED & INCIDENT INVESTIGATION */}
      {activeSection === 'events' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search event type, resource, IP, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="">All Attack Categories</option>
              <option value="auth">Authentication</option>
              <option value="authorization">Authorization / IDOR</option>
              <option value="rate_limit">Rate Limiting</option>
              <option value="integrity_failure">Integrity / HMAC</option>
              <option value="injection_attempt">Injection Attempt</option>
              <option value="suspicious_activity">Suspicious Activity</option>
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="">All Investigation Statuses</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>

            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSimulated}
                onChange={(e) => setIncludeSimulated(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-0"
              />
              <span>Include Demo Simulations</span>
            </label>
          </div>

          {/* Events Stream & Investigation Layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Table / Event List */}
            <div className="space-y-2 lg:col-span-8">
              {filteredEvents.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  No security events match the current filter criteria.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold">
                          <th className="py-2.5 px-4">Severity & Time</th>
                          <th className="py-2.5 px-3">Event Type & Details</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Outcome</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredEvents.map((ev) => {
                          const isSelected = selectedEvent?._id === ev._id;
                          return (
                            <tr
                              key={ev._id}
                              onClick={() => handleSelectEvent(ev)}
                              className={`cursor-pointer transition ${
                                isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-block h-2 w-2 rounded-full ${
                                      ev.severity === 'critical'
                                        ? 'bg-red-600 ring-2 ring-red-200'
                                        : ev.severity === 'high'
                                        ? 'bg-amber-600'
                                        : ev.severity === 'medium'
                                        ? 'bg-blue-600'
                                        : 'bg-slate-400'
                                    }`}
                                  />
                                  <span className="font-semibold text-slate-900 capitalize text-xs">
                                    {ev.severity}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <div className="font-medium text-slate-900 flex items-center gap-1.5">
                                  <span>{ev.eventType}</span>
                                  {ev.isSimulatedDemo && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                      SIMULATED DEMO
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-600 line-clamp-1">{ev.message}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {ev.affectedResource} · IP: {ev.ip}
                                </div>
                              </td>

                              <td className="py-3 px-3 capitalize text-slate-600 whitespace-nowrap text-[11px]">
                                {ev.eventCategory.replace('_', ' ')}
                              </td>

                              <td className="py-3 px-3 whitespace-nowrap text-[11px]">
                                <span className={`font-semibold ${
                                  ev.outcome === 'blocked'
                                    ? 'text-emerald-700'
                                    : ev.outcome === 'alerted'
                                    ? 'text-amber-700'
                                    : 'text-slate-600'
                                }`}>
                                  {ev.outcome.toUpperCase()}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-right whitespace-nowrap text-[11px]">
                                <span className={`px-2 py-0.5 rounded capitalize ${
                                  ev.investigationStatus === 'resolved'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : ev.investigationStatus === 'investigating'
                                    ? 'bg-blue-50 text-blue-700'
                                    : ev.investigationStatus === 'false_positive'
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {ev.investigationStatus.replace('_', ' ')}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Investigation Detail Drawer */}
            <div className="space-y-4 lg:col-span-4">
              {selectedEvent ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Incident Investigation
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">{selectedEvent.eventType}</h3>
                    </div>
                    <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Classification tags */}
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded capitalize">
                      Category: {selectedEvent.eventCategory}
                    </span>
                    <span className={`font-semibold px-2 py-0.5 rounded capitalize ${
                      selectedEvent.severity === 'critical' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      Severity: {selectedEvent.severity}
                    </span>
                    {selectedEvent.isSimulatedDemo && (
                      <span className="bg-amber-50 text-amber-800 font-mono px-2 py-0.5 rounded">
                        Simulated Testing Probe
                      </span>
                    )}
                  </div>

                  {/* Sanitized Telemetry */}
                  <div className="space-y-2 rounded-lg bg-slate-50 p-3 font-mono text-[11px] text-slate-700 border border-slate-200">
                    <div><span className="text-slate-400">Correlation ID:</span> {selectedEvent.correlationId}</div>
                    <div><span className="text-slate-400">Target Endpoint:</span> {selectedEvent.affectedResource}</div>
                    <div><span className="text-slate-400">Source IP:</span> {selectedEvent.ip}</div>
                    <div><span className="text-slate-400">Outcome:</span> {selectedEvent.outcome.toUpperCase()}</div>
                    {selectedEvent.actorEmail && (
                      <div><span className="text-slate-400">User Identity:</span> {selectedEvent.actorEmail}</div>
                    )}
                    <div><span className="text-slate-400">Timestamp:</span> {selectedEvent.createdAt}</div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-700">Detailed Telemetry Message</span>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed bg-white border border-slate-200 p-2.5 rounded-lg">
                      {selectedEvent.message}
                    </p>
                  </div>

                  {/* Incident Triage Status */}
                  <div>
                    <span className="text-xs font-semibold text-slate-700">Change Incident Status</span>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-xs">
                      <button
                        onClick={() => handleUpdateIncidentStatus('investigating')}
                        className={`rounded py-1 px-2 text-center transition ${
                          selectedEvent.investigationStatus === 'investigating'
                            ? 'bg-blue-600 text-white font-medium'
                            : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Investigating
                      </button>
                      <button
                        onClick={() => handleUpdateIncidentStatus('resolved')}
                        className={`rounded py-1 px-2 text-center transition ${
                          selectedEvent.investigationStatus === 'resolved'
                            ? 'bg-emerald-600 text-white font-medium'
                            : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Resolved
                      </button>
                      <button
                        onClick={() => handleUpdateIncidentStatus('false_positive')}
                        className={`rounded py-1 px-2 text-center transition ${
                          selectedEvent.investigationStatus === 'false_positive'
                            ? 'bg-slate-700 text-white font-medium'
                            : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        False Positive
                      </button>
                      <button
                        onClick={() => handleUpdateIncidentStatus('unreviewed')}
                        className={`rounded py-1 px-2 text-center transition ${
                          selectedEvent.investigationStatus === 'unreviewed'
                            ? 'bg-amber-600 text-white font-medium'
                            : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Unreviewed
                      </button>
                    </div>
                  </div>

                  {/* Analyst Notes */}
                  <div>
                    <span className="text-xs font-semibold text-slate-700">Security Analyst Notes</span>
                    <textarea
                      rows={3}
                      value={incidentNotes}
                      onChange={(e) => setIncidentNotes(e.target.value)}
                      placeholder="Add investigation findings, root cause analysis, or remediation ticket ID..."
                      className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={handleSaveNotes}
                      disabled={updatingIncident}
                      className="mt-2 w-full rounded-md bg-slate-900 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      Save Analyst Notes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                  Select an event row from the feed to inspect correlation logs and manage incident status.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: VULNERABILITY SCANNERS (OWASP ZAP & BURP SUITE) */}
      {activeSection === 'scanners' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Imported Scanner Vulnerability Register</h2>
              <p className="text-xs text-slate-500">
                Normalized findings from OWASP ZAP automated scanner and Burp Suite professional audits
              </p>
            </div>
          </div>

          {scannerFindings.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              No scanner findings recorded. Click "Import OWASP ZAP" or "Import Burp Suite" above to ingest findings.
            </div>
          ) : (
            <div className="space-y-4">
              {scannerFindings.map((finding) => (
                <div key={finding._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        finding.source === 'OWASP_ZAP' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {finding.source.replace('_', ' ')}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">{finding.alertName}</h3>
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded ${
                        finding.severity === 'critical'
                          ? 'bg-red-50 text-red-700'
                          : finding.severity === 'high'
                          ? 'bg-amber-50 text-amber-700'
                          : finding.severity === 'medium'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {finding.severity}
                      </span>
                    </div>

                    {/* Remediation Status Selector */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 font-medium">Remediation:</span>
                      <select
                        value={finding.remediationStatus}
                        onChange={(e: any) => handleUpdateFindingStatus(finding._id, e.target.value)}
                        className={`rounded border border-slate-200 px-2 py-1 text-xs font-medium focus:outline-none ${
                          finding.remediationStatus === 'verified_fixed'
                            ? 'text-emerald-700 bg-emerald-50'
                            : finding.remediationStatus === 'in_remediation'
                            ? 'text-blue-700 bg-blue-50'
                            : 'text-amber-700 bg-amber-50'
                        }`}
                      >
                        <option value="open">Open Finding</option>
                        <option value="in_remediation">In Remediation</option>
                        <option value="verified_fixed">Verified Fixed</option>
                        <option value="accepted_risk">Accepted Risk</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{finding.description}</p>

                  <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-200">
                    <div className="font-semibold text-slate-900">Official Remediation Recommendation:</div>
                    <div className="text-slate-600">{finding.solution}</div>
                    {finding.reference && (
                      <div className="mt-1 pt-1 border-t border-slate-200">
                        <a
                          href={finding.reference}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline text-[11px]"
                        >
                          <span>OWASP / PortSwigger Reference Guide</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-mono">
                    <span>Target: {finding.method} {finding.url}</span>
                    {finding.param && <span>· Param: {finding.param}</span>}
                    <span>· Confidence: {finding.confidence}</span>
                    <span>· Imported By: {finding.importedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: INTERACTIVE ATTACK SIMULATION PANEL */}
      {activeSection === 'simulation' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Automated Threat & Security Controls Test Bench</h2>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Use these certified test harnesses to trigger and verify the application's real-time detection,
              rate-limiting, IDOR blocks, and HMAC tamper detection without external tooling. All generated events
              are explicitly marked with a <span className="font-mono text-slate-700 font-semibold">[DEMO SIMULATION]</span> tag to maintain strict data veracity.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-4 space-y-2.5 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  <span className="font-semibold text-slate-900 text-xs">Simulate Brute Force Attack</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Simulates a burst of 12 rapid failed authentication attempts to test IP rate limiting and lockout detection.
                </p>
                <button
                  onClick={() => handleTriggerSimulatedAttack('brute_force')}
                  className="w-full rounded bg-slate-900 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Fire Simulation Probe
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 space-y-2.5 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-600" />
                  <span className="font-semibold text-slate-900 text-xs">Simulate BOLA / IDOR Attempt</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Tests unauthorized parameter traversal attempting to read private project messages belonging to another team.
                </p>
                <button
                  onClick={() => handleTriggerSimulatedAttack('idor_attempt')}
                  className="w-full rounded bg-slate-900 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Fire Simulation Probe
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 space-y-2.5 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-purple-600" />
                  <span className="font-semibold text-slate-900 text-xs">Simulate NoSQL Query Injection</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Transmits payloads with $ne and $gt operator keys to verify scalar type casting and key stripping sanitizer.
                </p>
                <button
                  onClick={() => handleTriggerSimulatedAttack('nosql_probe')}
                  className="w-full rounded bg-slate-900 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Fire Simulation Probe
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 space-y-2.5 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-slate-900 text-xs">Simulate Anti-CSRF Mismatch</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Simulates a state-changing POST submitted without a matching X-CSRF-Token double-submit cookie.
                </p>
                <button
                  onClick={() => handleTriggerSimulatedAttack('csrf_tamper')}
                  className="w-full rounded bg-slate-900 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Fire Simulation Probe
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 space-y-2.5 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-slate-900 text-xs">Simulate HMAC Signature Tamper</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Directly alters attendance state in storage without recomputing HMAC to test cryptographic audit sweep.
                </p>
                <button
                  onClick={() => handleTriggerSimulatedAttack('integrity_violation')}
                  className="w-full rounded bg-slate-900 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Fire Simulation Probe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT OWASP ZAP */}
      {showZapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Import OWASP ZAP JSON Report</h3>
              <button onClick={() => setShowZapModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Paste the JSON report generated by OWASP ZAP (Report &gt; Generate Report &gt; JSON) or test with the sample alert below:
            </p>
            {importMessage && (
              <div className="mt-2 text-xs text-red-600 font-medium">{importMessage}</div>
            )}
            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="mt-3 block w-full font-mono text-[11px] rounded-md border border-slate-300 p-2 text-slate-900 focus:border-blue-500 focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowZapModal(false)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportZap}
                className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
              >
                Parse & Import ZAP Alerts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT BURP SUITE */}
      {showBurpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Import Burp Suite Issues</h3>
              <button onClick={() => setShowBurpModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Paste Burp Suite scanner issues JSON export or review the sample issue below:
            </p>
            {importMessage && (
              <div className="mt-2 text-xs text-red-600 font-medium">{importMessage}</div>
            )}
            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="mt-3 block w-full font-mono text-[11px] rounded-md border border-slate-300 p-2 text-slate-900 focus:border-blue-500 focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBurpModal(false)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportBurp}
                className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
              >
                Parse & Import Burp Issues
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
