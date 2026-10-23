import { Topic, User, TopicConfirmation } from './types';
import { TopicComplianceStats, getEligibleUsersForTopic } from './compliance-store';

/**
 * Formats a given date (string or Date) into standard aviation/IATA YYMMMDD format.
 * E.g., 2026-10-23 -> 26OCT23
 */
export function formatPublishedDateYYMMMDD(dateInput?: string | Date): string {
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  if (!dateInput) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mmm = MONTHS[now.getMonth()];
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yy}${mmm}${dd}`;
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // Matches YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const monthIdx = parseInt(ymdMatch[2], 10) - 1;
      const day = ymdMatch[3];
      const yy = year.slice(-2);
      const mmm = MONTHS[monthIdx] || 'JAN';
      const dd = day.padStart(2, '0');
      return `${yy}${mmm}${dd}`;
    }

    // Matches DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1];
      const monthIdx = parseInt(dmyMatch[2], 10) - 1;
      const year = dmyMatch[3];
      const yy = year.slice(-2);
      const mmm = MONTHS[monthIdx] || 'JAN';
      const dd = day.padStart(2, '0');
      return `${yy}${mmm}${dd}`;
    }
  }

  const d = new Date(dateInput);
  if (!isNaN(d.getTime())) {
    const yy = String(d.getFullYear()).slice(-2);
    const mmm = MONTHS[d.getMonth()];
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}${mmm}${dd}`;
  }

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mmm = MONTHS[now.getMonth()];
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yy}${mmm}${dd}`;
}

function escapeCsvCell(cell: any): string {
  if (cell === null || cell === undefined) return '';
  const str = String(cell);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportSingleTopicReport(
  stat: TopicComplianceStats,
  users?: User[],
  confirmations?: TopicConfirmation[]
) {
  const { topic } = stat;
  
  // Format published date in YYMMMDD (e.g., 26OCT23)
  const pubDateRaw = topic.publishedDate || topic.effectiveDate || topic.createdAt;
  const dateFormatted = formatPublishedDateYYMMMDD(pubDateRaw);
  
  // Clean topic title for filename (preserve readability, replace illegal filesystem characters)
  const cleanTopicName = (topic.title || 'Topic')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Format filename strictly as: Topic Name_Published Date in YYMMMDD.csv
  const fileName = `${cleanTopicName}_${dateFormatted}.csv`;

  // Get eligible users for this topic
  const eligibleUsers = users ? getEligibleUsersForTopic(topic, users) : [];
  const baseUsers = eligibleUsers.length > 0 ? eligibleUsers : (users || []);
  
  // Also include any users who confirmed even if not currently in eligible filter
  const baseIds = new Set(baseUsers.map(u => u.id));
  const otherConfirmedUsers = (users || []).filter(u => {
    if (baseIds.has(u.id)) return false;
    return confirmations?.some(c => c.userId === u.id && c.topicId === topic.id);
  });
  const targetUsers = [...baseUsers, ...otherConfirmedUsers];

  const isTopicClosed = topic.status === 'closed' || topic.isClosed;

  const headers = ['Staff Name', 'U Number', 'Status', 'Confirmed At'];
  const rows = targetUsers.map(user => {
    const conf = confirmations?.find(c => c.userId === user.id && c.topicId === topic.id);
    let statusText = 'Missing';

    const isConfirmedByAdmin = Boolean(
      conf &&
      (conf.confirmedByAdmin === true ||
       conf.status === ('confirmed_by_admin' as any) ||
       (conf.status === 'confirmed' && conf.verifiedBy && (
         conf.verifiedBy.toLowerCase().includes('admin') ||
         conf.verifiedBy.toLowerCase().includes('sarah') ||
         conf.wbtNotes?.toLowerCase().includes('manually marked')
       )))
    );

    if (isConfirmedByAdmin) {
      statusText = 'Confirmed by Admin';
    } else if (conf?.status === 'confirmed') {
      statusText = 'Confirmed';
    } else if (conf?.status === 'not_participated' || isTopicClosed) {
      statusText = 'Topc Closed/Not Confirmed';
    } else if (conf?.status === 'pending_wbt_verification') {
      statusText = 'Pending WBT Verification';
    } else if (conf?.status === 'rejected') {
      statusText = 'Rejected';
    } else if (conf?.status) {
      statusText = conf.status;
    }

    const confirmedAtText =
      (statusText === 'Confirmed by Admin' || statusText === 'Confirmed') && conf?.confirmedAt
        ? conf.confirmedAt.replace('T', ' ').slice(0, 19)
        : 'N/A';

    return [
      escapeCsvCell(user.name || ''),
      escapeCsvCell(user.uNumber || ''),
      escapeCsvCell(statusText),
      escapeCsvCell(confirmedAtText),
    ];
  });
  
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(url), 1500);
}

export function exportMultipleTopicsReport(stats: TopicComplianceStats[], filterDesc?: string) {
  const headers = [
    'Topic Title',
    'Type',
    'Target Group',
    'Published Date',
    'Due Date',
    'Completion Rate',
    'Confirmed',
    'Missing',
    'Total Eligible',
  ];

  const rows = stats.map(stat => {
    const pubDate = stat.topic.publishedDate?.split('T')[0] || 
                    stat.topic.effectiveDate?.split('T')[0] || 
                    stat.topic.createdAt?.slice(0, 10) || 
                    '';
    const dueDate = stat.topic.dueDate || 'N/A';
    return [
      escapeCsvCell(stat.topic.title || ''),
      escapeCsvCell(stat.topic.type || ''),
      escapeCsvCell(stat.topic.targetGroup || ''),
      escapeCsvCell(pubDate),
      escapeCsvCell(dueDate),
      escapeCsvCell(`${stat.completionRate}%`),
      escapeCsvCell(stat.totalConfirmed),
      escapeCsvCell(stat.totalMissing),
      escapeCsvCell(stat.totalEligible),
    ];
  });
  
  const fileName = 'compliance_report.csv';

  const lines: string[] = [];
  if (filterDesc) {
    lines.push(escapeCsvCell(filterDesc));
  }
  lines.push(headers.join(','));
  lines.push(...rows.map(r => r.join(',')));

  const csvContent = lines.join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(url), 1500);
}
