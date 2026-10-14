import * as XLSX from 'xlsx';
import { Topic, User, TopicConfirmation, TopicAssignment, TargetGroup, TopicType } from './types';
import { INITIAL_STAFF_ROSTER } from './roster-data';

export interface ParsedTopicParticipationRow {
  topicId: string;
  topicTitle: string;
  topicType: TopicType;
  targetGroup: TargetGroup;
  uNumber: string;
  staffName: string;
  email: string;
  isAls: boolean;
  isLead: boolean;
  status: 'confirmed' | 'pending' | 'not_participated' | 'pending_late_approval';
  confirmedAt?: string;
  signature?: string;
}

export interface TopicParticipationSummary {
  topic: Topic;
  rows: ParsedTopicParticipationRow[];
  participatedRows: ParsedTopicParticipationRow[];
  missingRows: ParsedTopicParticipationRow[];
  totalAssigned: number;
  totalConfirmed: number;
  totalPending: number;
  completionRate: number;
}

export interface TopicParticipationImportResult {
  rows: ParsedTopicParticipationRow[];
  topics: Topic[];
  topicSummaries: TopicParticipationSummary[];
  users: User[];
  confirmations: TopicConfirmation[];
  assignments: TopicAssignment[];
  stats: {
    totalRows: number;
    totalTopics: number;
    totalStaff: number;
    totalConfirmed: number;
    totalPending: number;
  };
}

function cleanString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function normalizeHeader(header: string): string {
  return header
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function normalizeTopicDirectiveKey(title: string): string {
  let norm = (title || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ');
  // Trim trailing month / year tokens if attached at end (e.g. "test GPD Oct" -> "test gpd")
  norm = norm
    .replace(/\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|2024|2025|2026)$/i, '')
    .trim();
  return norm;
}

export function normalizeTitleKey(title: string): string {
  return normalizeTopicDirectiveKey(title);
}

function normalizeTargetGroup(val: string): TargetGroup {
  const clean = cleanString(val).toUpperCase().replace(/[^A-Z]/g, '');
  if (clean === 'ALSANDLEAD' || clean === 'ALSLEAD') return 'ALS_AND_LEAD';
  if (clean === 'ALS') return 'ALS';
  if (clean === 'LEAD') return 'Lead';
  if (clean === 'CUTOM' || clean === 'CUSTOM') return 'CUSTOM';
  return 'ALL';
}

function normalizeTopicType(val: string): TopicType {
  const clean = cleanString(val).toLowerCase();
  if (clean.includes('briefing')) return 'Briefing';
  if (clean.includes('gpd') || clean.includes('gpi')) return 'GPD/GPI Read and Sign';
  if (clean.includes('ahd') || clean.includes('ahi')) return 'AHD/AHI Read and Sign';
  if (clean.includes('read') && clean.includes('sign')) return 'Document Read and Sign';
  if (clean.includes('training')) return 'Training';
  if (clean.includes('role play') || clean.includes('roleplay')) return 'Role Play';
  if (clean.includes('teams')) return 'Teams Calls';
  if (clean.includes('vitero')) return 'Vitero Sessions';
  if (clean.includes('community')) return 'Ground Ops Community Calls';
  if (clean.includes('wbt')) return 'WBT';
  return 'Document Read and Sign';
}

export function resolveStaffUserId(
  uNumber: string,
  email?: string,
  name?: string,
  existingUsers?: User[]
): string {
  const cleanU = cleanString(uNumber).toUpperCase();
  const rawDigits = cleanU.replace(/^U[-_\s]*/i, '').replace(/[^a-zA-Z0-9]/g, '');
  const cleanEmail = cleanString(email).toLowerCase();
  const cleanName = cleanString(name).toUpperCase().replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const namePartsSorted = cleanName ? cleanName.split(' ').sort().join(' ') : '';

  const roster = existingUsers && existingUsers.length > 0 ? existingUsers : INITIAL_STAFF_ROSTER;

  if (roster && roster.length > 0) {
    const matched = roster.find(u => {
      // 1. Direct U-Number match (exact or stripped of leading U / hyphens)
      if (cleanU && u.uNumber) {
        const uNumClean = u.uNumber.trim().toUpperCase();
        const uNumDigits = uNumClean.replace(/^U[-_\s]*/i, '').replace(/[^a-zA-Z0-9]/g, '');
        if (uNumClean === cleanU) return true;
        if (rawDigits && uNumDigits && rawDigits === uNumDigits) return true;
      }

      // 2. ID matching (handling u-151236, u-u151236, etc.)
      if (rawDigits && u.id) {
        const uIdClean = u.id.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^u+/, '');
        if (uIdClean && uIdClean === rawDigits.toLowerCase()) return true;
      }

      // 3. Email matching (exact or prefix before @)
      if (cleanEmail && u.email) {
        const uMail = u.email.trim().toLowerCase();
        if (uMail === cleanEmail) return true;
        if (cleanEmail.includes('@') && uMail.includes('@')) {
          if (cleanEmail.split('@')[0] === uMail.split('@')[0]) return true;
        }
      }

      // 4. Name matching (exact or reversed first/last name parts)
      if (cleanName && u.name) {
        const rosterNameClean = u.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
        if (rosterNameClean === cleanName) return true;
        const rosterPartsSorted = rosterNameClean.split(' ').sort().join(' ');
        if (namePartsSorted && rosterPartsSorted && namePartsSorted === rosterPartsSorted) return true;
      }

      return false;
    });

    if (matched) return matched.id;
  }

  // Canonical format matching station roster schema (e.g. U151236 -> u-151236, SAKS -> u-saks, ADMIN -> u-admin)
  if (rawDigits && /^\d+$/.test(rawDigits)) {
    return `u-${rawDigits.toLowerCase()}`;
  }
  const cleanAlpha = cleanU.replace(/^U[-_\s]*/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanAlpha) {
    return `u-${cleanAlpha}`;
  }
  return `u-${cleanU.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

export function parseTopicParticipationBuffer(
  buffer: ArrayBuffer | Uint8Array | string,
  existingUsers?: User[]
): TopicParticipationImportResult {
  const workbook = typeof buffer === 'string'
    ? XLSX.read(buffer, { type: 'binary' })
    : XLSX.read(buffer, { type: 'array' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded file contains no worksheets.');
  }

  const rawRows: ParsedTopicParticipationRow[] = [];

  // Parse all sheets in workbook to avoid missing multi-tab data
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (!rawData || rawData.length === 0) continue;

    // Find header row index in this sheet
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      if (Array.isArray(row)) {
        const rowText = row.map(cell => cleanString(cell).toUpperCase()).join(' ');
        if (
          (rowText.includes('TOPIC') && (rowText.includes('STAFF') || rowText.includes('NAME') || rowText.includes('NUMBER') || rowText.includes('STATUS'))) ||
          (rowText.includes('TOPIC ID') && rowText.includes('UNUMBER')) ||
          (rowText.includes('TITLE') && (rowText.includes('STATUS') || rowText.includes('CONFIRM') || rowText.includes('PARTICIPAT'))) ||
          (rowText.includes('UNUMBER') && rowText.includes('NAME'))
        ) {
          headerRowIndex = i;
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      headerRowIndex = 0; // Default to first row
    }

    const rawHeaders = rawData[headerRowIndex]?.map(h => cleanString(h)) || [];
    if (rawHeaders.length === 0) continue;

    const colMap: Record<string, number> = {};

    rawHeaders.forEach((h, idx) => {
      const norm = normalizeHeader(h);

      // Date / Timestamp column
      if (
        norm.includes('CONFIRMEDAT') ||
        norm.includes('CONFIRMEDON') ||
        norm.includes('CONFIRMATIONDATE') ||
        norm.includes('CONFIRMEDDATE') ||
        norm.includes('SIGNINGDATE') ||
        norm.includes('SIGNEDAT') ||
        norm.includes('TIMESTAMP') ||
        norm.includes('DATE') ||
        norm.includes('TIME')
      ) {
        colMap.confirmedAt = idx;
      }
      // Status / Participation column
      else if (
        norm.includes('STATUS') ||
        norm.includes('PARTICIPATION') ||
        norm.includes('PARTICIPATED') ||
        norm.includes('ATTENDANCE') ||
        norm.includes('ATTENDED') ||
        norm.includes('CONFIRMATION') ||
        norm.includes('CONFIRMED') ||
        norm.includes('CONFIRM') ||
        norm.includes('ACKNOWLEDGED') ||
        norm.includes('ACKNOWLEDGEMENT') ||
        norm.includes('COMPLETED') ||
        norm.includes('COMPLETION') ||
        norm.includes('STATE')
      ) {
        colMap.status = idx;
      }
      // Topic identifiers
      else if (norm.includes('TOPICID') || norm === 'ID') colMap.topicId = idx;
      else if (norm.includes('TOPICTITLE') || norm.includes('TITLE') || norm.includes('TOPICNAME') || norm === 'TOPIC') colMap.topicTitle = idx;
      else if (norm.includes('TOPICTYPE') || norm.includes('TYPE')) colMap.topicType = idx;
      else if (norm.includes('TARGET') || norm.includes('GROUP')) colMap.targetGroup = idx;
      // Staff identifiers
      else if (norm.includes('UNUMBER') || norm.includes('STAFFID') || norm === 'STAFFNUMBER' || norm === 'UID') colMap.uNumber = idx;
      else if (norm.includes('STAFFNAME') || norm.includes('NAME') || norm === 'STAFF' || norm === 'EMPLOYEENAME') colMap.staffName = idx;
      else if (norm.includes('EMAIL') || norm.includes('MAIL')) colMap.email = idx;
      else if (norm === 'ALS') colMap.isAls = idx;
      else if (norm === 'LEAD') colMap.isLead = idx;
      // Signature
      else if (norm.includes('SIGNATURE') || norm.includes('SIGNEDBY') || norm.includes('SIGN')) colMap.signature = idx;
    });

    for (let r = headerRowIndex + 1; r < rawData.length; r++) {
      const row = rawData[r];
      if (!row || row.length === 0) continue;

      const topicTitle = cleanString(row[colMap.topicTitle]);
      const uNumber = cleanString(row[colMap.uNumber]);
      const staffName = cleanString(row[colMap.staffName]);

      // Skip empty separator rows
      if (!topicTitle && !uNumber && !staffName) continue;

      const rawTopicId = cleanString(row[colMap.topicId]);
      const topicId = rawTopicId || `top-${topicTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 16)}`;
      const topicType = normalizeTopicType(cleanString(row[colMap.topicType]));
      const targetGroup = normalizeTargetGroup(cleanString(row[colMap.targetGroup]));
      const email = cleanString(row[colMap.email]);

      const alsRaw = cleanString(row[colMap.isAls]).toUpperCase();
      const isAls = alsRaw === 'Y' || alsRaw === 'YES' || alsRaw === 'TRUE';

      const leadRaw = cleanString(row[colMap.isLead]).toUpperCase();
      const isLead = leadRaw === 'Y' || leadRaw === 'YES' || leadRaw === 'TRUE';

      // Comprehensive Status Detection
      const statusRaw = cleanString(row[colMap.status]).toUpperCase();
      let confirmedAtRaw = cleanString(row[colMap.confirmedAt]);
      const signatureRaw = cleanString(row[colMap.signature]);

      // If status column contains a timestamp, swap with confirmedAt
      if (!confirmedAtRaw && (statusRaw.includes('T') || statusRaw.includes(':') || (!isNaN(Number(statusRaw)) && Number(statusRaw) > 20000))) {
        confirmedAtRaw = statusRaw;
      }

      // Check affirmative status keywords
      const isAffirmative =
        statusRaw.includes('CONFIRM') ||
        statusRaw === 'YES' || statusRaw === 'Y' ||
        statusRaw.includes('COMPLETE') ||
        statusRaw.includes('ACKNOWLEDGE') ||
        statusRaw.includes('SIGN') ||
        statusRaw.includes('PARTICIPAT') ||
        statusRaw.includes('ATTEND') ||
        statusRaw === 'DONE' ||
        statusRaw === 'TRUE' ||
        statusRaw === '1' ||
        statusRaw === 'OK' ||
        statusRaw.includes('VERIF') ||
        statusRaw.includes('APPROV') ||
        statusRaw.includes('PRESENT') ||
        statusRaw.includes('PASS') ||
        statusRaw.includes('READ') ||
        statusRaw.includes('COMPLIAN') ||
        statusRaw.includes('SUBMIT') ||
        statusRaw.includes('CHECK');

      // Check explicit negative indicators
      const isExplicitNegative =
        statusRaw.includes('NOT PARTICIPAT') ||
        statusRaw.includes('NOT ATTEND') ||
        statusRaw.includes('NOT COMPLIAN') ||
        statusRaw.includes('ABSENT') ||
        statusRaw.includes('DID NOT') ||
        statusRaw === 'NO' || statusRaw === 'N' ||
        statusRaw === 'FALSE' || statusRaw === '0' ||
        statusRaw.includes('UNCONFIRM') ||
        statusRaw.includes('PENDING') ||
        statusRaw.includes('MISSING');

      // Check presence of valid signature
      const hasValidSignature = Boolean(
        signatureRaw &&
        signatureRaw !== '-' &&
        signatureRaw !== 'N/A' &&
        signatureRaw !== 'PENDING' &&
        signatureRaw !== 'NO' &&
        signatureRaw !== 'NONE' &&
        signatureRaw.trim().length >= 2
      );

      // Check presence of valid confirmation timestamp
      const hasValidDate = Boolean(
        confirmedAtRaw &&
        confirmedAtRaw !== '-' &&
        confirmedAtRaw !== 'N/A' &&
        confirmedAtRaw !== 'PENDING' &&
        (!isNaN(Number(confirmedAtRaw)) ? Number(confirmedAtRaw) > 20000 : !isNaN(Date.parse(confirmedAtRaw)))
      );

      let rowStatus: 'confirmed' | 'pending' | 'not_participated' | 'pending_late_approval' = 'pending';

      // Both signature and date present -> unconditionally confirmed
      if (hasValidSignature && hasValidDate) {
        rowStatus = 'confirmed';
      } else if (isAffirmative && !statusRaw.includes('NOT')) {
        rowStatus = 'confirmed';
      } else if ((hasValidSignature || hasValidDate) && !isExplicitNegative) {
        rowStatus = 'confirmed';
      } else if (statusRaw.includes('NOT PARTICIPAT') || statusRaw.includes('ABSENT')) {
        rowStatus = 'not_participated';
      } else if (statusRaw.includes('LATE') || statusRaw.includes('PENDING_LATE')) {
        rowStatus = 'pending_late_approval';
      }

      let confirmedAt: string | undefined = undefined;
      if (rowStatus === 'confirmed') {
        if (hasValidDate) {
          if (!isNaN(Number(confirmedAtRaw)) && Number(confirmedAtRaw) > 20000) {
            try {
              const dateObj = new Date(Math.round((Number(confirmedAtRaw) - 25569) * 86400 * 1000));
              confirmedAt = dateObj.toISOString();
            } catch {
              confirmedAt = new Date().toISOString();
            }
          } else {
            try {
              confirmedAt = new Date(confirmedAtRaw).toISOString();
            } catch {
              confirmedAt = new Date().toISOString();
            }
          }
        } else {
          confirmedAt = new Date().toISOString();
        }
      }

      rawRows.push({
        topicId,
        topicTitle: topicTitle || topicId,
        topicType,
        targetGroup,
        uNumber: uNumber || 'U-TEMP',
        staffName: staffName || uNumber || 'Staff Member',
        email: email || '',
        isAls,
        isLead,
        status: rowStatus,
        confirmedAt,
        signature: rowStatus === 'confirmed' ? (hasValidSignature ? signatureRaw : staffName) : undefined,
      });
    }
  }

  if (rawRows.length === 0) {
    throw new Error('No valid topic participation rows found in file.');
  }

  return assembleDataFromRows(rawRows, existingUsers);
}

export function assembleDataFromRows(
  rawRows: ParsedTopicParticipationRow[],
  existingUsers?: User[]
): TopicParticipationImportResult {
  const topicsMap = new Map<string, Topic>();
  const usersMap = new Map<string, User>();
  const confirmationsMap = new Map<string, TopicConfirmation>();
  const assignmentsMap = new Map<string, TopicAssignment>();

  // Canonical topic key resolution: map normalized directive title to canonical topicId
  const titleToCanonicalId = new Map<string, string>();
  const titleToCanonicalTitle = new Map<string, string>();

  const todayStr = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  // First pass: resolve canonical topic IDs and canonical titles
  rawRows.forEach(row => {
    const directiveKey = normalizeTopicDirectiveKey(row.topicTitle);
    if (!titleToCanonicalId.has(directiveKey)) {
      const canonicalTopicId = row.topicId || `top-${directiveKey.slice(0, 20).replace(/\s+/g, '-')}`;
      titleToCanonicalId.set(directiveKey, canonicalTopicId);
      titleToCanonicalTitle.set(directiveKey, row.topicTitle);
    }
  });

  // Second pass: Deduplicate participants per (canonicalTopicId, canonicalUserId)
  // If ANY row for the staff member in this topic is 'confirmed', they are CONFIRMED!
  const participantsMap = new Map<string, ParsedTopicParticipationRow>();

  rawRows.forEach(row => {
    const directiveKey = normalizeTopicDirectiveKey(row.topicTitle);
    const canonicalTopicId = titleToCanonicalId.get(directiveKey) || row.topicId;
    const canonicalTopicTitle = titleToCanonicalTitle.get(directiveKey) || row.topicTitle;
    const userId = resolveStaffUserId(row.uNumber, row.email, row.staffName, existingUsers);

    const partKey = `${canonicalTopicId}_${userId}`;
    const existing = participantsMap.get(partKey);

    if (!existing) {
      participantsMap.set(partKey, {
        ...row,
        topicId: canonicalTopicId,
        topicTitle: canonicalTopicTitle,
      });
    } else {
      // Merge: if existing is not confirmed but current is confirmed, confirmed takes precedence
      if (row.status === 'confirmed') {
        participantsMap.set(partKey, {
          ...existing,
          ...row,
          topicId: canonicalTopicId,
          topicTitle: canonicalTopicTitle,
          status: 'confirmed',
          confirmedAt: row.confirmedAt || existing.confirmedAt || nowIso,
          signature: row.signature || existing.signature || row.staffName,
        });
      } else if (existing.status !== 'confirmed' && row.status === 'pending_late_approval') {
        participantsMap.set(partKey, {
          ...existing,
          status: 'pending_late_approval',
        });
      }
    }
  });

  // Canonical deduplicated rows across all topics
  const rows: ParsedTopicParticipationRow[] = Array.from(participantsMap.values());

  rows.forEach(row => {
    const userId = resolveStaffUserId(row.uNumber, row.email, row.staffName, existingUsers);

    // 1. Process User
    if (!usersMap.has(userId)) {
      usersMap.set(userId, {
        id: userId,
        uNumber: row.uNumber,
        name: row.staffName,
        email: row.email,
        isAls: row.isAls,
        isLead: row.isLead,
        isAdmin: row.uNumber.toUpperCase() === 'ADMIN' || row.email.toLowerCase() === 'admin@compliance.system',
        department: 'Station Operations',
        title: row.isLead ? 'Station Lead' : row.isAls ? 'ALS Ground Staff' : 'Ground Operations Staff',
      });
    }

    // 2. Process Topic (strictly one canonical topic per directive)
    if (!topicsMap.has(row.topicId)) {
      topicsMap.set(row.topicId, {
        id: row.topicId,
        title: row.topicTitle,
        type: row.topicType,
        targetGroup: row.targetGroup,
        assignedUserIds: [],
        content: `Operational directive and requirements for "${row.topicTitle}". Please review all attached guidelines and complete acknowledgment before station duty.`,
        effectiveDate: todayStr,
        dueDate: '2026-10-31',
        createdAt: nowIso,
        createdBy: 'Station Administrator',
        version: 'v1.0',
        publishedDate: todayStr,
      });
    }

    const topic = topicsMap.get(row.topicId)!;

    // Harmonize target group: ALL takes precedence, then ALS_AND_LEAD
    if (row.targetGroup === 'ALL' || topic.targetGroup === 'ALL') {
      topic.targetGroup = 'ALL';
    } else if (
      row.targetGroup === 'ALS_AND_LEAD' || topic.targetGroup === 'ALS_AND_LEAD' ||
      (topic.targetGroup === 'ALS' && row.targetGroup === 'Lead') ||
      (topic.targetGroup === 'Lead' && row.targetGroup === 'ALS')
    ) {
      topic.targetGroup = 'ALS_AND_LEAD';
    }

    if (!topic.assignedUserIds) topic.assignedUserIds = [];
    if (!topic.assignedUserIds.includes(userId)) {
      topic.assignedUserIds.push(userId);
    }

    // 3. Process Assignment
    const assignmentId = `${row.topicId}_${userId}`;
    assignmentsMap.set(assignmentId, {
      id: assignmentId,
      topicId: row.topicId,
      topicTitle: row.topicTitle,
      topicType: row.topicType,
      userId,
      userName: row.staffName,
      userEmail: row.email,
      uNumber: row.uNumber,
      targetGroup: topic.targetGroup,
      isIndividuallySelected: topic.targetGroup === 'CUSTOM',
      assignedAt: nowIso,
      dueDate: '2026-10-31',
      status: row.status === 'confirmed' ? 'confirmed' : row.status === 'not_participated' ? 'not_participated' : 'pending',
      isAls: row.isAls,
      isLead: row.isLead,
      staffQualification: row.isAls && row.isLead ? 'ALS & Lead' : row.isAls ? 'ALS' : row.isLead ? 'Lead' : 'Standard',
      confirmedAt: row.confirmedAt,
    });

    // 4. Process Confirmation if Confirmed
    if (row.status === 'confirmed') {
      const confId = `conf-${row.topicId}-${userId}`;
      confirmationsMap.set(confId, {
        id: confId,
        topicId: row.topicId,
        documentId: row.topicId,
        documentTitle: row.topicTitle,
        documentVersion: 'v1.0',
        userId,
        uNumber: row.uNumber,
        userName: row.staffName,
        userEmail: row.email,
        confirmedAt: row.confirmedAt || nowIso,
        status: 'confirmed',
        signatureText: row.signature || row.staffName,
        ipAddress: '10.240.12.88',
        adminReviewNote: 'Imported from verified Topic Participation Master Ledger',
      });
    }
  });

  const topics = Array.from(topicsMap.values());
  const users = Array.from(usersMap.values());
  const confirmations = Array.from(confirmationsMap.values());
  const assignments = Array.from(assignmentsMap.values());

  const totalConfirmed = rows.filter(r => r.status === 'confirmed').length;
  const totalPending = rows.length - totalConfirmed;

  // Build per-topic participation summaries (1 row per topic with all its participants)
  const topicSummaries: TopicParticipationSummary[] = topics.map(topic => {
    const topicRows = rows.filter(r => r.topicId === topic.id);
    const participatedRows = topicRows.filter(r => r.status === 'confirmed');
    const missingRows = topicRows.filter(r => r.status !== 'confirmed');
    const completionRate = topicRows.length > 0
      ? Math.round((participatedRows.length / topicRows.length) * 100)
      : 0;

    return {
      topic,
      rows: topicRows,
      participatedRows,
      missingRows,
      totalAssigned: topicRows.length,
      totalConfirmed: participatedRows.length,
      totalPending: missingRows.length,
      completionRate,
    };
  });

  return {
    rows,
    topics,
    topicSummaries,
    users,
    confirmations,
    assignments,
    stats: {
      totalRows: rows.length,
      totalTopics: topics.length,
      totalStaff: users.length,
      totalConfirmed,
      totalPending,
    },
  };
}

// Pre-packaged dataset extracted from the provided sheet images
import { RAW_PROVIDED_SHEET_ROWS } from './provided-sheet-data';

export function getProvidedSheetData(existingUsers?: User[]): TopicParticipationImportResult {
  return assembleDataFromRows(RAW_PROVIDED_SHEET_ROWS, existingUsers);
}
