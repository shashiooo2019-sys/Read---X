import { Topic, User, TopicConfirmation } from './types';
import { TopicComplianceStats } from './compliance-store';

export function exportSingleTopicReport(stat: TopicComplianceStats, users?: User[], confirmations?: TopicConfirmation[]) {
  const { topic } = stat;
  const headers = ['Staff Name', 'U Number', 'Status', 'Confirmed At'];
  const rows = users?.map(user => {
    const conf = confirmations?.find(c => c.userId === user.id && c.topicId === topic.id);
    return [user.name, user.uNumber, conf?.status || 'Missing', conf?.confirmedAt || 'N/A'];
  }) || [];
  
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${topic.title.replace(/\s+/g, '_')}_report.csv`;
  a.click();
}

export function exportMultipleTopicsReport(stats: TopicComplianceStats[], filterDesc: string) {
  const headers = ['Topic Title', 'Type', 'Target Group', 'Completion Rate'];
  const rows = stats.map(stat => [stat.topic.title, stat.topic.type, stat.topic.targetGroup, `${stat.completionRate}%`]);
  
  const csvContent = [filterDesc, headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'compliance_report.csv';
  a.click();
}
