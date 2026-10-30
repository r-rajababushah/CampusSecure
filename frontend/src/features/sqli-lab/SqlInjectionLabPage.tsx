import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api.js';
import {
  Database,
  ShieldAlert,
  ShieldCheck,
  Play,
  Terminal,
  AlertTriangle,
  Code2,
  Table,
  CheckCircle2,
  Copy,
  Info,
  Layers,
  Lock,
} from 'lucide-react';

interface Preset {
  id: string;
  category: string;
  title: string;
  payload: string;
  description: string;
}

interface QueryResult {
  executedQuery: string;
  rows: any[];
  executionTimeMs: number;
  mode: 'vulnerable' | 'secure';
  isInjectionDetected: boolean;
  detectedSignatures: string[];
}

export const SqlInjectionLabPage: React.FC = () => {
  const [mode, setMode] = useState<'vulnerable' | 'secure'>('vulnerable');
  const [queryInput, setQueryInput] = useState<string>("' OR '1'='1");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [schemaTables, setSchemaTables] = useState<any[]>([]);
  const [showSchema, setShowSchema] = useState<boolean>(false);
  const [copiedPayload, setCopiedPayload] = useState<string | null>(null);

  useEffect(() => {
    // Load presets and schema
    apiRequest<Preset[]>('/api/v1/sqli-lab/presets')
      .then((data) => setPresets(data || []))
      .catch((err) => console.error('Failed to load presets:', err));

    apiRequest<any[]>('/api/v1/sqli-lab/schema')
      .then((data) => setSchemaTables(data || []))
      .catch((err) => console.error('Failed to load schema:', err));
  }, []);

  const handleExecute = async (inputToRun?: string, runMode?: 'vulnerable' | 'secure') => {
    const q = inputToRun !== undefined ? inputToRun : queryInput;
    const m = runMode || mode;

    setLoading(true);
    try {
      const res = await apiRequest<QueryResult>('/api/v1/sqli-lab/search', {
        method: 'POST',
        body: { query: q, mode: m },
      });
      setResult(res);
    } catch (err: any) {
      console.error('Execution error:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (p: Preset) => {
    setQueryInput(p.payload);
    handleExecute(p.payload, mode);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(text);
    setTimeout(() => setCopiedPayload(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive SQL Injection (SQLi) Lab
            </h1>
            <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
              <Database className="h-3 w-3" />
              SQLite 3 Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Demonstrate real-world SQL injection vectors, evaluate string concatenation vs. parameterized queries, and observe real-time SOC incident telemetry.
          </p>
        </div>

        <button
          onClick={() => setShowSchema(!showSchema)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Layers className="h-3.5 w-3.5 text-slate-500" />
          <span>{showSchema ? 'Hide Database Schema' : 'Inspect SQLite Tables'}</span>
        </button>
      </div>

      {/* Schema Inspection Drawer (Collapsible) */}
      {showSchema && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
              <Table className="h-4 w-4 text-indigo-600" />
              SQLite Internal Database Schema (Target Tables)
            </h3>
            <span className="text-[11px] text-indigo-700 font-mono">sqlite_master</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {schemaTables.map((tbl: any) => (
              <div key={tbl.name} className="rounded-lg border border-indigo-200 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-indigo-800">{tbl.name}</span>
                  {tbl.name === 'credentials' && (
                    <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                      Sensitive Target
                    </span>
                  )}
                </div>
                <pre className="text-[10px] font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap bg-slate-50 p-2 rounded">
                  {tbl.sql}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode Control & Educational Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Mode Selector */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Database Query Execution Engine
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setMode('vulnerable');
                if (result) handleExecute(undefined, 'vulnerable');
              }}
              className={`rounded-lg border p-3 text-left transition ${
                mode === 'vulnerable'
                  ? 'border-red-500 bg-red-50/60 text-red-950 shadow-xs ring-1 ring-red-500'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                <span className="font-bold text-xs">Vulnerable Mode</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                Direct string concatenation. Unsanitized input is parsed as executable SQL code.
              </p>
            </button>

            <button
              onClick={() => {
                setMode('secure');
                if (result) handleExecute(undefined, 'secure');
              }}
              className={`rounded-lg border p-3 text-left transition ${
                mode === 'secure'
                  ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 shadow-xs ring-1 ring-emerald-500'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-xs">Secured Mode</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                Parameterized prepared statement (`?`). Input is strictly treated as a literal value.
              </p>
            </button>
          </div>
        </div>

        {/* Mechanism Comparison Explainer */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              How the Defense Neutralizes SQLi
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded bg-red-50/50 border border-red-100 p-2.5">
                <div className="font-semibold text-red-800 text-[11px] mb-1">❌ Vulnerable Concatenation</div>
                <code className="text-[10px] font-mono text-red-900 block bg-white p-1 rounded border border-red-200">
                  `SELECT ... WHERE id = '${"${input}"}'`
                </code>
                <p className="text-[11px] text-red-700 mt-1">
                  An input containing single quotes escapes the string literal and alters query structure.
                </p>
              </div>

              <div className="rounded bg-emerald-50/50 border border-emerald-100 p-2.5">
                <div className="font-semibold text-emerald-800 text-[11px] mb-1">✅ Prepared Statements</div>
                <code className="text-[10px] font-mono text-emerald-900 block bg-white p-1 rounded border border-emerald-200">
                  db.prepare('SELECT ... WHERE id = ?').all(input)
                </code>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Database pre-compiles query structure; the input can never execute as SQL commands.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Attacks Palette */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Quick Payload Palette (Click to load & execute)
          </div>
          <span className="text-[11px] text-slate-400">OWASP Top 10 A03:2021 — Injection</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className="flex flex-col text-left rounded-lg border border-slate-200 p-2.5 hover:border-blue-400 hover:bg-blue-50/20 transition group"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">
                  {p.category}
                </span>
                <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition">
                  Run &rarr;
                </span>
              </div>
              <span className="font-semibold text-slate-900 text-xs line-clamp-1">{p.title}</span>
              <code className="mt-1 text-[10px] font-mono text-slate-600 bg-slate-100 px-1 py-0.5 rounded truncate">
                {p.payload}
              </code>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Query Input Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-800">
            Student Lookup Parameter (studentId / email input)
          </label>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span>Current Mode:</span>
            <span
              className={`font-bold px-1.5 py-0.2 rounded text-[10px] uppercase ${
                mode === 'vulnerable' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {mode}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="e.g. STU-2023-881 or ' OR '1'='1"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => handleExecute()}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 ${
              mode === 'vulnerable' ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            <Play className="h-3.5 w-3.5" />
            <span>{loading ? 'Executing...' : 'Run Query'}</span>
          </button>
        </div>
      </div>

      {/* Execution Telemetry & Raw Query Inspection */}
      {result && (
        <div className="space-y-4">
          {/* SOC Alert Banner */}
          {result.isInjectionDetected && (
            <div
              className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                result.mode === 'secure'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-red-300 bg-red-50 text-red-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={`h-5 w-5 shrink-0 mt-0.5 ${
                    result.mode === 'secure' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                />
                <div>
                  <div className="font-bold text-xs flex items-center gap-2">
                    <span>SOC INCIDENT: SQL Injection Pattern Detected</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.2 rounded uppercase ${
                        result.mode === 'secure' ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'
                      }`}
                    >
                      {result.mode === 'secure' ? 'BLOCKED / MITIGATED' : 'EXPLOITATION TELEMETRY LOGGED'}
                    </span>
                  </div>
                  <div className="text-[11px] mt-0.5 opacity-90">
                    Signatures: {result.detectedSignatures.join(' · ')}
                  </div>
                </div>
              </div>

              <div className="text-right text-[11px] shrink-0">
                <span className="font-semibold">SOC Stream:</span> Broadcasted live to Security Center
              </div>
            </div>
          )}

          {/* Raw Executed SQL Box */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2 font-mono">
                <Terminal className="h-3.5 w-3.5 text-blue-400" />
                <span>Raw SQLite Statement Executed at Engine</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400">
                  Execution Time: <span className="text-white font-mono">{result.executionTimeMs} ms</span>
                </span>
                <button
                  onClick={() => copyToClipboard(result.executedQuery)}
                  className="hover:text-white transition flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedPayload === result.executedQuery ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="rounded bg-slate-900 p-3 font-mono text-xs overflow-x-auto border border-slate-800">
              <code className="text-emerald-400 whitespace-pre-wrap">{result.executedQuery}</code>
            </div>
          </div>

          {/* Results Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs text-slate-900">
                  Returned Database Records ({result.rows.length} rows)
                </h3>
                <p className="text-[11px] text-slate-500">
                  {result.mode === 'vulnerable' && result.rows.length > 1
                    ? '⚠️ Vulnerable Concatenation bypassed filtering criteria and leaked additional rows!'
                    : result.mode === 'secure' && result.rows.length === 0
                    ? '🛡️ Prepared Statement treated input as a literal value; no unauthorized data disclosure.'
                    : 'Normal query result set.'}
                </p>
              </div>
            </div>

            {result.rows.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No matching records returned by SQLite engine.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-600 font-semibold">
                      {Object.keys(result.rows[0]).map((col) => (
                        <th key={col} className="px-4 py-2.5 font-mono text-[11px]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {result.rows.map((row, idx) => {
                      const isLeakedCred = row.secretNote || row.passwordHash;
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50 transition ${
                            isLeakedCred ? 'bg-red-50/60 text-red-950 font-bold' : ''
                          }`}
                        >
                          {Object.values(row).map((val: any, cIdx) => (
                            <td key={cIdx} className="px-4 py-2.5 whitespace-nowrap">
                              {typeof val === 'number'
                                ? val
                                : val === null || val === undefined
                                ? 'NULL'
                                : String(val)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
