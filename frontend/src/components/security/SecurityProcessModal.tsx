import React from 'react';
import { CheckCircle2, Circle, LoaderCircle, ShieldCheck, X } from 'lucide-react';

export interface SecurityProcessState {
  title: string;
  subtitle: string;
  steps: string[];
  activeStep: number;
  status: 'running' | 'success' | 'error';
  result?: string;
  error?: string;
  minDurationMs?: number;
  visual?: Array<{ label: string; value: string }>;
  elapsedMs?: number;
}

export const SecurityProcessModal: React.FC<{ process: SecurityProcessState | null; onClose: () => void }> = ({ process, onClose }) => {
  if (!process) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="security-process-title">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-cyan-500/30 bg-slate-900 shadow-2xl shadow-cyan-950/40">
        <div className="flex items-start justify-between border-b border-slate-800 p-5">
          <div className="flex gap-3"><div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-300"><ShieldCheck /></div><div><h2 id="security-process-title" className="font-bold text-white">{process.title}</h2><p className="mt-1 text-xs text-slate-400">{process.subtitle}</p></div></div>
          {process.status !== 'running' && <button aria-label="Close security walkthrough" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"><X size={18} /></button>}
        </div>
        <div className="px-5 pt-4">
          <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{process.status === 'running' ? 'Security walkthrough in progress' : process.status === 'success' ? 'Walkthrough complete' : 'Walkthrough stopped'}</span>
            <span>{process.status === 'running' ? `About ${Math.max(1, Math.ceil((process.minDurationMs || 8800) / 1000))} seconds · step ${Math.min(process.activeStep + 1, process.steps.length)} of ${process.steps.length}` : `${Math.max(1, Math.ceil((process.elapsedMs || process.minDurationMs || 8800) / 1000))} seconds`}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-700" style={{ width: `${process.status === 'success' ? 100 : Math.min(96, ((process.activeStep + (process.status === 'running' ? 0.45 : 0)) / process.steps.length) * 100)}%` }} /></div>
        </div>
        <ol className="space-y-2 p-5" aria-live="polite">
          {process.steps.map((step, index) => {
            const done = process.status === 'success' || index < process.activeStep;
            const active = process.status === 'running' && index === process.activeStep;
            return <li key={step} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${active ? 'border-cyan-500/50 bg-cyan-950/30 text-cyan-100' : done ? 'border-emerald-500/20 bg-emerald-950/20 text-emerald-200' : 'border-slate-800 text-slate-500'}`}>
              {done ? <CheckCircle2 size={17} /> : active ? <LoaderCircle size={17} className="animate-spin" /> : <Circle size={17} />}{step}
            </li>;
          })}
        </ol>
        {process.visual?.length ? <section aria-label="Live security data transformation" className="mx-5 mb-5 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-200"><span className={`h-2 w-2 rounded-full ${process.status === 'running' ? 'animate-pulse bg-cyan-400' : 'bg-emerald-400'}`} />Live data view</h3>
          <div className="space-y-2">
            {process.visual.map((entry) => <div key={entry.label} className="grid grid-cols-1 gap-1 border-b border-slate-800 pb-2 last:border-b-0 last:pb-0 sm:grid-cols-[145px_1fr] sm:items-start">
              <span className="text-[11px] text-slate-400">{entry.label}</span>
              <code className="break-all text-[11px] text-emerald-200">{entry.value}</code>
            </div>)}
          </div>
        </section> : null}
        {process.status !== 'running' && <div className={`mx-5 mb-5 rounded-lg border p-3 text-sm ${process.status === 'success' ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-200' : 'border-rose-700/50 bg-rose-950/30 text-rose-200'}`}>{process.status === 'success' ? process.result : process.error}</div>}
      </div>
    </div>
  );
};
