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

export function calculateTopicStats(topic: Topic, users: User[], confirmations: TopicConfirmation[]): TopicComplianceStats {
  const total = users.length;
  const topicConfs = confirmations.filter(c => c.topicId === topic.id);
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
  return false;
}

export function deduplicateTopicsByTitle(topics: Topic[]): Topic[] {
  return topics;
}
