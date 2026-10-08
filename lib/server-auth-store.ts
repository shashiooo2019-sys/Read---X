import crypto from 'crypto';
import { User, Topic, TopicConfirmation } from './types';
import { INITIAL_STAFF_ROSTER } from './roster-data';

export interface ServerMagicToken {
  tokenHash: string;
  email: string;
  userId?: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedAt?: number;
  ipAddress?: string;
}

export interface ServerSession {
  sessionId: string;
  userId: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  userAgent?: string;
  ipAddress?: string;
}

export interface ApprovedPrivateUser {
  id: string;
  name: string;
  workEmail: string;
  loginEmail: string;
  uNumber: string;
  approvedBy: string;
  approvedAt: string;
  status: 'approved' | 'revoked';
  notes?: string;
}

export interface ServerAuditLog {
  id: string;
  timestamp: string;
  action:
    | 'magic_link_requested'
    | 'magic_link_verified'
    | 'login_success'
    | 'logout'
    | 'email_changed_by_admin'
    | 'user_disabled'
    | 'user_reactivated'
    | 'user_approved'
    | 'user_created'
    | 'session_invalidated'
    | 'device_associated';
  userId?: string;
  performedBy: string;
  targetEmail?: string;
  details: string;
  ipAddress?: string;
}

export interface SentEmailRecord {
  id: string;
  to: string;
  subject: string;
  token: string;
  verificationUrl: string;
  sentAt: string;
  expiresAt: string;
  provider: string;
  status: 'sent' | 'delivered';
}

// Global server singleton store across HMR / requests in Node process
interface GlobalStoreState {
  users: User[];
  sessions: Map<string, ServerSession>; // sessionId -> Session
  tokens: Map<string, ServerMagicToken>; // tokenHash -> ServerMagicToken
  deviceLocks: Map<string, string>; // deviceId -> userEmail
  approvedPrivateUsers: ApprovedPrivateUser[];
  auditLogs: ServerAuditLog[];
  sentEmails: SentEmailRecord[];
  rateLimits: Map<string, { count: number; firstRequestTime: number }>;
}

declare global {
  var __readAndSignStore: GlobalStoreState | undefined;
}

function initStore(): GlobalStoreState {
  // Default approved private users
  const defaultApprovedPrivateUsers: ApprovedPrivateUser[] = [
    {
      id: 'appr-00',
      name: 'Shashi Srivastava',
      workEmail: 'shashi.srivastava@dlh.de',
      loginEmail: 'shashi.ooo.2019@gmail.com',
      uNumber: 'U086936',
      approvedBy: 'System',
      approvedAt: '2026-10-01T08:00:00Z',
      status: 'approved',
      notes: 'App owner / Admin access',
    },
    {
      id: 'appr-01',
      name: 'Jane Doe',
      workEmail: 'jane.doe@swiss.com',
      loginEmail: 'jane.doe@gmail.com',
      uNumber: 'U799201',
      approvedBy: 'shashi.srivastava@dlh.de',
      approvedAt: '2026-10-01T08:00:00Z',
      status: 'approved',
      notes: 'Station contractor external access approved',
    },
    {
      id: 'appr-02',
      name: 'Marcus Weber',
      workEmail: 'marcus.weber@dlh.de',
      loginEmail: 'm.weber.ops@outlook.com',
      uNumber: 'U789012',
      approvedBy: 'sweta.khaneja@dlh.de',
      approvedAt: '2026-10-02T10:00:00Z',
      status: 'approved',
      notes: 'Field engineer approved private email',
    },
  ];

  // Deep clone initial roster
  const users: User[] = JSON.parse(JSON.stringify(INITIAL_STAFF_ROSTER));

  // Ensure default approved private users exist in roster
  for (const appr of defaultApprovedPrivateUsers) {
    const exists = users.find(u => u.email.toLowerCase() === appr.loginEmail.toLowerCase());
    if (!exists) {
      users.push({
        id: `u-${appr.uNumber.toLowerCase()}`,
        uNumber: appr.uNumber,
        name: appr.name,
        email: appr.loginEmail,
        workEmail: appr.workEmail,
        loginEmail: appr.loginEmail,
        isAls: false,
        isLead: false,
        isAdmin: false,
        isApprovedPrivateEmail: true,
        approvalStatus: 'approved',
        accountStatus: 'active',
        department: 'External Operations',
        title: 'Approved Operations Specialist',
        createdAt: '2026-10-01T08:00:00Z',
      });
    }
  }

  // Pre-fill audit logs
  const auditLogs: ServerAuditLog[] = [
    {
      id: 'audit-init-01',
      timestamp: '2026-10-01T08:00:00Z',
      action: 'user_approved',
      performedBy: 'shashi.srivastava@dlh.de',
      targetEmail: 'jane.doe@gmail.com',
      details: 'Approved private email jane.doe@gmail.com for Jane Doe (Swiss International Air Lines)',
    },
    {
      id: 'audit-init-02',
      timestamp: '2026-10-02T10:00:00Z',
      action: 'user_approved',
      performedBy: 'sweta.khaneja@dlh.de',
      targetEmail: 'm.weber.ops@outlook.com',
      details: 'Approved private email m.weber.ops@outlook.com for Marcus Weber (Lufthansa German Airlines)',
    },
  ];

  return {
    users,
    sessions: new Map(),
    tokens: new Map(),
    deviceLocks: new Map(),
    approvedPrivateUsers: defaultApprovedPrivateUsers,
    auditLogs,
    sentEmails: [],
    rateLimits: new Map(),
  };
}

if (!global.__readAndSignStore) {
  global.__readAndSignStore = initStore();
}

const store = global.__readAndSignStore;

export const serverAuthStore = {
  getUsers(): User[] {
    return store.users;
  },

  findUserByEmail(email: string): User | undefined {
    const clean = email.trim().toLowerCase();
    return store.users.find(
      u =>
        u.email.toLowerCase() === clean ||
        u.loginEmail?.toLowerCase() === clean ||
        u.workEmail?.toLowerCase() === clean
    );
  },

  findUserByUNumber(uNumber: string): User | undefined {
    const clean = uNumber.trim().toUpperCase();
    return store.users.find(
      u => u.uNumber?.toUpperCase() === clean
    );
  },

  findUserById(userId: string): User | undefined {
    return store.users.find(u => u.id === userId);
  },

  createUser(userData: Partial<User> & { email: string; name: string }): User {
    const domain = userData.email.split('@')[1]?.toLowerCase() || '';
    const uNumber =
      userData.uNumber ||
      `U${Math.floor(100000 + Math.random() * 900000)}`;
    const newUser: User = {
      department: 'Ground Operations',
      title: 'Station Operations Agent',
      createdAt: new Date().toISOString(),
      accountStatus: 'active',
      approvalStatus: 'approved',
      isAls: false,
      isLead: false,
      isAdmin: false,
      isApprovedPrivateEmail: domain !== 'dlh.de' && domain !== 'swiss.com',
      ...userData,
      id: userData.id || `u-${Date.now().toString(36)}`,
      uNumber,
      name: userData.name,
      email: userData.email.trim().toLowerCase(),
      loginEmail: userData.email.trim().toLowerCase(),
      workEmail: userData.workEmail || userData.email.trim().toLowerCase(),
      emailDomain: domain,
    };
    store.users.push(newUser);
    return newUser;
  },

  updateUser(userId: string, updates: Partial<User>): User | undefined {
    const index = store.users.findIndex(u => u.id === userId);
    if (index === -1) return undefined;
    store.users[index] = { ...store.users[index], ...updates };
    return store.users[index];
  },

  deleteUser(userId: string): boolean {
    const prevLen = store.users.length;
    store.users = store.users.filter(u => u.id !== userId);
    return store.users.length < prevLen;
  },

  // Approved Private Users
  getApprovedPrivateUsers(): ApprovedPrivateUser[] {
    return store.approvedPrivateUsers;
  },

  isPrivateEmailApproved(email: string): boolean {
    const clean = email.trim().toLowerCase();
    return store.approvedPrivateUsers.some(
      a => a.loginEmail.toLowerCase() === clean && a.status === 'approved'
    );
  },

  getApprovedPrivateUser(email: string): ApprovedPrivateUser | undefined {
    const clean = email.trim().toLowerCase();
    return store.approvedPrivateUsers.find(
      a => a.loginEmail.toLowerCase() === clean && a.status === 'approved'
    );
  },

  addApprovedPrivateUser(data: Omit<ApprovedPrivateUser, 'id' | 'approvedAt'>): ApprovedPrivateUser {
    const newRecord: ApprovedPrivateUser = {
      ...data,
      id: `appr-${Date.now().toString(36)}`,
      approvedAt: new Date().toISOString(),
      loginEmail: data.loginEmail.trim().toLowerCase(),
      workEmail: data.workEmail.trim().toLowerCase(),
    };
    store.approvedPrivateUsers.push(newRecord);
    return newRecord;
  },

  revokeApprovedPrivateUser(loginEmail: string): boolean {
    const clean = loginEmail.trim().toLowerCase();
    const item = store.approvedPrivateUsers.find(a => a.loginEmail.toLowerCase() === clean);
    if (item) {
      item.status = 'revoked';
      return true;
    }
    return false;
  },

  // Magic Link Tokens (Stored strictly as SHA-256 hashes)
  createMagicToken(email: string, ipAddress?: string): { token: string; expiresAt: number; tokenHash: string } {
    // Generate 32-byte cryptographically secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000; // 15 minutes expiry

    const record: ServerMagicToken = {
      tokenHash,
      email: email.trim().toLowerCase(),
      createdAt: now,
      expiresAt,
      used: false,
      ipAddress,
    };

    store.tokens.set(tokenHash, record);
    return { token, expiresAt, tokenHash };
  },

  consumeMagicToken(token: string): { success: boolean; error?: string; email?: string } {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = store.tokens.get(tokenHash);

    if (!record) {
      return { success: false, error: 'TOKEN_INVALID' };
    }

    if (record.used) {
      return { success: false, error: 'TOKEN_ALREADY_USED' };
    }

    if (Date.now() > record.expiresAt) {
      return { success: false, error: 'TOKEN_EXPIRED' };
    }

    // Mark as used immediately (single-use)
    record.used = true;
    record.usedAt = Date.now();
    store.tokens.set(tokenHash, record);

    return { success: true, email: record.email };
  },

  invalidateAllTokensForEmail(email: string): void {
    const clean = email.trim().toLowerCase();
    for (const [hash, record] of store.tokens.entries()) {
      if (record.email === clean) {
        record.used = true;
        store.tokens.set(hash, record);
      }
    }
  },

  // Sessions
  createSession(userId: string, email: string, ipAddress?: string, userAgent?: string): string {
    const sessionId = `rs_sess_${crypto.randomBytes(32).toString('hex')}`;
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

    const session: ServerSession = {
      sessionId,
      userId,
      email: email.trim().toLowerCase(),
      createdAt: now,
      expiresAt,
      ipAddress,
      userAgent,
    };

    store.sessions.set(sessionId, session);
    return sessionId;
  },

  getSession(sessionId: string): ServerSession | undefined {
    const session = store.sessions.get(sessionId);
    if (!session) return undefined;
    if (Date.now() > session.expiresAt) {
      store.sessions.delete(sessionId);
      return undefined;
    }
    return session;
  },

  deleteSession(sessionId: string): void {
    store.sessions.delete(sessionId);
  },

  invalidateAllSessionsForUser(userId: string): void {
    for (const [sId, sess] of store.sessions.entries()) {
      if (sess.userId === userId) {
        store.sessions.delete(sId);
      }
    }
  },

  // Device Locks (Requirement 3 & 4: Lock the user's identity & Prevent account switching)
  getDeviceLock(deviceId: string): string | undefined {
    return store.deviceLocks.get(deviceId);
  },

  setDeviceLock(deviceId: string, email: string): void {
    store.deviceLocks.set(deviceId, email.trim().toLowerCase());
  },

  updateDeviceLockEmail(oldEmail: string, newEmail: string): void {
    const oldClean = oldEmail.trim().toLowerCase();
    const newClean = newEmail.trim().toLowerCase();
    for (const [devId, email] of store.deviceLocks.entries()) {
      if (email === oldClean) {
        store.deviceLocks.set(devId, newClean);
      }
    }
  },

  clearDeviceLock(deviceId: string): void {
    store.deviceLocks.delete(deviceId);
  },

  // Rate Limiting (Requirement 5: Rate limiting against repeated requests)
  checkRateLimit(key: string, maxAttempts = 5, windowMs = 5 * 60 * 1000): { allowed: boolean; remainingMs?: number } {
    const now = Date.now();
    const entry = store.rateLimits.get(key);

    if (!entry) {
      store.rateLimits.set(key, { count: 1, firstRequestTime: now });
      return { allowed: true };
    }

    if (now - entry.firstRequestTime > windowMs) {
      // Window reset
      store.rateLimits.set(key, { count: 1, firstRequestTime: now });
      return { allowed: true };
    }

    if (entry.count >= maxAttempts) {
      const remainingMs = windowMs - (now - entry.firstRequestTime);
      return { allowed: false, remainingMs };
    }

    entry.count += 1;
    store.rateLimits.set(key, entry);
    return { allowed: true };
  },

  // Audit Logs (Requirement 9 & 11)
  addAuditLog(entry: Omit<ServerAuditLog, 'id' | 'timestamp'>): ServerAuditLog {
    const log: ServerAuditLog = {
      ...entry,
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    store.auditLogs.unshift(log); // newest first
    return log;
  },

  getAuditLogs(): ServerAuditLog[] {
    return store.auditLogs;
  },

  // Sent Emails Record (dev simulator & verification tracking)
  addSentEmail(record: Omit<SentEmailRecord, 'id' | 'sentAt'>): SentEmailRecord {
    const emailRec: SentEmailRecord = {
      ...record,
      id: `mail-${Date.now().toString(36)}`,
      sentAt: new Date().toISOString(),
    };
    store.sentEmails.unshift(emailRec);
    // keep max 50
    if (store.sentEmails.length > 50) {
      store.sentEmails.pop();
    }
    return emailRec;
  },

  getSentEmails(): SentEmailRecord[] {
    return store.sentEmails;
  },

  // Password Management
  hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  },

  setPassword(userId: string, passwordPlain: string): User | undefined {
    const user = this.findUserById(userId);
    if (!user) return undefined;
    const passwordHash = this.hashPassword(passwordPlain);
    return this.updateUser(userId, { passwordHash });
  },

  clearPassword(userId: string): User | undefined {
    const user = this.findUserById(userId);
    if (!user) return undefined;
    const updated = this.updateUser(userId, { passwordHash: undefined });
    return updated;
  },

  verifyPassword(userId: string, passwordPlain: string): boolean {
    const user = this.findUserById(userId);
    if (!user || !user.passwordHash) return false;
    const inputHash = this.hashPassword(passwordPlain);
    return user.passwordHash === inputHash;
  },
};
