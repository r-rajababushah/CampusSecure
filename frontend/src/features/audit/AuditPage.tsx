import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api.js';
import { AuditLog } from '../../types/index.js';
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  X,
  Code,
} from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchActor, setSearchActor] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchActor) params.append('actorEmail', searchActor);
      if (selectedAction) params.append('action', selectedAction);
      params.append('limit', '100');

      const data = await apiRequest<{ items: AuditLog[] }>(`/api/v1/audit?${params.toString()}`);
      setLogs(data.items || []);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedAction]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Immutable Audit Trail</h1>
          <p className="text-xs text-slate-500">
            Chronological ledger of security, administrative, and attendance correction events with correlation IDs
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Filter Bar */}
      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by actor email..."
            value={searchActor}
            onChange={(e) => setSearchActor(e.target.value)}
            className="w-full rounded-md border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All Actions</option>
          <option value="USER_LOGIN">USER_LOGIN</option>
          <option value="USER_LOGOUT">USER_LOGOUT</option>
          <option value="USER_CREATED">USER_CREATED</option>
          <option value="USER_UPDATED">USER_UPDATED</option>
          <option value="CLASS_CREATED">CLASS_CREATED</option>
          <option value="STUDENT_ENROLLED">STUDENT_ENROLLED</option>
          <option value="ATTENDANCE_CORRECTED">ATTENDANCE_CORRECTED</option>
          <option value="PROJECT_CREATED">PROJECT_CREATED</option>
        </select>

        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
        >
          Filter
        </button>
      </form>

      {/* Logs Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading audit ledger...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No audit events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Correlation ID</th>
                  <th className="py-2.5 px-3">Outcome</th>
                  <th className="py-2.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-900">
                      <div>{log.actorEmail}</div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">{log.actorRole}</span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                      {log.resourceType}: {log.resourceId}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {log.correlationId}
                    </td>

                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                        log.outcome === 'success' ? 'text-emerald-700' : 'text-red-700'
                      }`}>
                        {log.outcome === 'success' ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-600" />
                        )}
                        {log.outcome.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {log.details ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                        >
                          <Code className="h-3 w-3" />
                          <span>Inspect</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Log Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Audit Detail Inspection</h3>
                <span className="font-mono text-[11px] text-slate-500">Correlation ID: {selectedLog.correlationId}</span>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-500">Action:</span> <span className="font-mono font-medium">{selectedLog.action}</span></div>
                <div><span className="text-slate-500">Actor:</span> <span className="font-medium">{selectedLog.actorEmail}</span></div>
                <div><span className="text-slate-500">Resource:</span> <span className="font-mono">{selectedLog.resourceType}</span></div>
                <div><span className="text-slate-500">IP Origin:</span> <span className="font-mono">{selectedLog.ip}</span></div>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-700">Payload Metadata:</span>
                <pre className="mt-1.5 max-h-56 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-slate-200">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
            <div className="mt-4 flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
