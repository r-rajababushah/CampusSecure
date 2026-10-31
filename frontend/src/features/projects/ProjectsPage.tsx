import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { apiRequest } from '../../lib/api.js';
import { decryptMessageFromTransport, encryptMessageForTransport } from '../../lib/secureMessaging.js';
import { useSecurityMode } from '../security-center/SecurityModeContext.js';
import { useSecurityProcess } from '../../hooks/useSecurityProcess.js';
import { SecurityProcessModal } from '../../components/security/SecurityProcessModal.js';
import { Project, ProjectMember, Task, ChatMessage } from '../../types/index.js';
import {
  FolderKanban,
  Plus,
  Send,
  Users,
  MessageSquare,
  CheckSquare,
  Shield,
  UserPlus,
  Trash2,
  X,
  AlertCircle,
  Calendar,
  Lock,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const { isSecure } = useSecurityMode();
  const securityProcess = useSecurityProcess();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat' | 'members'>('tasks');

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Members state
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteRole, setInviteRole] = useState<'leader' | 'member'>('member');

  // Create Project state
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectNotice, setProjectNotice] = useState<string | null>(null);

  const fetchProjectMessages = async (projectId: string): Promise<ChatMessage[]> => {
    const data = await apiRequest<ChatMessage[]>(`/api/v1/messages?projectId=${projectId}`);
    return Promise.all((Array.isArray(data) ? data : []).map(async (message) => ({
      ...message,
      content: isSecure ? await decryptMessageFromTransport(message.content) : message.content,
    })));
  };

  const fetchProjects = async () => {
    try {
      const data = await apiRequest<Project[]>('/api/v1/projects');
      setProjects(data || []);
      if (!selectedProject && data && data.length > 0) {
        handleSelectProject(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load projects:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Handle project selection and load the project's data.
  const handleSelectProject = async (p: Project) => {
    setSelectedProject(p);

    // Load tasks, members, and messages
    try {
      const [tData, mData, msgData] = await Promise.all([
        apiRequest<Task[]>(`/api/v1/tasks?projectId=${p._id}`).catch((e) => {
          console.warn('Failed to fetch tasks:', e);
          return [];
        }),
        apiRequest<{ members: ProjectMember[] }>(`/api/v1/projects/${p._id}`).catch((e) => {
          console.warn('Failed to fetch members:', e);
          return { members: [] };
        }),
        fetchProjectMessages(p._id).catch((e) => {
          console.warn('Failed to fetch messages:', e);
          return [];
        }),
      ]);
      setTasks(Array.isArray(tData) ? tData : []);
      setMembers(mData?.members || []);
      setMessages(Array.isArray(msgData) ? msgData : []);
    } catch (err: any) {
      console.error('Failed to load project details:', err);
    }
  };

  // Project chat uses the native WebSocket endpoint with a polling fallback.
  useEffect(() => {
    if (!selectedProject) return;

    // Native WebSocket direct connection to FastAPI backend.
    let ws: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/projects/${selectedProject._id}?userId=${user?.id || ''}`;
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'new_chat_message' && payload.message) {
            void fetchProjectMessages(selectedProject._id).then(setMessages).catch(() => undefined);
          }
        } catch {
          // ignore parse error
        }
      };
    } catch {
      // ignore WS connection errors
    }

    // Poll for new chat messages when viewing the chat tab.
    const poller = setInterval(async () => {
      if (activeTab !== 'chat') return;
      try {
        const latest = await fetchProjectMessages(selectedProject._id);
        if (Array.isArray(latest) && latest.length > 0) {
          setMessages((prev) => {
            if (latest.length !== prev.length || latest[latest.length - 1]._id !== prev[prev.length - 1]?._id) {
              return latest;
            }
            return prev;
          });
        }
      } catch {
        // ignore polling errors
      }
    }, 2500);

    return () => {
      if (ws) ws.close();
      clearInterval(poller);
    };
  }, [selectedProject, activeTab, user, isSecure]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !messageInput.trim()) return;

    setSendingMessage(true);
    const content = messageInput.trim();
    setMessageInput('');

    try {
      const sent = await securityProcess.run({
        title: 'Secure message delivery',
        subtitle: 'Follow each protection used by the message service.',
        minDurationMs: 9000,
        steps: [
          'Compose the readable message in your browser',
          ...(isSecure ? ['Exchange the AES session key using RSA-OAEP', 'Encrypt the request with AES-256-GCM'] : ['Security mode is OFF: message remains plaintext']),
          'Authenticate sender and check project membership',
          ...(isSecure ? ['Escape unsafe HTML before storage', 'Encrypt stored content with AES-256-GCM', 'Seal ciphertext with HMAC-SHA-256 and RSA-PSS', 'Verify seals before returning message content', 'Decrypt the protected response in the recipient browser'] : ['Store and deliver the plaintext demo message']),
        ],
        visual: [
          { label: 'Readable message', value: content },
          { label: 'Encrypted API payload', value: isSecure ? 'AES-GCM envelope is being created…' : 'Plain text (security mode off)' },
          { label: 'Database content', value: isSecure ? 'RSA/AES-GCM ciphertext is being stored…' : 'Plain text' },
          { label: 'Authenticity / integrity', value: isSecure ? 'HMAC + RSA-PSS checks pending…' : 'Checks disabled' },
        ],
        resolveVisual: (result: { message: ChatMessage; renderedContent: string }) => [
          { label: 'Readable message', value: content },
          { label: 'API response', value: isSecure ? `${result.message.content.slice(0, 62)}…` : 'plaintext response (security mode off)' },
          { label: 'Database content', value: result.message.rawStoredSnippet || (result.message.isEncryptedInStorage ? 'encrypted ciphertext' : 'plaintext') },
          { label: 'Storage protection', value: result.message.isEncryptedInStorage ? 'AES-GCM ciphertext at rest' : 'plaintext at rest (security mode off)' },
          { label: 'HMAC-SHA-256', value: result.message.hmacVerified ? 'verified' : isSecure ? 'failed or unavailable' : 'disabled' },
          { label: 'Digital signature', value: result.message.signatureVerified ? `${result.message.signatureAlgorithm || 'RSA-PSS'} verified` : isSecure ? 'failed or unavailable' : 'disabled' },
          { label: 'Recipient browser', value: isSecure ? `AES-GCM decrypted after server verification: ${result.renderedContent.slice(0, 45)}${result.renderedContent.length > 45 ? '…' : ''}` : 'plaintext displayed'},
        ],
      }, async () => {
        const message = await apiRequest<ChatMessage>('/api/v1/messages', {
          method: 'POST', body: { projectId: selectedProject._id, content: isSecure ? await encryptMessageForTransport(content) : content },
        });
        const renderedContent = isSecure ? await decryptMessageFromTransport(message.content) : message.content;
        return { message, renderedContent };
      }, (result) => isSecure
        ? `Stored encrypted. HMAC and ${result.message.signatureAlgorithm || 'RSA-PSS'} signature verified.`
        : 'Delivered in insecure demo mode.');
      const resolvedMsg: ChatMessage = { ...sent.message, content: sent.renderedContent };
      setMessages((prev) => [...prev, resolvedMsg]);
    } catch (err: any) {
      setProjectNotice(`Error sending message: ${err.message}`);
      setTimeout(() => setProjectNotice(null), 4000);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !taskTitle.trim()) return;

    try {
      const created = await apiRequest<Task>('/api/v1/tasks', {
        method: 'POST',
        body: {
          projectId: selectedProject._id,
          title: taskTitle.trim(),
          description: taskDesc.trim(),
          priority: taskPriority,
          assignedTo: taskAssignee || undefined,
          dueDate: taskDueDate || undefined,
        },
      });
      setTasks((prev) => [...prev, created]);
      setShowCreateTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskDueDate('');
      setProjectNotice('Task created successfully.');
      setTimeout(() => setProjectNotice(null), 3000);
    } catch (err: any) {
      setProjectNotice(`Error: ${err.message || 'Failed to create task.'}`);
      setTimeout(() => setProjectNotice(null), 4000);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const updated = await apiRequest<Task>(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        body: { status: newStatus },
      });
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: updated.status } : t)));
    } catch (err: any) {
      setProjectNotice(`Error updating task: ${err.message}`);
      setTimeout(() => setProjectNotice(null), 4000);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !inviteIdentifier.trim()) return;

    try {
      await apiRequest(`/api/v1/projects/${selectedProject._id}/members`, {
        method: 'POST',
        body: { userEmailOrId: inviteIdentifier.trim(), role: inviteRole },
      });
      setShowInviteModal(false);
      setInviteIdentifier('');
      const mData = await apiRequest<{ members: ProjectMember[] }>(`/api/v1/projects/${selectedProject._id}`);
      setMembers(mData.members || []);
      fetchProjects();
      setProjectNotice('Team member invited successfully.');
      setTimeout(() => setProjectNotice(null), 3000);
    } catch (err: any) {
      setProjectNotice(`Error: ${err.message || 'Failed to invite user.'}`);
      setTimeout(() => setProjectNotice(null), 4000);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!selectedProject) return;

    try {
      await apiRequest(`/api/v1/projects/${selectedProject._id}/members/${targetUserId}`, {
        method: 'DELETE',
      });
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
      fetchProjects();
      setProjectNotice('Member removed.');
      setTimeout(() => setProjectNotice(null), 3000);
    } catch (err: any) {
      setProjectNotice(`Error: ${err.message || 'Failed to remove member.'}`);
      setTimeout(() => setProjectNotice(null), 4000);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) return;

    try {
      const created = await apiRequest<Project>('/api/v1/projects', {
        method: 'POST',
        body: {
          title: projectTitle.trim(),
          description: projectDesc.trim(),
          isPrivate: true,
        },
      });
      setShowCreateProjectModal(false);
      setProjectTitle('');
      setProjectDesc('');
      await fetchProjects();
      handleSelectProject(created);
      setProjectNotice(`Project space "${created.title}" created.`);
      setTimeout(() => setProjectNotice(null), 3000);
    } catch (err: any) {
      setProjectNotice(`Error: ${err.message || 'Failed to create project.'}`);
      setTimeout(() => setProjectNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Project Collaboration & Secure Chat</h1>
          <p className="text-xs text-slate-500">
            Private project spaces, task tracking, and authenticated real-time group chat
          </p>
        </div>
        <button
          onClick={() => setShowCreateProjectModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          <span>New Project Space</span>
        </button>
      </div>

      {projectNotice && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-sm flex items-center justify-between">
          <span>{projectNotice}</span>
          <button onClick={() => setProjectNotice(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Grid: Projects on Left, Active Space Workspace on Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Projects list */}
        <div className="space-y-3 lg:col-span-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Your Project Spaces ({projects.length})
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
              You are not a member of any project spaces yet. Click "New Project Space" to start one.
            </div>
          ) : (
            projects.map((p) => {
              const isSelected = selectedProject?._id === p._id;
              return (
                <div
                  key={p._id}
                  onClick={() => handleSelectProject(p)}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/40 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-xs">{p.title}</h3>
                      <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">{p.description || 'No description'}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded capitalize">
                      {p.myRole}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-slate-400" />
                      {p.memberCount || 1} members
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3 text-emerald-600" />
                      Private
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Active Space Workspace */}
        <div className="space-y-4 lg:col-span-8">
          {selectedProject ? (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[560px]">
              {/* Workspace Header */}
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{selectedProject.title}</h2>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Lock className="h-3 w-3 text-emerald-600" />
                        Access-Controlled
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{selectedProject.description}</p>
                  </div>
                  <div className="text-xs text-slate-500">
                    Role: <span className="font-semibold text-slate-800 capitalize">{selectedProject.myRole}</span>
                  </div>
                </div>

                {/* Workspace Navigation Tabs */}
                <div className="mt-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      activeTab === 'tasks'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>Tasks ({tasks.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      activeTab === 'chat'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Secure Chat</span>
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </button>

                  <button
                    onClick={() => setActiveTab('members')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      activeTab === 'members'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Team Members ({members.length})</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: TASKS */}
              {activeTab === 'tasks' && (
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Project Tasks & Deliverables
                    </h3>
                    <button
                      onClick={() => setShowCreateTaskModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Task</span>
                    </button>
                  </div>

                  {tasks.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No tasks assigned yet. Click "Add Task" to track deliverables.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <div
                          key={task._id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-200 p-3 hover:border-slate-300"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 text-xs">{task.title}</span>
                              <span
                                className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded ${
                                  task.priority === 'high'
                                    ? 'bg-red-50 text-red-700'
                                    : task.priority === 'medium'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {task.priority}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">{task.description}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span>Assignee: {task.assigneeName || 'Unassigned'}</span>
                              {task.dueDate && <span>· Due: {task.dueDate}</span>}
                            </div>
                          </div>

                          <div className="mt-2 sm:mt-0 flex items-center gap-2">
                            <select
                              value={task.status}
                              onChange={(e: any) => handleUpdateTaskStatus(task._id, e.target.value)}
                              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="review">Under Review</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SECURE GROUP CHAT */}
              {activeTab === 'chat' && (
                <div className="flex flex-col flex-1 h-[460px]">
                  {/* Chat Security Banner */}
                  <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded px-1.5 py-0.5 font-medium">
                        <Lock className="h-3 w-3" />
                        <span>{isSecure ? 'AES-256-GCM protected transit and storage' : 'Plaintext demo mode'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200/60 rounded px-1.5 py-0.5 font-medium">
                        <Shield className="h-3 w-3" />
                        <span>{isSecure ? 'HMAC-SHA-256 + RSA-PSS verified' : 'Integrity seals disabled'}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Real-Time Live Socket Active
                    </span>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="py-16 text-center text-xs text-slate-400">
                        No messages exchanged yet. Send the first message to your teammates below!
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.senderId === user?.id;
                        return (
                          <div
                            key={msg._id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <div className="flex items-baseline gap-2 mb-0.5">
                              <span className="text-[11px] font-semibold text-slate-700">
                                {isMe ? 'You' : msg.senderName}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {msg.isTampered ? (
                                <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded font-bold">
                                  TAMPERED
                                </span>
                              ) : (
                                <span className="text-[9px] text-emerald-600 flex items-center gap-0.5">
                                  <Lock className="h-2.5 w-2.5" /> Verified
                                </span>
                              )}
                            </div>
                            <div
                              className={`max-w-md rounded-lg px-3 py-2 text-xs leading-relaxed ${
                                msg.isTampered
                                  ? 'bg-red-50 text-red-800 border border-red-200'
                                  : isMe
                                  ? 'bg-blue-600 text-white rounded-br-none'
                                  : 'bg-slate-100 text-slate-900 rounded-bl-none'
                              }`}
                            >
                              {msg.isTampered ? 'Message hidden because integrity verification failed.' : msg.content}
                              {/* {msg.content?.startsWith('ENC:AES-GCM:') ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1 font-semibold text-[10px] opacity-80">
                                    <Lock className="h-2.5 w-2.5" />
                                    <span>Encrypted AES-256-GCM Payload</span>
                                  </div>
                                  <div className="font-mono text-[10px] break-all opacity-90 line-clamp-2">
                                    {msg.content}
                                  </div>
                                </div>
                              ) : (
                                msg.content
                              )} */}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Chat Input Bar */}
                  <form onSubmit={handleSendMessage} className="border-t border-slate-200 p-3 bg-white">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Type message to team members..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        maxLength={2000}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={sendingMessage || !messageInput.trim()}
                        className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: MEMBERS */}
              {activeTab === 'members' && (
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Enrolled Members ({members.length})
                      </h3>
                      <p className="text-[11px] text-slate-500">Only enrolled members can view tasks or exchange messages</p>
                    </div>
                    {(selectedProject.myRole === 'leader' || user?.role === 'admin') && (
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Invite Member</span>
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100">
                    {members.map((m) => (
                      <div key={m.membershipId} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-900">{m.fullName}</div>
                          <div className="text-[11px] text-slate-500">{m.email} · Joined {new Date(m.joinedAt).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded capitalize">
                            {m.role}
                          </span>
                          {(selectedProject.myRole === 'leader' || user?.role === 'admin' || m.userId === user?.id) && (
                            <button
                              onClick={() => handleRemoveMember(m.userId)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded"
                              title={m.userId === user?.id ? 'Leave Project' : 'Remove Member'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              Select a project from the left or create a new space to begin collaboration.
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Create Project Space</h3>
              <button onClick={() => setShowCreateProjectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Consensus Engine"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Description</label>
                <textarea
                  rows={3}
                  placeholder="Outline the project goals and objectives..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateProjectModal(false)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                >
                  Create Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Add Task to {selectedProject?.title}</h3>
              <button onClick={() => setShowCreateTaskModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct threat analysis on auth flow"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Details, criteria, and deliverables..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e: any) => setTaskPriority(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Assign To Member</label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName} ({m.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Invite Member to Space</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleInviteMember} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Student Email or ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. lucas.kim@student.campus.edu"
                  value={inviteIdentifier}
                  onChange={(e) => setInviteIdentifier(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e: any) => setInviteRole(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="member">Member</option>
                  <option value="leader">Co-Leader</option>
                </select>
              </div>
              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <SecurityProcessModal process={securityProcess.process} onClose={securityProcess.close} />
    </div>
  );
};
