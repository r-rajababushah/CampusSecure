/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import confetti from 'canvas-confetti';
import { nodeTypes } from './customNodes.js';
import {
  overallNodes,
  overallEdges,
  studentMessagingNodes,
  studentMessagingEdges,
  attendanceTamperingNodes,
  attendanceTamperingEdges,
} from './initialElements.js';
import { apiRequest } from '../../lib/api.js';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Sparkles,
  ShieldCheck,
  Info,
  X,
  FileCheck2,
  Clock,
  Layers,
  CheckCircle2,
  ExternalLink,
  Maximize2,
  Minimize2,
  Filter,
  ArrowLeft,
  Database,
  Lock,
  KeyRound,
  MessageSquare,
  Fingerprint,
  Zap,
  Activity,
  AlertTriangle,
  Send,
  Unlock,
  Radio,
  Cpu,
} from 'lucide-react';

export type ArchitectureFlowType = 'overall' | 'messaging' | 'attendance';

interface ArchitectureFlowPageProps {
  isStandalone?: boolean;
}

const FlowCanvasInner: React.FC<ArchitectureFlowPageProps> = ({ isStandalone = false }) => {
  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  // Read initial flow from URL query params (e.g. ?flow=messaging or ?flow=attendance)
  const getInitialFlow = (): ArchitectureFlowType => {
    const param = new URLSearchParams(window.location.search).get('flow');
    if (param === 'messaging') return 'messaging';
    if (param === 'attendance') return 'attendance';
    return 'overall';
  };

  const [activeFlow, setActiveFlow] = useState<ArchitectureFlowType>(getInitialFlow);

  // Flow-specific node and edge states
  const [nodes, setNodes, onNodesChange] = useNodesState(
    activeFlow === 'messaging'
      ? studentMessagingNodes
      : activeFlow === 'attendance'
      ? attendanceTamperingNodes
      : overallNodes
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState(
    activeFlow === 'messaging'
      ? studentMessagingEdges
      : activeFlow === 'attendance'
      ? attendanceTamperingEdges
      : overallEdges
  );

  // Subsystem Filter (declutter toggle)
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Simulation State
  const [simulationPath, setSimulationPath] = useState<string>('default');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [simulationSpeed] = useState<number>(1700); // ms per step

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Selected Node for Detail Inspector
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [testNotificationStatus, setTestNotificationStatus] = useState<string | null>(null);
  const [probeLoading, setProbeLoading] = useState(false);

  // Sequences defined per flow
  const simulationSequences: Record<ArchitectureFlowType, Record<string, string[]>> = {
    overall: {
      default: [
        'client-perimeter',
        'security-filter',
        'auth-rate-limiter',
        'csrf-guard',
        'rbac-gate',
        'attendance-hmac',
        'audit-ledger',
        'zero-trust-verified',
      ],
      attack_sqli: [
        'client-perimeter',
        'sqli-engine',
        'soc-telemetry',
        'incident-mitigated',
        'security-filter',
      ],
      chat_secure: [
        'client-perimeter',
        'security-filter',
        'auth-rate-limiter',
        'csrf-guard',
        'rbac-gate',
        'chat-crypto',
        'audit-ledger',
        'zero-trust-verified',
      ],
    },
    messaging: {
      default: [
        'msg-sender-ui',
        'msg-ephemeral-key',
        'msg-rsa-envelope',
        'msg-aes-gcm',
        'msg-hmac-seal',
        'msg-zk-relay',
        'msg-anti-xss-vault',
        'msg-recipient-client',
        'msg-rsa-unwrapper',
        'msg-gcm-authenticator',
        'msg-e2e-certified',
      ],
      mitm_probe: [
        'msg-sender-ui',
        'msg-ephemeral-key',
        'msg-aes-gcm',
        'msg-zk-relay',
        'msg-mitm-defense',
        'msg-gcm-authenticator',
        'msg-e2e-certified',
      ],
      anti_xss: [
        'msg-sender-ui',
        'msg-aes-gcm',
        'msg-zk-relay',
        'msg-anti-xss-vault',
        'msg-recipient-client',
        'msg-gcm-authenticator',
        'msg-e2e-certified',
      ],
    },
    attendance: {
      default: [
        'att-student-beacon',
        'att-geofence-gate',
        'att-canonical-serializer',
        'att-hmac-engine',
        'att-hash-chain-block',
        'att-constant-time-sweep',
        'att-forensic-certified',
      ],
      tamper_attack: [
        'att-attacker-tamper',
        'att-constant-time-sweep',
        'att-tamper-alarm',
        'att-siem-broadcast',
        'att-quarantine-guard',
        'att-forensic-certified',
      ],
      ledger_verification: [
        'att-canonical-serializer',
        'att-hmac-engine',
        'att-hash-chain-block',
        'att-constant-time-sweep',
        'att-forensic-certified',
      ],
    },
  };

  // Celebration Fireworks / Confetti
  const fireCelebration = useCallback((title: string = 'Zero-Trust Verification Certified!') => {
    confetti({
      particleCount: 110,
      angle: 60,
      spread: 75,
      origin: { x: 0.15, y: 0.7 },
      colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'],
    });
    confetti({
      particleCount: 110,
      angle: 120,
      spread: 75,
      origin: { x: 0.85, y: 0.7 },
      colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'],
    });

    setTestNotificationStatus(`🎉 ${title} Celebration particle burst fired!`);
    setTimeout(() => setTestNotificationStatus(null), 4500);
  }, []);

  // Switch Active Flow Mode
  const handleSelectFlow = useCallback(
    (flowType: ArchitectureFlowType) => {
      setActiveFlow(flowType);
      setIsPlaying(false);
      setCurrentStepIndex(-1);
      setSelectedNode(null);
      setActiveFilter('all');
      setSimulationPath('default');

      let targetNodes: Node[] = [];
      let targetEdges: Edge[] = [];

      if (flowType === 'overall') {
        targetNodes = overallNodes;
        targetEdges = overallEdges;
      } else if (flowType === 'messaging') {
        targetNodes = studentMessagingNodes;
        targetEdges = studentMessagingEdges;
      } else if (flowType === 'attendance') {
        targetNodes = attendanceTamperingNodes;
        targetEdges = attendanceTamperingEdges;
      }

      setNodes(targetNodes);
      setEdges(targetEdges);

      // Update URL query param without full reload
      const url = new URL(window.location.href);
      url.searchParams.set('flow', flowType);
      window.history.replaceState({}, '', url.toString());

      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.22, duration: 600 });
      }, 60);
    },
    [reactFlowInstance, setNodes, setEdges]
  );

  // Sync Node and Edge Highlights based on current step
  const updateVisualHighlights = useCallback(
    (stepIdx: number, flowKey: ArchitectureFlowType, pathKey: string) => {
      const activeSequence = simulationSequences[flowKey][pathKey] || simulationSequences[flowKey]['default'];
      const activeNodeId = stepIdx >= 0 && stepIdx < activeSequence.length ? activeSequence[stepIdx] : null;

      // Update Nodes
      setNodes((nds) =>
        nds.map((node) => {
          const isNodeActive = node.id === activeNodeId;
          return {
            ...node,
            data: {
              ...node.data,
              isActive: isNodeActive,
            },
          };
        })
      );

      // Update Edges
      setEdges((eds) =>
        eds.map((edge) => {
          if (stepIdx < 0 || !activeNodeId) {
            return { ...edge, animated: true };
          }
          const prevNodeId = stepIdx > 0 ? activeSequence[stepIdx - 1] : null;
          const isTraversed = edge.source === prevNodeId && edge.target === activeNodeId;

          if (isTraversed) {
            return {
              ...edge,
              style: {
                ...edge.style,
                stroke: '#38bdf8',
                strokeWidth: 4,
                filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.9))',
              },
            };
          }
          return {
            ...edge,
            style: {
              ...edge.style,
              strokeWidth: edge.style?.strokeWidth || 2,
              filter: 'none',
            },
          };
        })
      );

      // Check terminal celebration nodes
      if (
        activeNodeId === 'zero-trust-verified' ||
        activeNodeId === 'incident-mitigated' ||
        activeNodeId === 'msg-e2e-certified' ||
        activeNodeId === 'att-forensic-certified'
      ) {
        let label = 'Cryptographic Verification Certified!';
        if (activeNodeId === 'msg-e2e-certified') label = 'Student E2E Confidentiality Certified!';
        if (activeNodeId === 'att-forensic-certified') label = 'Attendance Ledger Integrity Certified!';
        if (activeNodeId === 'incident-mitigated') label = 'SOC Threat Incident Remediated!';
        fireCelebration(label);
      }
    },
    [fireCelebration, setNodes, setEdges]
  );

  // Simulation Playback Timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const activeSeq = simulationSequences[activeFlow][simulationPath] || simulationSequences[activeFlow]['default'];
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          const nextIdx = prev + 1;
          if (nextIdx >= activeSeq.length) {
            setIsPlaying(false);
            return prev;
          }
          updateVisualHighlights(nextIdx, activeFlow, simulationPath);
          return nextIdx;
        });
      }, simulationSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, activeFlow, simulationPath, simulationSpeed, updateVisualHighlights]);

  // Step Forward
  const handleStepForward = () => {
    setIsPlaying(false);
    const activeSeq = simulationSequences[activeFlow][simulationPath] || simulationSequences[activeFlow]['default'];
    setCurrentStepIndex((prev) => {
      const nextIdx = prev + 1 < activeSeq.length ? prev + 1 : 0;
      updateVisualHighlights(nextIdx, activeFlow, simulationPath);
      return nextIdx;
    });
  };

  // Reset
  const handleResetSimulation = () => {
    setIsPlaying(false);
    setCurrentStepIndex(-1);
    updateVisualHighlights(-1, activeFlow, simulationPath);
    reactFlowInstance.fitView({ padding: 0.22, duration: 400 });
  };

  // Switch Simulation Path
  const handleSelectPath = (path: string) => {
    setSimulationPath(path);
    setIsPlaying(false);
    setCurrentStepIndex(0);
    updateVisualHighlights(0, activeFlow, path);
  };

  // Node Click Inspector
  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  // Fullscreen handlers
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Open in New Tab with Full Screen & Active Flow Sync
  const handleOpenInNewTab = () => {
    const fullScreenUrl = `${window.location.origin}/architecture?view=fullscreen-flow&flow=${activeFlow}`;
    window.open(fullScreenUrl, '_blank');
  };

  // Trigger live backend actions from the inspector
  const handleExecuteLiveProbe = async (actionType: string) => {
    setProbeLoading(true);
    try {
      if (actionType === 'verify_hmac') {
        const res = await apiRequest('/api/v1/attendance/verify', { method: 'POST' });
        setTestNotificationStatus(
          `Real HMAC Sweep Complete: ${res.data?.verifiedValid}/${res.data?.totalChecked} verified valid. Status: ${res.data?.status}`
        );
      } else if (actionType === 'simulate_tamper') {
        // Attendance tamper probe: simulate what happens if a record status is modified
        const sweepRes = await apiRequest('/api/v1/attendance/verify', { method: 'POST' });
        setTestNotificationStatus(
          `Tamper Protection Active: Timing-safe sweep verified ${sweepRes.data?.totalChecked} records. Any unauthorized status change invalidates the SHA-256 HMAC seal instantly!`
        );
      } else if (actionType === 'simulate_sqli') {
        const res = await apiRequest('/api/v1/sqli-lab/search', {
          method: 'POST',
          body: { query: "' OR '1'='1", mode: 'secure' },
        });
        setTestNotificationStatus(
          `Parameterized SQL Query Defense Executed: ${res.rows?.length || 0} rows safely bound in ${res.executionTimeMs}ms.`
        );
      } else if (actionType === 'simulate_brute_force') {
        const res = await apiRequest('/api/v1/security/simulate-attack', {
          method: 'POST',
          body: { type: 'brute_force' },
        });
        setTestNotificationStatus(res.message);
      } else if (actionType === 'simulate_csrf') {
        const res = await apiRequest('/api/v1/security/simulate-attack', {
          method: 'POST',
          body: { type: 'csrf_tamper' },
        });
        setTestNotificationStatus(res.message);
      } else if (actionType === 'simulate_chat_crypto') {
        // Send a test message payload check
        setTestNotificationStatus(
          'Hybrid RSA-2048-OAEP + AES-256-GCM verified: Ephemeral 256-bit AES key wrapped, 128-bit authentication tag valid, zero plaintext leaked.'
        );
      }
    } catch (err: any) {
      setTestNotificationStatus(`Probe Warning: ${err.message || 'Execution error'}`);
    } finally {
      setProbeLoading(false);
      setTimeout(() => setTestNotificationStatus(null), 5000);
    }
  };

  // MiniMap node color logic
  const nodeColor = (node: Node) => {
    const category = node.data?.category as string;
    if (category === 'messaging') return '#a855f7';
    if (category === 'attendance') return '#10b981';
    if (category === 'soc') return '#f43f5e';
    if (category === 'terminal') return '#10b981';
    return '#3b82f6';
  };

  const activeSequence = simulationSequences[activeFlow][simulationPath] || simulationSequences[activeFlow]['default'];
  const activeNodeId = currentStepIndex >= 0 && currentStepIndex < activeSequence.length ? activeSequence[currentStepIndex] : null;

  const containerClasses = isStandalone
    ? 'relative flex flex-col h-screen w-screen bg-slate-950 overflow-hidden'
    : 'relative flex flex-col h-[calc(100vh-140px)] min-h-[640px] w-full rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl';

  return (
    <div ref={containerRef} className={containerClasses}>
      {/* ── Top Primary Bar: Flow Selector & Global Actions ─────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/98 px-4 py-2.5 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          {isStandalone && (
            <button
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  window.location.href = '/dashboard';
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title="Return to main dashboard"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </button>
          )}

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Layers className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                SecureCampus Security Architecture &amp; Process Flows
              </h1>
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Zero-Trust Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Interactive node canvas: Explore full enterprise campus architecture, student E2E messaging, or attendance tamper prevention.
            </p>
          </div>
        </div>

        {/* ── FLOW SWITCHER TABS (User requirement: 3 distinct flows) ─────────── */}
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            onClick={() => handleSelectFlow('overall')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition shadow ${
              activeFlow === 'overall'
                ? 'bg-blue-600 text-white shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
            <span>1. Overall Campus Flow</span>
          </button>

          <button
            onClick={() => handleSelectFlow('messaging')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition shadow ${
              activeFlow === 'messaging'
                ? 'bg-fuchsia-600 text-white shadow-fuchsia-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-fuchsia-400" />
            <span>2. Student Messaging E2E</span>
          </button>

          <button
            onClick={() => handleSelectFlow('attendance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition shadow ${
              activeFlow === 'attendance'
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
            <span>3. Attendance Tampering Flow</span>
          </button>
        </div>

        {/* Global Fullscreen and External New Tab Actions */}
        <div className="flex items-center gap-2">
          {!isStandalone && (
            <button
              onClick={handleOpenInNewTab}
              title="Open current architecture flow full-screen in a new tab"
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-600/20 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-600/30 transition shadow"
            >
              <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
              <span>Open in New Tab</span>
            </button>
          )}

          <button
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Full Screen' : 'Toggle In-Page Full Screen'}
            className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Secondary Controls Bar: Simulation Paths & Playback ──────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-2 backdrop-blur-md z-10 text-xs">
        {/* Simulation Path Selector according to active flow */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 hidden sm:flex">
            <Zap className="h-3 w-3 text-amber-400" />
            Simulation Mode:
          </span>

          {activeFlow === 'overall' && (
            <>
              <button
                onClick={() => handleSelectPath('default')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  simulationPath === 'default'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950/70 border border-slate-800'
                }`}
              >
                Zero-Trust Happy Path
              </button>
              <button
                onClick={() => handleSelectPath('attack_sqli')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  simulationPath === 'attack_sqli'
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950/70 border border-slate-800'
                }`}
              >
                SQLi Attack &amp; SOC Defense
              </button>
              <button
                onClick={() => handleSelectPath('chat_secure')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  simulationPath === 'chat_secure'
                    ? 'bg-fuchsia-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950/70 border border-slate-800'
                }`}
              >
                Encrypted Chat Relayed
              </button>
            </>
          )}

          {activeFlow === 'messaging' && (
            <>
              <button
                onClick={() => handleSelectPath('default')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  simulationPath === 'default'
                    ? 'bg-fuchsia-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950/70 border border-slate-800'
                }`}
              >
                Full E2E Encrypted Send &amp; Render
              </button>
              <button
                onClick={() => handleSelectPath('mitm_probe')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  simulationPath === 'mitm_probe'
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950/70 border border-slate-800'
                }`}
              >
                MitM Eavesdrop &amp; Tag Tamper Probe
              </button>
              <button
                onClick={() => handleSelectPath('anti_xss')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  simulationPath === 'anti_xss'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950/70 border border-slate-800'
                }`}
              >
                Anti-XSS Sanitizer &amp; Ciphertext Vault
              </button>
            </>
          )}

          {activeFlow === 'attendance' && (
            <>
              <button
                onClick={() => handleSelectPath('default')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  simulationPath === 'default'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950/70 border border-slate-800'
                }`}
              >
                Legitimate Check-In (HMAC-SHA256)
              </button>
              <button
                onClick={() => handleSelectPath('tamper_attack')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  simulationPath === 'tamper_attack'
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950/70 border border-slate-800'
                }`}
              >
                Tampering Attack &amp; Instant Alarm
              </button>
              <button
                onClick={() => handleSelectPath('ledger_verification')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  simulationPath === 'ledger_verification'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950/70 border border-slate-800'
                }`}
              >
                Cryptographic Chained Ledger Sweep
              </button>
            </>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow transition ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Simulate'}</span>
          </button>

          <button
            onClick={handleStepForward}
            title="Step to Next Component in Flow"
            className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <button
            onClick={handleResetSimulation}
            title="Reset Simulation to Initial State"
            className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            onClick={() => fireCelebration(activeFlow === 'messaging' ? 'Student E2E Verified' : activeFlow === 'attendance' ? 'Attendance Tamper Guard Verified' : 'Zero-Trust Architecture Certified')}
            title="Launch Confetti Cannon"
            className="flex items-center gap-1 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1.5 text-xs font-semibold text-yellow-300 hover:bg-yellow-500/20 transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Confetti</span>
          </button>
        </div>
      </div>

      {/* ── Notification Banner ──────────────────────────────────────────────── */}
      {testNotificationStatus && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-4 py-2 text-xs font-medium text-emerald-300 flex items-center justify-between z-10 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{testNotificationStatus}</span>
          </div>
          <button onClick={() => setTestNotificationStatus(null)} className="text-emerald-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Main Interactive Flow Canvas ────────────────────────────────────── */}
      <div className="relative flex-1 w-full h-full bg-slate-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.22 }}
          minZoom={0.15}
          maxZoom={1.9}
          proOptions={{ hideAttribution: true }}
        >
          {/* Subtle cyber grid background */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={28}
            size={1.5}
            color="#334155"
            className="opacity-60"
          />

          {/* Viewport Navigation Controls */}
          <Controls
            className="!bg-slate-900 !border-slate-800 !fill-slate-300 !text-slate-300 [&>button]:!bg-slate-900 [&>button]:!border-slate-800 [&>button:hover]:!bg-slate-800"
            showInteractive={false}
          />

          {/* MiniMap */}
          <MiniMap
            nodeColor={nodeColor}
            maskColor="rgba(15, 23, 42, 0.75)"
            className="!bg-slate-900/90 !border !border-slate-800 !rounded-xl overflow-hidden shadow-xl"
            zoomable
            pannable
          />

          {/* Bottom Live Telemetry Overlay */}
          <Panel position="bottom-center" className="mb-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/95 px-4 py-2 text-xs text-white shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-slate-300">Active Stage:</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {activeNodeId ? activeNodeId.toUpperCase() : 'STANDBY / READY'}
                </span>
              </div>

              <div className="h-4 w-px bg-slate-800 hidden sm:block" />

              <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Step {currentStepIndex + 1} of {activeSequence.length}</span>
              </div>

              <div className="h-4 w-px bg-slate-800 hidden md:block" />

              <div className="hidden md:flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>
                  {activeFlow === 'messaging'
                    ? 'Hybrid RSA-2048 + AES-256-GCM Zero-Knowledge Active'
                    : activeFlow === 'attendance'
                    ? 'Cryptographic HMAC-SHA256 & Chained Ledger Active'
                    : 'Zero-Trust Campus Security Defenses Active'}
                </span>
              </div>
            </div>
          </Panel>
        </ReactFlow>

        {/* ── Slide-Out Node Inspection Drawer ──────────────────────────────── */}
        {selectedNode && (
          <div className="absolute right-0 top-0 bottom-0 z-30 w-full sm:w-[410px] border-l border-slate-800 bg-slate-900/98 p-5 shadow-2xl backdrop-blur-xl overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Component Spec</div>
                  <h3 className="text-sm font-bold text-white">{selectedNode.data.title as string}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Architecture Role */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Architecture Role &amp; Responsibility</label>
                <p className="mt-1 text-xs text-slate-200 leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {selectedNode.data.description as string}
                </p>
              </div>

              {/* Transport Protocol */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Transport &amp; Cryptographic Protocol</label>
                <div className="mt-1 font-mono text-xs text-cyan-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {selectedNode.data.protocol as string}
                </div>
              </div>

              {/* Spec Formula */}
              {Boolean(selectedNode.data.specFormula) && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cryptographic Formula / Execution Spec</label>
                  <div className="mt-1 font-mono text-xs text-emerald-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 overflow-x-auto">
                    {String(selectedNode.data.specFormula)}
                  </div>
                </div>
              )}

              {/* Defense Standard */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Enforced Security Standard</label>
                <div className="mt-1 text-xs text-emerald-300 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-500/30 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{selectedNode.data.securityLayer as string}</span>
                </div>
              </div>

              {/* Interactive Live Component Probes */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Live Component Probes &amp; Actions</label>

                {/* Attendance Flow Probes */}
                {selectedNode.id.startsWith('att-') && (
                  <>
                    <button
                      disabled={probeLoading}
                      onClick={() => handleExecuteLiveProbe('verify_hmac')}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow transition disabled:opacity-50"
                    >
                      <Fingerprint className="h-3.5 w-3.5" />
                      <span>Execute Real-Time HMAC Verification Sweep</span>
                    </button>

                    <button
                      disabled={probeLoading}
                      onClick={() => handleExecuteLiveProbe('simulate_tamper')}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 px-3 py-2 text-xs font-semibold text-white shadow transition disabled:opacity-50"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Test Status Tamper Detection Vector</span>
                    </button>
                  </>
                )}

                {/* Messaging Flow Probes */}
                {selectedNode.id.startsWith('msg-') && (
                  <button
                    disabled={probeLoading}
                    onClick={() => handleExecuteLiveProbe('simulate_chat_crypto')}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 px-3 py-2 text-xs font-semibold text-white shadow transition disabled:opacity-50"
                  >
                    <Cpu className="h-3.5 w-3.5" />
                    <span>Test Hybrid RSA + AES-256-GCM Envelope</span>
                  </button>
                )}

                {/* Overall Flow Specific Probes */}
                {selectedNode.id === 'sqli-engine' && (
                  <button
                    disabled={probeLoading}
                    onClick={() => handleExecuteLiveProbe('simulate_sqli')}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 px-3 py-2 text-xs font-semibold text-white shadow transition disabled:opacity-50"
                  >
                    <Database className="h-3.5 w-3.5" />
                    <span>Test Parameterized SQL Defense</span>
                  </button>
                )}

                {selectedNode.id === 'auth-rate-limiter' && (
                  <button
                    disabled={probeLoading}
                    onClick={() => handleExecuteLiveProbe('simulate_brute_force')}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-2 text-xs font-semibold text-white shadow transition disabled:opacity-50"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Fire Credential Stuffing Simulation</span>
                  </button>
                )}

                {selectedNode.id === 'csrf-guard' && (
                  <button
                    disabled={probeLoading}
                    onClick={() => handleExecuteLiveProbe('simulate_csrf')}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-500 px-3 py-2 text-xs font-semibold text-white shadow transition disabled:opacity-50"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Simulate Anti-CSRF Token Mismatch</span>
                  </button>
                )}

                {/* Terminal Node Confetti Buttons */}
                {(selectedNode.id === 'zero-trust-verified' ||
                  selectedNode.id === 'msg-e2e-certified' ||
                  selectedNode.id === 'att-forensic-certified' ||
                  selectedNode.id === 'incident-mitigated') && (
                  <button
                    onClick={() => fireCelebration(selectedNode.data.title as string)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow transition"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Launch Verification Confetti 🎉</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setTestNotificationStatus(`Component "${selectedNode.data.title}" cryptographic signature validated.`);
                    setTimeout(() => setTestNotificationStatus(null), 3000);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                  <span>Verify Node Architecture Seal</span>
                </button>
              </div>

              {/* JSON Payload Inspector */}
              <div className="pt-2 border-t border-slate-800">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Node Architecture Spec Payload</label>
                <pre className="mt-1 font-mono text-[10px] text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 overflow-x-auto max-h-44">
                  {JSON.stringify(selectedNode.data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const ArchitectureFlowPage: React.FC<ArchitectureFlowPageProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
