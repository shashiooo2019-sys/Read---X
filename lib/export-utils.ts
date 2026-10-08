import { TopicComplianceStats } from './compliance-store';
import { User, Topic, TopicConfirmation } from './types';

// Helper to download content as file with UTF-8 BOM for Microsoft Excel compatibility
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(field: string | number | undefined | null): string {
  if (field === undefined || field === null) return '""';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

// 1. Export compliance report for a single topic
export function exportSingleTopicReport(stats: TopicComplianceStats) {
  const { topic, eligibleStaff, confirmedStaff, missingStaff, totalEligible, totalConfirmed, totalMissing, completionRate } = stats;

  const confirmedMap = new Map<string, TopicConfirmation>();
  confirmedStaff.forEach(item => confirmedMap.set(item.user.id, item.confirmation));

  const lines: string[] = [];

  // Metadata headers
  lines.push(`"READ & SIGN COMPLIANCE REPORT - SINGLE TOPIC"`);
  lines.push(`"Generated At: ${new Date().toISOString()}"`);
  lines.push(`""`);
  lines.push(`"Topic Title",${escapeCSV(topic.title)}`);
  lines.push(`"Topic Type",${escapeCSV(topic.type + (topic.customTypeDesc ? ` (${topic.customTypeDesc})` : ''))}`);
  lines.push(`"Target Group",${escapeCSV(topic.targetGroup)}`);
  lines.push(`"Effective Date",${escapeCSV(topic.effectiveDate)}`);
  lines.push(`"Due Date",${escapeCSV(topic.dueDate)}`);
  lines.push(`"Created By",${escapeCSV(topic.createdBy)}`);
  lines.push(`"Total Eligible Staff",${escapeCSV(totalEligible)}`);
  lines.push(`"Total Confirmed Staff",${escapeCSV(totalConfirmed)}`);
  lines.push(`"Total Missing / Pending Staff",${escapeCSV(totalMissing)}`);
  lines.push(`"Compliance Completion Rate",${escapeCSV(`${completionRate}%`)}`);
  lines.push(`""`);

  // Staff Table Header
  lines.push([
    '"UNUMBER"',
    '"STAFF NAME"',
    '"ORGANIZATIONAL EMAIL"',
    '"ALS"',
    '"LEAD"',
    '"ADMIN"',
    '"STATUS"',
    '"CONFIRMED AT (UTC)"',
    '"DIGITAL SIGNATURE"',
    '"IP / TERMINAL"'
  ].join(','));

  // Sort: Missing first (for prompt action), then confirmed
  const sortedStaff = [...eligibleStaff].sort((a, b) => {
    const aConf = confirmedMap.has(a.id);
    const bConf = confirmedMap.has(b.id);
    if (aConf === bConf) return a.name.localeCompare(b.name);
    return aConf ? 1 : -1;
  });

  sortedStaff.forEach(u => {
    const conf = confirmedMap.get(u.id);
    lines.push([
      escapeCSV(u.uNumber),
      escapeCSV(u.name),
      escapeCSV(u.email),
      escapeCSV(u.isAls ? 'Y' : 'N'),
      escapeCSV(u.isLead ? 'Y' : 'N'),
      escapeCSV(u.isAdmin ? 'Y' : 'N'),
      escapeCSV(conf ? 'CONFIRMED' : 'MISSING / PENDING'),
      escapeCSV(conf ? conf.confirmedAt : '-'),
      escapeCSV(conf?.signatureText || (conf ? u.name : '-')),
      escapeCSV(conf?.ipAddress || '-')
    ].join(','));
  });

  const sanitizedTitle = topic.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  const filename = `Compliance_Report_${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(lines.join('\r\n'), filename);
}

// 2. Export consolidated compliance report for multiple or all filtered topics
export function exportMultipleTopicsReport(statsList: TopicComplianceStats[], filterSummaryDesc: string = 'Filtered Topics') {
  const lines: string[] = [];

  const totalTopics = statsList.length;
  const totalEligibleAll = statsList.reduce((acc, s) => acc + s.totalEligible, 0);
  const totalConfirmedAll = statsList.reduce((acc, s) => acc + s.totalConfirmed, 0);
  const totalMissingAll = statsList.reduce((acc, s) => acc + s.totalMissing, 0);
  const overallRate = totalEligibleAll > 0 ? Math.round((totalConfirmedAll / totalEligibleAll) * 100) : 0;

  lines.push(`"READ & SIGN BULK COMPLIANCE REPORT"`);
  lines.push(`"Scope: ${filterSummaryDesc}"`);
  lines.push(`"Generated At: ${new Date().toISOString()}"`);
  lines.push(`"Total Topics Included: ${totalTopics}"`);
  lines.push(`"Total Assignments: ${totalEligibleAll}"`);
  lines.push(`"Total Acknowledged: ${totalConfirmedAll}"`);
  lines.push(`"Total Pending / Missing: ${totalMissingAll}"`);
  lines.push(`"Overall Compliance Completion: ${overallRate}%"`);
  lines.push(`""`);

  // SECTION 1: TOPIC SUMMARY MATRIX
  lines.push(`"--- SECTION 1: TOPICS EXECUTIVE SUMMARY MATRIX ---"`);
  lines.push([
    '"TOPIC ID"',
    '"TOPIC TITLE"',
    '"TOPIC TYPE"',
    '"TARGET GROUP"',
    '"EFFECTIVE DATE"',
    '"DUE DATE"',
    '"ELIGIBLE STAFF"',
    '"CONFIRMED STAFF"',
    '"MISSING STAFF"',
    '"COMPLETION %"'
  ].join(','));

  statsList.forEach(s => {
    lines.push([
      escapeCSV(s.topic.id),
      escapeCSV(s.topic.title),
      escapeCSV(s.topic.type + (s.topic.customTypeDesc ? ` (${s.topic.customTypeDesc})` : '')),
      escapeCSV(s.topic.targetGroup),
      escapeCSV(s.topic.effectiveDate),
      escapeCSV(s.topic.dueDate),
      escapeCSV(s.totalEligible),
      escapeCSV(s.totalConfirmed),
      escapeCSV(s.totalMissing),
      escapeCSV(`${s.completionRate}%`)
    ].join(','));
  });

  lines.push(`""`);
  lines.push(`"--- SECTION 2: DETAILED PERSONNEL ASSIGNMENT BREAKDOWN ---"`);
  lines.push([
    '"TOPIC ID"',
    '"TOPIC TITLE"',
    '"TOPIC TYPE"',
    '"TARGET GROUP"',
    '"UNUMBER"',
    '"STAFF NAME"',
    '"EMAIL"',
    '"ALS"',
    '"LEAD"',
    '"STATUS"',
    '"CONFIRMED AT"',
    '"SIGNATURE"'
  ].join(','));

  statsList.forEach(s => {
    const confirmedMap = new Map<string, TopicConfirmation>();
    s.confirmedStaff.forEach(item => confirmedMap.set(item.user.id, item.confirmation));

    // Sort missing first
    const sorted = [...s.eligibleStaff].sort((a, b) => {
      const aConf = confirmedMap.has(a.id);
      const bConf = confirmedMap.has(b.id);
      if (aConf === bConf) return a.name.localeCompare(b.name);
      return aConf ? 1 : -1;
    });

    sorted.forEach(u => {
      const conf = confirmedMap.get(u.id);
      lines.push([
        escapeCSV(s.topic.id),
        escapeCSV(s.topic.title),
        escapeCSV(s.topic.type),
        escapeCSV(s.topic.targetGroup),
        escapeCSV(u.uNumber),
        escapeCSV(u.name),
        escapeCSV(u.email),
        escapeCSV(u.isAls ? 'Y' : 'N'),
        escapeCSV(u.isLead ? 'Y' : 'N'),
        escapeCSV(conf ? 'CONFIRMED' : 'MISSING / PENDING'),
        escapeCSV(conf ? conf.confirmedAt : '-'),
        escapeCSV(conf?.signatureText || (conf ? u.name : '-'))
      ].join(','));
    });
  });

  const filename = `Bulk_Compliance_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(lines.join('\r\n'), filename);
}

// 3. Export Staff Roster with Individual Compliance Scores
export function exportStaffRosterCompliance(
  users: User[],
  topics: Topic[],
  confirmations: TopicConfirmation[]
) {
  const lines: string[] = [];

  lines.push(`"ORGANIZATIONAL STAFF COMPLIANCE ROSTER"`);
  lines.push(`"Generated At: ${new Date().toISOString()}"`);
  lines.push(`"Total Staff Count: ${users.length}"`);
  lines.push(`""`);

  lines.push([
    '"UNUMBER"',
    '"NAMES"',
    '"EMAIL"',
    '"ALS"',
    '"LEAD"',
    '"ADMIN"',
    '"DEPARTMENT / TITLE"',
    '"ASSIGNED TOPICS COUNT"',
    '"CONFIRMED COUNT"',
    '"PENDING COUNT"',
    '"COMPLIANCE RATE %"'
  ].join(','));

  users.forEach(u => {
    const assigned = topics.filter(t => {
      if (t.targetGroup === 'ALL') return true;
      if (t.targetGroup === 'ALS') return u.isAls;
      if (t.targetGroup === 'Lead') return u.isLead;
      return false;
    });

    const confirmed = assigned.filter(t =>
      confirmations.some(c => c.topicId === t.id && c.userId === u.id && c.status === 'confirmed')
    );

    const pending = assigned.length - confirmed.length;
    const rate = assigned.length > 0 ? Math.round((confirmed.length / assigned.length) * 100) : 100;

    lines.push([
      escapeCSV(u.uNumber),
      escapeCSV(u.name),
      escapeCSV(u.email),
      escapeCSV(u.isAls ? 'Y' : 'N'),
      escapeCSV(u.isLead ? 'Y' : 'N'),
      escapeCSV(u.isAdmin ? 'Y' : 'N'),
      escapeCSV(u.title || u.department || '-'),
      escapeCSV(assigned.length),
      escapeCSV(confirmed.length),
      escapeCSV(pending),
      escapeCSV(`${rate}%`)
    ].join(','));
  });

  const filename = `Staff_Roster_Compliance_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(lines.join('\r\n'), filename);
}
