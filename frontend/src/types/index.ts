export type UserRole = 'admin' | 'faculty' | 'student';
export type AccountStatus = 'active' | 'suspended';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  studentOrStaffId: string;
  department: string;
  status: AccountStatus;
  lastLoginAt?: string | null;
  securityTrace?: {
    passwordHashAlgorithm?: string;
    passwordHashPreview?: string;
    passwordDatabaseField?: string;
    rawPasswordDatabaseField?: string;
    rawPasswordStored?: boolean;
    storedAs?: string;
  };
}

export interface ClassItem {
  _id: string;
  code: string;
  name: string;
  description: string;
  semester: string;
  academicYear: string;
  facultyId: string;
  facultyName?: string;
  facultyEmail?: string;
  credits: number;
  room: string;
  schedule: string;
  status: 'active' | 'archived';
  enrollmentCount?: number;
  createdAt: string;
}

export interface Enrollment {
  _id: string;
  classId: string;
  studentId: string;
  enrolledAt: string;
  status: 'enrolled' | 'dropped';
}

export interface AttendanceSession {
  _id: string;
  classId: string;
  date: string;
  title: string;
  facultyId: string;
  status: 'open' | 'closed';
  sessionCode?: string;
  createdAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  _id: string;
  sessionId: string;
  classId: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  studentNumber?: string;
  status: AttendanceStatus;
  markedAt: string;
  markedBy: string;
  correctionReason?: string;
  correctedAt?: string;
  correctedBy?: string;
  integrityHmac: string;
  integrityVerified?: boolean;
  isTampered?: boolean;
  createdAt: string;
}

export interface StudentAttendanceClassSummary {
  classId: string;
  classCode: string;
  className: string;
  totalSessions: number;
  totalRecorded: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  attendancePercentage: number;
  records: Array<AttendanceRecord & { sessionTitle: string; sessionDate: string }>;
}

export interface Project {
  _id: string;
  title: string;
  description: string;
  classId?: string;
  className?: string;
  classCode?: string;
  ownerId: string;
  status: 'active' | 'archived';
  isPrivate: boolean;
  memberCount?: number;
  myRole?: 'leader' | 'member' | 'admin' | 'none';
  taskCount?: number;
  createdAt: string;
}

export interface ProjectMember {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  role: 'leader' | 'member';
  joinedAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  _id: string;
  projectId: string;
  projectTitle?: string;
  title: string;
  description: string;
  assignedTo?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  createdBy: string;
  createdAt: string;
}

export interface ChatMessage {
  _id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  content: string;
  isTampered?: boolean;
  integrityVerified?: boolean;
  hmacVerified?: boolean;
  signatureVerified?: boolean;
  signatureAlgorithm?: string;
  isEncryptedInStorage?: boolean;
  rawStoredSnippet?: string;
  createdAt: string;
  readBy?: string[];
}

export interface AppNotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'invitation' | 'message' | 'task' | 'attendance' | 'security';
  link?: string;
  read: boolean;
  createdAt: string;
}

export type SecurityCategory = 
  | 'auth' 
  | 'authorization' 
  | 'rate_limit' 
  | 'integrity_failure' 
  | 'injection_attempt' 
  | 'suspicious_activity';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEvent {
  _id: string;
  eventCategory: SecurityCategory;
  severity: SecuritySeverity;
  eventType: string;
  message: string;
  affectedResource: string;
  outcome: 'blocked' | 'alerted' | 'logged';
  correlationId: string;
  ip: string;
  userAgent?: string;
  actorId?: string;
  actorEmail?: string;
  isSimulatedDemo?: boolean;
  investigationStatus: 'unreviewed' | 'investigating' | 'resolved' | 'false_positive';
  notes?: string;
  createdAt: string;
}

export interface ScannerFinding {
  _id: string;
  source: 'OWASP_ZAP' | 'BURP_SUITE' | 'MANUAL';
  scannerAlertId?: string;
  alertName: string;
  severity: SecuritySeverity | 'informational';
  confidence: string;
  url: string;
  method: string;
  param?: string;
  attackVector?: string;
  description: string;
  solution: string;
  reference?: string;
  rawEvidence?: string;
  remediationStatus: 'open' | 'in_remediation' | 'verified_fixed' | 'accepted_risk';
  importedBy: string;
  importedAt: string;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  actorId: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  outcome: 'success' | 'failure';
  ip: string;
  correlationId: string;
  createdAt: string;
}
