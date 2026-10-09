'use client';

import { User, Topic, TopicConfirmation, TargetGroup, TopicType, DateFilterType, DateFilterOptions } from './types';
import { INITIAL_STAFF_ROSTER } from './roster-data';
import { INITIAL_TOPICS, generateInitialConfirmations } from './initial-topics';

const STORAGE_KEYS = {
  USERS: 'read_and_sign_users_v1',
  TOPICS: 'read_and_sign_topics_v1',
  CONFIRMATIONS: 'read_and_sign_confirmations_v1',
  CURRENT_USER_ID: 'read_and_sign_current_user_id_v1',
  M365_SESSION: 'read_and_sign_m365_session_v1',
};

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

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
  if (!isBrowser) return INITIAL_STAFF_ROSTER;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_STAFF_ROSTER));
      return INITIAL_STAFF_ROSTER;
    }
    const parsed: User[] = JSON.parse(raw);
    let modified = false;

    // Ensure user admin exists
    const hasAdmin = parsed.some(isUserAdmin);
    if (!hasAdmin) {
      parsed.unshift({
        id: 'u-admin',
        uNumber: 'ADMIN',
        name: 'Administrator',
        email: 'admin@compliance.system',
        isAls: true,
        isLead: true,
        isAdmin: true,
        department: 'System Administration',
        title: 'System Administrator'
      });
      modified = true;
    }

    // Strip admin authority from all users except user admin
    parsed.forEach(u => {
      if (isUserAdmin(u)) {
        if (!u.isAdmin) {
          u.isAdmin = true;
          modified = true;
        }
      } else {
        if (u.isAdmin) {
          u.isAdmin = false;
          modified = true;
        }
      }
    });

    if (modified) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load users from storage', e);
    return INITIAL_STAFF_ROSTER;
  }
}

export function saveUsers(users: User[]) {
  if (!isBrowser) return;
  // Ensure admin authority is stripped from all users except user admin
  const sanitizedUsers = users.map(u => ({
    ...u,
    isAdmin: isUserAdmin(u)
  }));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sanitizedUsers));
  window.dispatchEvent(new Event('read_and_sign_data_changed'));
}

export function getStoredTopics(): Topic[] {
  if (!isBrowser) return INITIAL_TOPICS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TOPICS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(INITIAL_TOPICS));
      return INITIAL_TOPICS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load topics from storage', e);
    return INITIAL_TOPICS;
  }
}

export function saveTopics(topics: Topic[]) {
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(topics));
  window.dispatchEvent(new Event('read_and_sign_data_changed'));
}

export function getStoredConfirmations(): TopicConfirmation[] {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIRMATIONS);
    if (!raw) {
      const initial = generateInitialConfirmations();
      localStorage.setItem(STORAGE_KEYS.CONFIRMATIONS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load confirmations from storage', e);
    return [];
  }
}

export function saveConfirmations(confirmations: TopicConfirmation[]) {
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEYS.CONFIRMATIONS, JSON.stringify(confirmations));
  window.dispatchEvent(new Event('read_and_sign_data_changed'));
}

export function getCurrentUserId(): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
}

export function setCurrentUserId(userId: string | null) {
  if (!isBrowser) return;
  if (userId) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
  }
  window.dispatchEvent(new Event('read_and_sign_auth_changed'));
}

export function getM365Session(): { email: string; loggedInAt: string; token: string } | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.M365_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setM365Session(session: { email: string; loggedInAt: string; token: string } | null) {
  if (!isBrowser) return;
  if (session) {
    localStorage.setItem(STORAGE_KEYS.M365_SESSION, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEYS.M365_SESSION);
  }
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

export function getUserTopicStatus(topic: Topic, userId: string, confirmations: TopicConfirmation[]): UserTopicStatus {
  const conf = confirmations.find(c => c.topicId === topic.id && c.userId === userId);
  if (!conf) return 'pending';
  if (conf.status === 'pending_late_approval') return 'pending_late_approval';
  if (conf.status === 'rejected') return 'rejected';
  // If version has changed since confirmation: Re-sign required
  if (topic.version && conf.documentVersion && conf.documentVersion !== topic.version) {
    return 're_sign_required';
  }
  return conf.status === 'confirmed' ? 'confirmed' : 'pending';
}

// Confirmation state for user on a topic
export function isTopicConfirmedByUser(
  topicOrId: Topic | string,
  userId: string,
  confirmations: TopicConfirmation[]
): boolean {
  const topicId = typeof topicOrId === 'string' ? topicOrId : topicOrId.id;
  const topicVersion = typeof topicOrId === 'string' ? undefined : topicOrId.version;

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
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_STAFF_ROSTER));
  localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(INITIAL_TOPICS));
  localStorage.setItem(STORAGE_KEYS.CONFIRMATIONS, JSON.stringify(generateInitialConfirmations()));
  window.dispatchEvent(new Event('read_and_sign_data_changed'));
}
