/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Database,
  Cpu,
  Eye,
  FileCheck2,
  Sparkles,
  Activity,
  CheckCircle2,
  Radio,
  Fingerprint,
  MessageSquare,
  Key,
  ShieldAlert,
  Server,
  Zap,
  MapPin,
  Binary,
  AlertTriangle,
  Send,
  Unlock,
  ShieldX,
} from 'lucide-react';

interface BaseNodeCardProps {
  title: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  statusBadge: string;
  description: string;
  protocol: string;
  specFormula?: string;
  securityLayer?: string;
  isActive: boolean;
  selected?: boolean;
  isTerminal?: boolean;
}

const colorMap: Record<string, {
  border: string;
  activeRing: string;
  activeShadow: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconBg: string;
  iconText: string;
  iconBorder: string;
  formulaText: string;
}> = {
  blue: {
    border: 'border-blue-500/40',
    activeRing: 'ring-blue-400/50',
    activeShadow: 'shadow-blue-500/30',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-500/30',
    iconBg: 'bg-blue-600/20',
    iconText: 'text-blue-400',
    iconBorder: 'border-blue-500/30',
    formulaText: 'text-blue-300',
  },
  indigo: {
    border: 'border-indigo-500/40',
    activeRing: 'ring-indigo-400/50',
    activeShadow: 'shadow-indigo-500/30',
    badgeBg: 'bg-indigo-500/15',
    badgeText: 'text-indigo-300',
    badgeBorder: 'border-indigo-500/30',
    iconBg: 'bg-indigo-600/20',
    iconText: 'text-indigo-400',
    iconBorder: 'border-indigo-500/30',
    formulaText: 'text-indigo-300',
  },
  cyan: {
    border: 'border-cyan-500/40',
    activeRing: 'ring-cyan-400/50',
    activeShadow: 'shadow-cyan-500/30',
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-300',
    badgeBorder: 'border-cyan-500/30',
    iconBg: 'bg-cyan-600/20',
    iconText: 'text-cyan-400',
    iconBorder: 'border-cyan-500/30',
    formulaText: 'text-cyan-300',
  },
  purple: {
    border: 'border-purple-500/40',
    activeRing: 'ring-purple-400/50',
    activeShadow: 'shadow-purple-500/30',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/30',
    iconBg: 'bg-purple-600/20',
    iconText: 'text-purple-400',
    iconBorder: 'border-purple-500/30',
    formulaText: 'text-purple-300',
  },
  teal: {
    border: 'border-teal-500/40',
    activeRing: 'ring-teal-400/50',
    activeShadow: 'shadow-teal-500/30',
    badgeBg: 'bg-teal-500/15',
    badgeText: 'text-teal-300',
    badgeBorder: 'border-teal-500/30',
    iconBg: 'bg-teal-600/20',
    iconText: 'text-teal-400',
    iconBorder: 'border-teal-500/30',
    formulaText: 'text-teal-300',
  },
  emerald: {
    border: 'border-emerald-500/40',
    activeRing: 'ring-emerald-400/50',
    activeShadow: 'shadow-emerald-500/30',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    iconBg: 'bg-emerald-600/20',
    iconText: 'text-emerald-400',
    iconBorder: 'border-emerald-500/30',
    formulaText: 'text-emerald-300',
  },
  fuchsia: {
    border: 'border-fuchsia-500/40',
    activeRing: 'ring-fuchsia-400/50',
    activeShadow: 'shadow-fuchsia-500/30',
    badgeBg: 'bg-fuchsia-500/15',
    badgeText: 'text-fuchsia-300',
    badgeBorder: 'border-fuchsia-500/30',
    iconBg: 'bg-fuchsia-600/20',
    iconText: 'text-fuchsia-400',
    iconBorder: 'border-fuchsia-500/30',
    formulaText: 'text-fuchsia-300',
  },
  violet: {
    border: 'border-violet-500/40',
    activeRing: 'ring-violet-400/50',
    activeShadow: 'shadow-violet-500/30',
    badgeBg: 'bg-violet-500/15',
    badgeText: 'text-violet-300',
    badgeBorder: 'border-violet-500/30',
    iconBg: 'bg-violet-600/20',
    iconText: 'text-violet-400',
    iconBorder: 'border-violet-500/30',
    formulaText: 'text-violet-300',
  },
  amber: {
    border: 'border-amber-500/40',
    activeRing: 'ring-amber-400/50',
    activeShadow: 'shadow-amber-500/30',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/30',
    iconBg: 'bg-amber-600/20',
    iconText: 'text-amber-400',
    iconBorder: 'border-amber-500/30',
    formulaText: 'text-amber-300',
  },
  rose: {
    border: 'border-rose-500/40',
    activeRing: 'ring-rose-400/50',
    activeShadow: 'shadow-rose-500/30',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-500/30',
    iconBg: 'bg-rose-600/20',
    iconText: 'text-rose-400',
    iconBorder: 'border-rose-500/30',
    formulaText: 'text-rose-300',
  },
};

const ArchitectureNodeCard = memo((props: BaseNodeCardProps) => {
  const {
    title,
    badge,
    badgeColor,
    icon,
    statusBadge,
    description,
    protocol,
    specFormula,
    securityLayer,
    isActive,
    selected,
    isTerminal,
  } = props;

  const theme = colorMap[badgeColor] || colorMap.blue;

  return (
    <div
      className={`relative w-[290px] rounded-xl border bg-slate-900/95 p-4 text-white shadow-xl backdrop-blur transition-all duration-300 ${
        isActive
          ? `border-white ring-4 ${theme.activeRing} ${theme.activeShadow} scale-[1.02]`
          : selected
          ? `border-white ring-2 ${theme.activeRing}`
          : `${theme.border} hover:border-slate-500`
      }`}
    >
      {/* Universal 4-direction Connection Handles for seamless edge routing */}
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !bg-slate-400 !border-2 !border-slate-950" />
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !bg-slate-400 !border-2 !border-slate-950" />
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !bg-slate-400 !border-2 !border-slate-950" />
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !bg-slate-400 !border-2 !border-slate-950" />

      {/* Auxiliary specialized handles for loops, alerts, and side branches */}
      <Handle type="source" position={Position.Right} id="right" className="!h-2.5 !w-2.5 !bg-blue-400 !border-2 !border-slate-950" />
      <Handle type="source" position={Position.Right} id="alert" className="!h-2.5 !w-2.5 !bg-amber-400 !border-2 !border-slate-950" />
      <Handle type="target" position={Position.Left} id="left-alert" className="!h-2.5 !w-2.5 !bg-rose-400 !border-2 !border-slate-950" />
      <Handle type="target" position={Position.Right} id="loop-target" className="!h-2.5 !w-2.5 !bg-indigo-400 !border-2 !border-slate-950" />
      <Handle type="source" position={Position.Top} id="loop" className="!h-2.5 !w-2.5 !bg-fuchsia-400 !border-2 !border-slate-950" />

      {/* Node Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${theme.iconBg} ${theme.iconText} border ${theme.iconBorder}`}>
            {icon}
          </div>
          <div>
            <div className={`text-[9px] font-bold uppercase tracking-wider ${theme.badgeText}`}>{badge}</div>
            <h3 className="text-xs font-bold text-white tracking-tight leading-tight">{title}</h3>
          </div>
        </div>
        <span className={`rounded ${theme.badgeBg} px-1.5 py-0.5 text-[9px] font-bold ${theme.badgeText} border ${theme.badgeBorder}`}>
          {statusBadge}
        </span>
      </div>

      {/* Description */}
      <p className="mt-2 text-[11px] text-slate-300 leading-snug line-clamp-3">
        {description}
      </p>

      {/* Protocol / Crypto Spec */}
      <div className="mt-2.5 rounded bg-slate-950/80 p-2 border border-slate-800/80">
        <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
          <span className="text-slate-400">Transport:</span>
          <span className="text-slate-200 font-semibold truncate max-w-[170px]">{protocol}</span>
        </div>
        {specFormula && (
          <div className="mt-1 font-mono text-[9px] text-slate-400 truncate border-t border-slate-800/50 pt-1">
            <span className="text-slate-500">Spec: </span>
            <span className={theme.formulaText}>{specFormula}</span>
          </div>
        )}
      </div>

      {/* Security standard badge */}
      {securityLayer && (
        <div className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-300">
          <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0" />
          <span className="truncate">{securityLayer}</span>
        </div>
      )}

      {/* Terminal Celebration Indicator */}
      {isTerminal && (
        <div className="mt-2 flex items-center justify-between rounded bg-emerald-950/50 px-2 py-1 border border-emerald-500/30 text-[9px] text-emerald-300 font-semibold">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            Verified &amp; Certified
          </span>
          <span>Confetti 🎉</span>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// 1. OVERALL ARCHITECTURE NODE WRAPPERS
// ============================================================================
export const ClientPerimeterNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Browser Client (SPA)'}
    badge={(props.data.badge as string) || 'CLIENT INGRESS'}
    badgeColor={(props.data.badgeColor as string) || 'blue'}
    icon={<Radio className="h-3.5 w-3.5" />}
    statusBadge="HTTPS / WSS"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const SecurityFilterNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Perimeter WAF Gate'}
    badge={(props.data.badge as string) || 'PERIMETER WAF'}
    badgeColor={(props.data.badgeColor as string) || 'indigo'}
    icon={<ShieldCheck className="h-3.5 w-3.5" />}
    statusBadge="ACTIVE WAF"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const AuthRateLimiterNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Auth & Rate-Limiter'}
    badge={(props.data.badge as string) || 'IDENTITY GUARD'}
    badgeColor={(props.data.badgeColor as string) || 'cyan'}
    icon={<KeyRound className="h-3.5 w-3.5" />}
    statusBadge="PBKDF2 100k"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const CsrfGuardNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Double-Submit Anti-CSRF'}
    badge={(props.data.badge as string) || 'STATE GUARD'}
    badgeColor={(props.data.badgeColor as string) || 'purple'}
    icon={<Lock className="h-3.5 w-3.5" />}
    statusBadge="TIMING-SAFE"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const RbacGateNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'RBAC & IDOR Gate'}
    badge={(props.data.badge as string) || 'ACCESS CONTROL'}
    badgeColor={(props.data.badgeColor as string) || 'teal'}
    icon={<Eye className="h-3.5 w-3.5" />}
    statusBadge="ZERO-TRUST"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const AttendanceHmacNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Attendance HMAC-SHA256'}
    badge={(props.data.badge as string) || 'DATA INTEGRITY'}
    badgeColor={(props.data.badgeColor as string) || 'emerald'}
    icon={<Fingerprint className="h-3.5 w-3.5" />}
    statusBadge="HMAC-SHA256"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const ChatCryptoNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Hybrid RSA + AES-GCM'}
    badge={(props.data.badge as string) || 'CONFIDENTIALITY'}
    badgeColor={(props.data.badgeColor as string) || 'fuchsia'}
    icon={<Cpu className="h-3.5 w-3.5" />}
    statusBadge="AES-256-GCM"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const AuditLedgerNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Immutable Audit Ledger'}
    badge={(props.data.badge as string) || 'FORENSIC STORE'}
    badgeColor={(props.data.badgeColor as string) || 'violet'}
    icon={<FileCheck2 className="h-3.5 w-3.5" />}
    statusBadge="APPEND-ONLY"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const SqliEngineNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Wasm SQLi Defense Engine'}
    badge={(props.data.badge as string) || 'DATABASE DEFENSE'}
    badgeColor={(props.data.badgeColor as string) || 'amber'}
    icon={<Database className="h-3.5 w-3.5" />}
    statusBadge="PARAMETERIZED"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const SocTelemetryNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Real-Time SOC Gateway'}
    badge={(props.data.badge as string) || 'SOC OPERATIONS'}
    badgeColor={(props.data.badgeColor as string) || 'rose'}
    icon={<Activity className="h-3.5 w-3.5" />}
    statusBadge="SOCKET.IO WSS"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const ZeroTrustVerifiedNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Zero-Trust Certified'}
    badge={(props.data.badge as string) || 'TERMINAL OUTCOME'}
    badgeColor={(props.data.badgeColor as string) || 'emerald'}
    icon={<CheckCircle2 className="h-4 w-4" />}
    statusBadge="PASSED"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
    isTerminal={true}
  />
));

export const IncidentMitigatedNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'SOC Incident Mitigated'}
    badge={(props.data.badge as string) || 'TERMINAL OUTCOME'}
    badgeColor={(props.data.badgeColor as string) || 'fuchsia'}
    icon={<Sparkles className="h-4 w-4" />}
    statusBadge="NEUTRALIZED"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
    isTerminal={true}
  />
));


// ============================================================================
// 2. STUDENT MESSAGING FLOW NODE WRAPPERS
// ============================================================================
export const MsgSenderUiNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Student Sender Compose Client'}
    badge={(props.data.badge as string) || 'STUDENT SENDER'}
    badgeColor="blue"
    icon={<Send className="h-3.5 w-3.5" />}
    statusBadge="LOCAL MEMORY"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const MsgEphemeralKeyNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Ephemeral AES-256 Session Key Gen'}
    badge={(props.data.badge as string) || 'KEY GENERATION'}
    badgeColor="cyan"
    icon={<Key className="h-3.5 w-3.5" />}
    statusBadge="CSPRNG 256"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const MsgRsaEnvelopeNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'RSA-2048 OAEP Key Envelope'}
    badge={(props.data.badge as string) || 'PUBLIC KEY ENVELOPE'}
    badgeColor="purple"
    icon={<Lock className="h-3.5 w-3.5" />}
    statusBadge="RSA-OAEP"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const MsgAesGcmNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'AES-256-GCM AEAD Encryptor'}
    badge={(props.data.badge as string) || 'AEAD ENCRYPTION'}
    badgeColor="fuchsia"
    icon={<Cpu className="h-3.5 w-3.5" />}
    statusBadge="AES-256-GCM"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const MsgHmacSealNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Client-Side Message HMAC Seal'}
    badge={(props.data.badge as string) || 'INTEGRITY SEAL'}
    badgeColor="emerald"
    icon={<Fingerprint className="h-3.5 w-3.5" />}
    statusBadge="HMAC-SHA256"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const MsgZkRelayNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Zero-Knowledge Socket.IO Stream'}
    badge={(props.data.badge as string) || 'ZERO-KNOWLEDGE'}
    badgeColor="indigo"
    icon={<Server className="h-3.5 w-3.5" />}
    statusBadge="WSS RELAY"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const MsgAntiXssVaultNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Anti-XSS Vault & DB Storage'}
    badge={(props.data.badge as string) || 'CIPHERTEXT VAULT'}
    badgeColor="violet"
    icon={<Database className="h-3.5 w-3.5" />}
    statusBadge="ENC:RSA-AES"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const MsgMitmDefenseNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'MitM Eavesdrop / Tamper Probe'}
    badge={(props.data.badge as string) || 'ADVERSARY PROBE'}
    badgeColor="amber"
    icon={<ShieldX className="h-3.5 w-3.5" />}
    statusBadge="BLOCKED"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const MsgRecipientClientNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Recipient Student Client'}
    badge={(props.data.badge as string) || 'RECIPIENT CLIENT'}
    badgeColor="blue"
    icon={<MessageSquare className="h-3.5 w-3.5" />}
    statusBadge="AUTHENTICATED"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const MsgRsaUnwrapperNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'RSA-2048 Private Key Unwrapper'}
    badge={(props.data.badge as string) || 'PRIVATE KEY UNWRAP'}
    badgeColor="fuchsia"
    icon={<Unlock className="h-3.5 w-3.5" />}
    statusBadge="RSA DECRYPT"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const MsgGcmAuthenticatorNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'AES-GCM Auth Tag & DOM Render'}
    badge={(props.data.badge as string) || 'AUTHENTICATED'}
    badgeColor="emerald"
    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
    statusBadge="AEAD VERIFIED"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const MsgE2eCertifiedNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'E2E Confidentiality Certified'}
    badge={(props.data.badge as string) || 'E2E CERTIFIED'}
    badgeColor="emerald"
    icon={<Sparkles className="h-4 w-4" />}
    statusBadge="100% SECURE"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
    isTerminal={true}
  />
));


// ============================================================================
// 3. ATTENDANCE TAMPERING FLOW NODE WRAPPERS
// ============================================================================
export const AttStudentBeaconNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Student Check-In Device'}
    badge={(props.data.badge as string) || 'CLIENT CHECK-IN'}
    badgeColor="blue"
    icon={<Radio className="h-3.5 w-3.5" />}
    statusBadge="GPS INGRESS"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const AttGeofenceGateNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Geofence & Session Gate'}
    badge={(props.data.badge as string) || 'PHYSICAL PERIMETER'}
    badgeColor="teal"
    icon={<MapPin className="h-3.5 w-3.5" />}
    statusBadge="< 50m RADIUS"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const AttCanonicalSerializerNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Canonical String Serializer'}
    badge={(props.data.badge as string) || 'CANONICAL FORMAT'}
    badgeColor="cyan"
    icon={<Binary className="h-3.5 w-3.5" />}
    statusBadge="DETERMINISTIC"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const AttHmacEngineNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'HMAC-SHA256 Integrity Engine'}
    badge={(props.data.badge as string) || 'HMAC CRYPTO'}
    badgeColor="emerald"
    icon={<Fingerprint className="h-3.5 w-3.5" />}
    statusBadge="HMAC-SHA256"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const AttHashChainBlockNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Chained Ledger Block Store'}
    badge={(props.data.badge as string) || 'CHAINED LEDGER'}
    badgeColor="violet"
    icon={<Database className="h-3.5 w-3.5" />}
    statusBadge="BLOCK MERKLE"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const AttAttackerTamperNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Adversary DB Tampering Attack'}
    badge={(props.data.badge as string) || 'ATTACK VECTOR'}
    badgeColor="rose"
    icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-400" />}
    statusBadge="PROBE FLAGGED"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const AttConstantTimeSweepNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Constant-Time Verification Sweep'}
    badge={(props.data.badge as string) || 'VERIFICATION SWEEP'}
    badgeColor="amber"
    icon={<Activity className="h-3.5 w-3.5" />}
    statusBadge="timingSafeEqual"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const AttTamperAlarmNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Tamper Alarm & Forensic Diff'}
    badge={(props.data.badge as string) || 'TAMPER DETECTED'}
    badgeColor="rose"
    icon={<ShieldAlert className="h-3.5 w-3.5 text-rose-400" />}
    statusBadge="CRITICAL ALARM"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const AttSiemBroadcastNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Automated SIEM / SOC Dispatch'}
    badge={(props.data.badge as string) || 'SIEM TELEMETRY'}
    badgeColor="rose"
    icon={<Zap className="h-3.5 w-3.5" />}
    statusBadge="SOC ALERT"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const AttQuarantineGuardNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Quarantine & Dynamic Account Ban'}
    badge={(props.data.badge as string) || 'ACTIVE REMEDIATION'}
    badgeColor="purple"
    icon={<Lock className="h-3.5 w-3.5" />}
    statusBadge="ISOLATED"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

export const AttForensicCertifiedNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Attendance Ledger Certified'}
    badge={(props.data.badge as string) || 'LEDGER CERTIFIED'}
    badgeColor="emerald"
    icon={<Sparkles className="h-4 w-4" />}
    statusBadge="100% INTACT"
    description={props.data.description as string}
    protocol={props.data.protocol as string}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
    isTerminal={true}
  />
));

// Generic fallback node
export const GenericCardNode = memo((props: NodeProps) => (
  <ArchitectureNodeCard
    {...props.data}
    title={(props.data.title as string) || 'Architecture Component'}
    badge={(props.data.badge as string) || 'SUBSYSTEM'}
    badgeColor={(props.data.badgeColor as string) || 'blue'}
    icon={<ShieldCheck className="h-3.5 w-3.5" />}
    statusBadge="VERIFIED"
    description={(props.data.description as string) || ''}
    protocol={(props.data.protocol as string) || 'HTTPS'}
    specFormula={props.data.specFormula as string}
    securityLayer={props.data.securityLayer as string}
    isActive={Boolean(props.data.isActive)}
    selected={props.selected}
  />
));

// Registered Node Types Mapping
export const nodeTypes = {
  // Overall Flow
  clientPerimeter: ClientPerimeterNode,
  securityFilter: SecurityFilterNode,
  authRateLimiter: AuthRateLimiterNode,
  csrfGuard: CsrfGuardNode,
  rbacGate: RbacGateNode,
  attendanceHmac: AttendanceHmacNode,
  chatCrypto: ChatCryptoNode,
  auditLedger: AuditLedgerNode,
  sqliEngine: SqliEngineNode,
  socTelemetry: SocTelemetryNode,
  zeroTrustVerified: ZeroTrustVerifiedNode,
  incidentMitigated: IncidentMitigatedNode,

  // Student Messaging Flow
  msgSenderUi: MsgSenderUiNode,
  msgEphemeralKey: MsgEphemeralKeyNode,
  msgRsaEnvelope: MsgRsaEnvelopeNode,
  msgAesGcm: MsgAesGcmNode,
  msgHmacSeal: MsgHmacSealNode,
  msgZkRelay: MsgZkRelayNode,
  msgAntiXssVault: MsgAntiXssVaultNode,
  msgMitmDefense: MsgMitmDefenseNode,
  msgRecipientClient: MsgRecipientClientNode,
  msgRsaUnwrapper: MsgRsaUnwrapperNode,
  msgGcmAuthenticator: MsgGcmAuthenticatorNode,
  msgE2eCertified: MsgE2eCertifiedNode,

  // Attendance Tampering Flow
  attStudentBeacon: AttStudentBeaconNode,
  attGeofenceGate: AttGeofenceGateNode,
  attCanonicalSerializer: AttCanonicalSerializerNode,
  attHmacEngine: AttHmacEngineNode,
  attHashChainBlock: AttHashChainBlockNode,
  attAttackerTamper: AttAttackerTamperNode,
  attConstantTimeSweep: AttConstantTimeSweepNode,
  attTamperAlarm: AttTamperAlarmNode,
  attSiemBroadcast: AttSiemBroadcastNode,
  attQuarantineGuard: AttQuarantineGuardNode,
  attForensicCertified: AttForensicCertifiedNode,

  // Generic
  default: GenericCardNode,
};
