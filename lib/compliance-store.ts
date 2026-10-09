'use client';

import { User, Topic, TopicConfirmation, TargetGroup, TopicType, DateFilterType, DateFilterOptions } from './types';
import { INITIAL_STAFF_ROSTER } from './roster-data';
import { INITIAL_TOPICS, generateInitialConfirmations } from './initial-topics';
import {
  saveVerificationToFirestore,
  saveAllVerificationsToFirestore,
  fetchVerificationsFromFirestore,
  saveTopicToFirestore,
  saveTopicAssignmentsToFirestore,
  saveAllTopicsAndAssignmentsToFirestore,
  deleteTopicFromFirestore,
  fetchTopicsFromFirestore,
  purgeTestTopicsFromFirestore,
  saveUserToFirestore,
  fetchUsersFromFirestore,
  saveAllUsersToFirestore,
} from './firebase';

const TEST_TOPIC_IDS = new Set([
  'top-101',
  'top-102',
  'top-103',
  'top-104',
  'top-105',
  'top-106',
  'top-107',
  'top-108',
]);

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

// PURGE ANY LEGACY BROWSER LOCAL STORAGE (Zero browser storage policy)
if (isBrowser) {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // ignore
  }
}

// In-memory runtime state (Zero browser persistence - all permanent data is stored in Firestore)
let inMemoryUsers: User[] = [...INITIAL_STAFF_ROSTER];
let inMemoryTopics: Topic[] = [];
let inMemoryConfirmations: TopicConfirmation[] = [];
let inMemoryCurrentUserId: string | null = null;
let inMemoryM365Session: { email: string; loggedInAt: string; token: string } | null = null;

export function isUserAdmin(user: Partial<User> | null | undefined): boolean {
  if (!user) return false;
  const uNumber = user.uNumber?.trim().toUpperCase();
  const email = user.email?.trim().toLowerCase();
  const id = user.id?.trim().toLowerCase();
  return (
    uNumber === 'ADMIN' ||
    email === 'admin@compliance.system' ||
    email === 'admin' ||
    id === 'u-admin'
  );
}

export function getStoredUsers(): User[] {
  return inMemoryUsers;
}

export function saveUsers(users: User[]) {
  // Ensure admin authority is stripped from all users except user admin
  const sanitizedUsers = users.map(u => ({
    ...u,
    isAdmin: isUserAdmin(u),
  }));
  inMemoryUsers = sanitizedUsers;
  if (isBrowser) {
    window.dispatchEvent(new Event('read_and_sign_data_changed'));
  }
  // Persist directly to Firestore (zero browser storage)
  saveAllUsersToFirestore(sanitizedUsers).catch(err => {
    console.warn('Firebase users save notice:', err);
  });
}

export function getStoredTopics(): Topic[] {
  return inMemoryTopics;
}

export function saveTopics(topics: Topic[], users?: User[]) {
  const sanitized = topics.filter(t => !TEST_TOPIC_IDS.has(t.id) && !t.id?.startsWith('top-10'));
  inMemoryTopics = sanitized;
  if (isBrowser) {
    window.dispatchEvent(new Event('read_and_sign_data_changed'));
  }

  const roster = users || inMemoryUsers;
  // Persist all topics and staff assignments to Firebase Firestore (zero browser storage)
  saveAllTopicsAndAssignmentsToFirestore(sanitized, roster).catch(err => {
    console.warn('Firebase topics and staff assignments save notice:', err);
  });
}

// Synchronize topics and staff assignments directly from Firebase Firestore
export async function syncTopicsWithFirebase(users?: User[]): Promise<Topic[]> {
  try {
    await purgeTestTopicsFromFirestore().catch(() => null);
    const remote = await fetchTopicsFromFirestore();
    const roster = users || inMemoryUsers;

    // Filter out test topics
    const cleanRemote = remote.filter(
      t => !TEST_TOPIC_IDS.has(t.id) && !t.id?.startsWith('top-10')
    );

    inMemoryTopics = cleanRemote;
    if (isBrowser) {
      window.dispatchEvent(new Event('read_and_sign_data_changed'));
    }

    return cleanRemote;
  } catch (err) {
    console.warn('Failed to sync topics from Firebase:', err);
    return inMemoryTopics;
  }
}

export function getStoredConfirmations(): TopicConfirmation[] {
  return inMemoryConfirmations;
}

export function saveConfirmations(confirmations: TopicConfirmation[]) {
  const sanitized = confirmations.filter(
    c => !TEST_TOPIC_IDS.has(c.topicId) && !c.topicId?.startsWith('top-10')
  );
  inMemoryConfirmations = sanitized;
  if (isBrowser) {
    window.dispatchEvent(new Event('read_and_sign_data_changed'));
  }

  // Automatically save all compliance verifications directly to Firebase Firestore (zero browser storage)
  saveAllVerificationsToFirestore(sanitized).catch(err => {
    console.warn('Firebase verifications sync notice:', err);
  });
}

// Synchronize compliance verifications directly from Firebase Firestore
export async function syncConfirmationsWithFirebase(): Promise<TopicConfirmation[]> {
  try {
    const remote = await fetchVerificationsFromFirestore();
    const cleanRemote = (remote || []).filter(
      c => !TEST_TOPIC_IDS.has(c.topicId) && !c.topicId?.startsWith('top-10')
    );

    inMemoryConfirmations = cleanRemote;
    if (isBrowser) {
      window.dispatchEvent(new Event('read_and_sign_data_changed'));
    }
    return cleanRemote;
  } catch (err) {
    console.warn('Failed to sync compliance verifications from Firebase:', err);
    return inMemoryConfirmations;
  }
}

// Synchronize staff roster directly from Firebase Firestore
export async function syncUsersWithFirebase(): Promise<User[]> {
  try {
    const remote = await fetchUsersFromFirestore();
    if (remote && remote.length > 0) {
      inMemoryUsers = remote.map(u => ({
        ...u,
        isAdmin: isUserAdmin(u),
      }));
    } else {
      // Seed initial staff roster to Firestore
      await saveAllUsersToFirestore(INITIAL_STAFF_ROSTER);
      inMemoryUsers = [...INITIAL_STAFF_ROSTER];
    }
    if (isBrowser) {
      window.dispatchEvent(new Event('read_and_sign_data_changed'));
    }
    return inMemoryUsers;
  } catch (err) {
    console.warn('Failed to sync users from Firebase:', err);
    return inMemoryUsers;
  }
}

export async function saveSingleVerificationDirect(conf: TopicConfirmation): Promise<boolean> {
  return await saveVerificationToFirestore(conf);
}

export function getCurrentUserId(): string | null {
  return inMemoryCurrentUserId;
}

export function setCurrentUserId(userId: string | null) {
  inMemoryCurrentUserId = userId;
  if (isBrowser) {
    window.dispatchEvent(new Event('read_and_sign_auth_changed'));
  }
}

export function getM365Session(): { email: string; loggedInAt: string; token: string } | null {
  return inMemoryM365Session;
}

export function setM365Session(session: { email: string; loggedInAt: string; token: string } | null) {
  inMemoryM365Session = session;
}

export const APP_REFERENCE_DATE = '2026-10-08';

// Check if a topic has a future published date (not yet active)
export function isTopicFuturePlanned(topic: Topic, todayDate: string = APP_REFERENCE_DATE): boolean {
  const pubDate = topic.publishedDate || topic.effectiveDate;
  if (!pubDate) return false;
  return pubDate > todayDate;
}

// Target group eligibility logic:
// - ALL: Everyone
// - ALS: Only ALS (plus any individually selected staff)
// - Lead: Only Lead (plus any individually selected staff)
// - ALS_AND_LEAD: Personnel marked ALS or Lead (plus any individually selected staff)
// - CUSTOM: Only specifically selected staff in assignedUserIds
export function isUserEligibleForTopic(user: User, topic: Topic): boolean {
  // If targetGroup is CUSTOM, ONLY specifically assigned staff are eligible
  if (topic.targetGroup === 'CUSTOM') {
    return Boolean(topic.assignedUserIds && topic.assignedUserIds.includes(user.id));
  }
  // If specific individual staff members are explicitly assigned in addition to group:
  if (topic.assignedUserIds && topic.assignedUserIds.includes(user.id)) {
    return true;
  }
  if (topic.targetGroup === 'ALL') return true;
  if (topic.targetGroup === 'ALS') return user.isAls === true;
  if (topic.targetGroup === 'Lead') return user.isLead === true;
  if (topic.targetGroup === 'ALS_AND_LEAD') return user.isAls === true || user.isLead === true;
  return false;
}

// User-assigned topics
export function getUserAssignedTopics(user: User, topics: Topic[]): Topic[] {
  return topics.filter(t => isUserEligibleForTopic(user, t));
}

export type UserTopicStatus = 'confirmed' | 're_sign_required' | 'pending' | 'pending_late_approval' | 'rejected';

export function isTopicOverdue(topic: Topic, todayDate?: string): boolean {
  if (topic.isClosed) return false;
  const today = todayDate || new Date().toISOString().split('T')[0];
  return Boolean(topic.dueDate && topic.dueDate < today);
}

export function isReadAndSignTopic(topic: Topic): boolean {
  return (
    topic.type === 'Document Read and Sign' ||
    topic.type === 'GPD/GPI Read and Sign' ||
    topic.type === 'AHD/AHI Read and Sign'
  );
}

export function isInteractiveSessionTopic(topic: Topic): boolean {
  return (
    topic.type === 'Training' ||
    topic.type === 'Briefing' ||
    topic.type === 'Role Play'
  );
}

export function getUserTopicStatus(topic: Topic, userId: string, confirmations: TopicConfirmation[]): UserTopicStatus {
  const conf = confirmations.find(c => c.topicId === topic.id && c.userId === userId);
  if (conf) {
    if (conf.status === 'pending_late_approval') return 'pending_late_approval';
    if (conf.status === 'rejected') return 'rejected';
    // If version has changed since confirmation: Re-sign required (unless closed)
    if (topic.version && conf.documentVersion && conf.documentVersion !== topic.version && !topic.isClosed) {
      return 're_sign_required';
    }
    return conf.status === 'confirmed' ? 'confirmed' : 'pending';
  }
  // If topic was closed for acknowledgement by Admin (Trainings, Briefings, Role Plays), participation is verified & confirmed:
  if (topic.isClosed) {
    return 'confirmed';
  }
  return 'pending';
}

// Confirmation state for user on a topic
export function isTopicConfirmedByUser(
  topicOrId: Topic | string,
  userId: string,
  confirmations: TopicConfirmation[]
): boolean {
  const topicId = typeof topicOrId === 'string' ? topicOrId : topicOrId.id;
  const topicVersion = typeof topicOrId === 'string' ? undefined : topicOrId.version;
  const isClosed = typeof topicOrId === 'string' ? false : Boolean(topicOrId.isClosed);

  if (isClosed) return true;

  const conf = confirmations.find(c => c.topicId === topicId && c.userId === userId && c.status === 'confirmed');
  if (!conf) return false;

  // If topic version was provided and does not match signed version, re-sign is required
  if (topicVersion && conf.documentVersion && conf.documentVersion !== topicVersion) {
    return false;
  }

  return true;
}

export function getConfirmationRecord(
  topicId: string,
  userId: string,
  confirmations: TopicConfirmation[]
): TopicConfirmation | undefined {
  return confirmations.find(c => c.topicId === topicId && c.userId === userId);
}

// Topic statistics for Admin dashboard
export interface TopicComplianceStats {
  topic: Topic;
  eligibleStaff: User[];
  confirmedStaff: { user: User; confirmation: TopicConfirmation }[];
  missingStaff: User[];
  reSignRequiredStaff: { user: User; confirmation: TopicConfirmation }[];
  pendingLateStaff: { user: User; confirmation: TopicConfirmation }[];
  rejectedStaff: { user: User; confirmation: TopicConfirmation }[];
  totalEligible: number;
  totalConfirmed: number;
  totalMissing: number;
  totalReSignRequired: number;
  totalPendingLate: number;
  totalRejected: number;
  completionRate: number; // 0 to 100
}

export function calculateTopicStats(
  topic: Topic,
  users: User[],
  confirmations: TopicConfirmation[]
): TopicComplianceStats {
  const eligibleStaff = users.filter(u => isUserEligibleForTopic(u, topic));

  const confirmedMap = new Map<string, TopicConfirmation>();
  const pendingLateMap = new Map<string, TopicConfirmation>();
  const rejectedMap = new Map<string, TopicConfirmation>();

  confirmations
    .filter(c => c.topicId === topic.id)
    .forEach(c => {
      if (c.status === 'confirmed') confirmedMap.set(c.userId, c);
      else if (c.status === 'pending_late_approval') pendingLateMap.set(c.userId, c);
      else if (c.status === 'rejected') rejectedMap.set(c.userId, c);
    });

  const confirmedStaff: { user: User; confirmation: TopicConfirmation }[] = [];
  const missingStaff: User[] = [];
  const reSignRequiredStaff: { user: User; confirmation: TopicConfirmation }[] = [];
  const pendingLateStaff: { user: User; confirmation: TopicConfirmation }[] = [];
  const rejectedStaff: { user: User; confirmation: TopicConfirmation }[] = [];

  eligibleStaff.forEach(u => {
    const conf = confirmedMap.get(u.id);
    const pendingConf = pendingLateMap.get(u.id);
    const rejConf = rejectedMap.get(u.id);

    if (conf) {
      if (topic.version && conf.documentVersion && conf.documentVersion !== topic.version) {
        reSignRequiredStaff.push({ user: u, confirmation: conf });
        missingStaff.push(u);
      } else {
        confirmedStaff.push({ user: u, confirmation: conf });
      }
    } else if (pendingConf) {
      pendingLateStaff.push({ user: u, confirmation: pendingConf });
      missingStaff.push(u);
    } else if (rejConf) {
      rejectedStaff.push({ user: u, confirmation: rejConf });
      missingStaff.push(u);
    } else {
      missingStaff.push(u);
    }
  });

  if (topic.isClosed) {
    eligibleStaff.forEach(u => {
      const alreadyConfirmed = confirmedStaff.some(c => c.user.id === u.id);
      if (!alreadyConfirmed) {
        const autoConf: TopicConfirmation = {
          id: `conf-${topic.id}-${u.id}`,
          topicId: topic.id,
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          confirmedAt: topic.closedAt || new Date().toISOString(),
          status: 'confirmed',
          signatureText: 'Participation Verified by Admin (Closed Session)',
          adminReviewNote: 'Participation verified & confirmed upon admin closeout',
        };
        confirmedStaff.push({ user: u, confirmation: autoConf });
      }
    });
    missingStaff.length = 0;
    reSignRequiredStaff.length = 0;
    pendingLateStaff.length = 0;
  }

  const totalEligible = eligibleStaff.length;
  const totalConfirmed = confirmedStaff.length;
  const totalMissing = missingStaff.length;
  const totalReSignRequired = reSignRequiredStaff.length;
  const totalPendingLate = pendingLateStaff.length;
  const totalRejected = rejectedStaff.length;
  const completionRate = totalEligible > 0 ? Math.round((totalConfirmed / totalEligible) * 100) : 0;

  return {
    topic,
    eligibleStaff,
    confirmedStaff,
    missingStaff,
    reSignRequiredStaff,
    pendingLateStaff,
    rejectedStaff,
    totalEligible,
    totalConfirmed,
    totalMissing,
    totalReSignRequired,
    totalPendingLate,
    totalRejected,
    completionRate,
  };
}

// Helper: Calculate ISO week number for a date
export function getISOWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Helper: Get date range for week number of year
export function getWeekDateRange(weekNum: number, year: number): { start: Date; end: Date; label: string } {
  // ISO Week 1 is the week with Jan 4
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const startOfFirstWeek = new Date(jan4);
  startOfFirstWeek.setDate(jan4.getDate() - dayOfWeek + 1);
  startOfFirstWeek.setHours(0, 0, 0, 0);

  const start = new Date(startOfFirstWeek);
  start.setDate(startOfFirstWeek.getDate() + (weekNum - 1) * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startDay = String(start.getDate()).padStart(2, '0');
  const endDay = String(end.getDate()).padStart(2, '0');
  const label = `Week ${weekNum} (${monthNames[start.getMonth()]} ${startDay} - ${monthNames[end.getMonth()]} ${endDay}, ${end.getFullYear()})`;

  return { start, end, label };
}

// Date filtering logic for Date Published
export function matchesDateFilter(
  dateStr: string, // YYYY-MM-DD or ISO (e.g. topic.createdAt or effectiveDate)
  filterOptions: DateFilterOptions | DateFilterType,
  customStart?: string,
  customEnd?: string,
  referenceDate: Date = new Date(2026, 9, 7) // October 7, 2026
): boolean {
  const opts: DateFilterOptions =
    typeof filterOptions === 'string'
      ? {
          type: filterOptions,
          customStartDate: customStart,
          customEndDate: customEnd,
        }
      : filterOptions;

  if (opts.type === 'all') return true;

  const itemDate = new Date(dateStr);
  if (isNaN(itemDate.getTime())) return true;

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0-indexed (9 = Oct)

  // 1. this_month: published in current month (October 2026)
  if (opts.type === 'this_month') {
    return itemDate.getFullYear() === refYear && itemDate.getMonth() === refMonth;
  }

  // 2. last_one_month: published in last one month (past 31 days or previous calendar month)
  if (opts.type === 'last_one_month') {
    const oneMonthAgo = new Date(referenceDate);
    oneMonthAgo.setDate(referenceDate.getDate() - 31);
    oneMonthAgo.setHours(0, 0, 0, 0);

    const prevMonth = refMonth === 0 ? 11 : refMonth - 1;
    const prevYear = refMonth === 0 ? refYear - 1 : refYear;
    const isPrevCalendarMonth = itemDate.getFullYear() === prevYear && itemDate.getMonth() === prevMonth;
    const isWithin31Days = itemDate >= oneMonthAgo && itemDate <= referenceDate;

    return isWithin31Days || isPrevCalendarMonth;
  }

  // 3. week_this_year: published in specific week of this year (or current week 41)
  if (opts.type === 'week_this_year') {
    const targetWeek = opts.selectedWeekNum ?? getISOWeekNumber(referenceDate);
    const targetYear = opts.selectedYear ?? refYear;
    const itemWeek = getISOWeekNumber(itemDate);
    return itemDate.getFullYear() === targetYear && itemWeek === targetWeek;
  }

  // 4. select_month_year: user selects specific month (0-11) and year (e.g. 2026)
  if (opts.type === 'select_month_year') {
    const targetMonth = opts.selectedMonth !== undefined ? opts.selectedMonth : refMonth;
    const targetYear = opts.selectedYear ?? refYear;
    return itemDate.getFullYear() === targetYear && itemDate.getMonth() === targetMonth;
  }

  // 5. last_one_year: published in the last 365 days / past 12 months up to reference date
  if (opts.type === 'last_one_year') {
    const oneYearAgo = new Date(referenceDate);
    oneYearAgo.setFullYear(referenceDate.getFullYear() - 1);
    oneYearAgo.setHours(0, 0, 0, 0);
    return itemDate >= oneYearAgo && itemDate <= referenceDate;
  }

  // 6. custom: from and to date selectable via date picker in calendar
  if (opts.type === 'custom') {
    const startStr = opts.customStartDate || customStart;
    const endStr = opts.customEndDate || customEnd;

    if (startStr && endStr) {
      const start = new Date(startStr);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endStr);
      end.setHours(23, 59, 59, 999);
      return itemDate >= start && itemDate <= end;
    }
    if (startStr) {
      const start = new Date(startStr);
      start.setHours(0, 0, 0, 0);
      return itemDate >= start;
    }
    if (endStr) {
      const end = new Date(endStr);
      end.setHours(23, 59, 59, 999);
      return itemDate <= end;
    }
  }

  return true;
}

// Reset data to defaults if requested
export function resetToDefaults() {
  inMemoryUsers = [...INITIAL_STAFF_ROSTER];
  inMemoryTopics = [];
  inMemoryConfirmations = [];
  if (isBrowser) {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event('read_and_sign_data_changed'));
  }
}
