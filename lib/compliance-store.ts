import { Topic, User, TopicConfirmation, DateFilterOptions } from './types';

export interface TopicComplianceStats {
  topic: Topic;
  total: number;
  confirmed: number;
  notParticipated: number;
  pending: number;
  percentage: number;
  totalMissing: number;
  totalEligible: number;
  totalConfirmed: number;
  completionRate: number;
}

export function getEligibleUsersForTopic(topic: Topic, users: User[]): User[] {
  if (topic.targetGroup?.toLowerCase() === 'custom' || (topic.assignedUserIds && topic.assignedUserIds.length > 0)) {
    const assignedIds = new Set(topic.assignedUserIds || []);
    return users.filter(u => assignedIds.has(u.id));
  }
  const tg = topic.targetGroup?.toLowerCase();
  if (tg === 'als') {
    return users.filter(u => u.ALS && u.ALS.trim().toUpperCase() === 'Y');
  }
  if (tg === 'lead') {
    return users.filter(u => u.Lead && u.Lead.trim().toUpperCase() === 'Y');
  }
  if (tg === 'als_and_lead') {
    return users.filter(
      u =>
        u.ALS && u.ALS.trim().toUpperCase() === 'Y' &&
        u.Lead && u.Lead.trim().toUpperCase() === 'Y'
    );
  }
  if (tg === 'team' && topic.targetTeams && topic.targetTeams.length > 0) {
    return users.filter(u => u.team && topic.targetTeams!.map(t => t.toLowerCase()).includes(u.team.toLowerCase()));
  }
  if (tg === 'department' && topic.targetDepartments && topic.targetDepartments.length > 0) {
    return users.filter(u => u.department && topic.targetDepartments!.map(d => d.toLowerCase()).includes(u.department.toLowerCase()));
  }
  // Default All / ALL
  return users;
}

export function isUserAssignedToTopic(user: User, topic: Topic): boolean {
  if (topic.targetGroup?.toLowerCase() === 'custom' || (topic.assignedUserIds && topic.assignedUserIds.length > 0)) {
    return !!topic.assignedUserIds && topic.assignedUserIds.includes(user.id);
  }
  const tg = topic.targetGroup?.toLowerCase();
  if (tg === 'als') {
    return !!user.ALS && user.ALS.trim().toUpperCase() === 'Y';
  }
  if (tg === 'lead') {
    return !!user.Lead && user.Lead.trim().toUpperCase() === 'Y';
  }
  if (tg === 'als_and_lead') {
    return (
      !!user.ALS && user.ALS.trim().toUpperCase() === 'Y' &&
      !!user.Lead && user.Lead.trim().toUpperCase() === 'Y'
    );
  }
  if (tg === 'team' && topic.targetTeams && topic.targetTeams.length > 0) {
    return !!user.team && topic.targetTeams.map(t => t.toLowerCase()).includes(user.team.toLowerCase());
  }
  if (tg === 'department' && topic.targetDepartments && topic.targetDepartments.length > 0) {
    return !!user.department && topic.targetDepartments.map(d => d.toLowerCase()).includes(user.department.toLowerCase());
  }
  // Default All / ALL
  return true;
}

export function calculateTopicStats(topic: Topic, users: User[], confirmations: TopicConfirmation[]): TopicComplianceStats {
  const eligibleUsers = getEligibleUsersForTopic(topic, users);
  const total = eligibleUsers.length;
  const eligibleIds = new Set(eligibleUsers.map(u => u.id));

  const topicConfs = confirmations.filter(c => c.topicId === topic.id && eligibleIds.has(c.userId));
  const confirmed = topicConfs.filter(c => c.status === 'confirmed').length;
  const notParticipated = topicConfs.filter(c => c.status === 'not_participated').length;
  const pending = Math.max(0, total - confirmed - notParticipated);
  const totalMissing = pending + notParticipated;
  const totalEligible = total;
  const totalConfirmed = confirmed;
  const percentage = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const completionRate = percentage;
  return { topic, total, confirmed, notParticipated, pending, percentage, totalMissing, totalEligible, totalConfirmed, completionRate };
}

export function matchesDateFilter(
  dateStr: string,
  options: DateFilterOptions,
  customStart?: string,
  customEnd?: string,
  referenceDate?: string | Date
): boolean {
  return true;
}

export function getISOWeekNumber(date: Date): number {
  return 1;
}

export function getWeekDateRange(year: number, week: number): { start: string; end: string; label: string } {
  return { start: '', end: '', label: `Week ${week}` };
}

export function isTopicFuturePlanned(topic: Topic): boolean {
  if (!topic.publishedDate) return false;
  return new Date(topic.publishedDate) > new Date();
}

export function deduplicateTopicsByTitle(topics: Topic[]): Topic[] {
  return topics;
}
