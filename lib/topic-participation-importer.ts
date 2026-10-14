import * as XLSX from 'xlsx';
import { User, Topic } from './types';

export interface TopicParticipationRecord {
  userId: string;
  userName: string;
  userEmail: string;
  uNumber?: string;
  topicId: string;
  topicTitle: string;
  topicType?: string;
  targetGroup?: string;
  als?: string;
  lead?: string;
  confirmedAt: string;
  status: 'confirmed' | 'pending_wbt_verification' | 'rejected' | 'missing';
  signature?: string;
  notes?: string;
}

export interface TopicParticipationImportResult {
  records: TopicParticipationRecord[];
  newUsersToSave?: User[];
  newTopicsToSave?: Topic[];
  matchedStaffCount: number;
  matchedTopicsCount: number;
  unmatchedStaff: string[];
  unmatchedTopics: string[];
  totalRowsProcessed: number;
  errors: string[];
}

/**
 * Normalizes strings for flexible fuzzy header/field comparison
 */
function normalizeStr(str: string): string {
  return (str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if a cell value represents a positive participation/confirmation indicator
 */
function isPositiveIndicator(val: any): boolean {
  if (val === null || val === undefined) return false;
  const str = String(val).trim().toLowerCase();
  if (!str || str === '0' || str === 'no' || str === 'false' || str === 'n' || str === 'missing' || str === 'pending' || str === 'unconfirmed' || str === 'not confirmed' || str === 'rejected' || str === 'not started' || str === 'incomplete') {
    return false;
  }
  return (
    str === 'yes' ||
    str === '1' ||
    str === 'y' ||
    str === 'true' ||
    str === 'confirmed' ||
    str === 'confirm' ||
    str === 'completed' ||
    str === 'participated' ||
    str === 'pass' ||
    str === 'passed' ||
    str === 'ok' ||
    str === 'signed' ||
    str === 'done' ||
    str === 'x font' ||
    str === 'x' ||
    str === 'v' ||
    !isNaN(Date.parse(str))
  );
}

/**
 * Parses binary or string content (XLSX, XLS, CSV, TSV) into a structured participation import result
 */
export function parseParticipationFileContent(
  fileContent: ArrayBuffer | string,
  users: User[],
  topics: Topic[]
): TopicParticipationImportResult {
  const result: TopicParticipationImportResult = {
    records: [],
    newUsersToSave: [],
    newTopicsToSave: [],
    matchedStaffCount: 0,
    matchedTopicsCount: 0,
    unmatchedStaff: [],
    unmatchedTopics: [],
    totalRowsProcessed: 0,
    errors: [],
  };

  try {
    let workbook: XLSX.WorkBook;
    if (typeof fileContent === 'string') {
      workbook = XLSX.read(fileContent, { type: 'string' });
    } else {
      workbook = XLSX.read(fileContent, { type: 'array' });
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      result.errors.push('The uploaded file contains no readable sheets.');
      return result;
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (rawRows.length < 2) {
      result.errors.push('File must contain at least a header row and one data row.');
      return result;
    }

    const headerRow: string[] = (rawRows[0] || []).map((h) => String(h || '').trim());
    if (headerRow.length === 0) {
      result.errors.push('Header row is empty.');
      return result;
    }

    const workingUsersList = [...users];
    const workingTopicsList = [...topics];

    const matchedUsersMap = new Map<string, User>();
    const matchedTopicsMap = new Map<string, Topic>();
    const newUsersMap = new Map<string, User>();
    const newTopicsMap = new Map<string, Topic>();
    const recordsMap = new Map<string, TopicParticipationRecord>(); // key: `userId_topicId`

    const normalizedHeaders = headerRow.map((h) => normalizeStr(h));

    // Check if flat list with the specified 12-column format
    const isFlatList =
      normalizedHeaders.some((h) => h.includes('topic')) &&
      normalizedHeaders.some((h) => h.includes('email') || h.includes('unumber') || h.includes('staff') || h.includes('name'));

    if (isFlatList) {
      // FLAT LIST FORMAT (e.g. TOPIC ID, TOPIC TITLE, TOPIC TYPE, TARGET GROUP, UNUMBER, STAFF NAME, EMAIL, ALS, LEAD, STATUS, CONFIRMED AT, SIGNATURE)
      const topicIdColIdx = normalizedHeaders.findIndex((h) => h === 'topicid' || (h === 'id' && normalizedHeaders.includes('topictitle')));
      const topicTitleColIdx = normalizedHeaders.findIndex((h) => h === 'topictitle' || (h.includes('topic') && !h.includes('type') && !h.includes('id')));
      const topicTypeColIdx = normalizedHeaders.findIndex((h) => h === 'topictype' || h === 'type');
      const targetGroupColIdx = normalizedHeaders.findIndex((h) => h === 'targetgroup' || h === 'group');
      const uNumberColIdx = normalizedHeaders.findIndex((h) => h === 'unumber' || h === 'unum' || h === 'staffid');
      const staffNameColIdx = normalizedHeaders.findIndex((h) => h === 'staffname' || h === 'name' || h === 'staff');
      const emailColIdx = normalizedHeaders.findIndex((h) => h === 'email' || h === 'mail' || h === 'useremail');
      const alsColIdx = normalizedHeaders.findIndex((h) => h === 'als');
      const leadColIdx = normalizedHeaders.findIndex((h) => h === 'lead');
      const statusColIdx = normalizedHeaders.findIndex((h) => h === 'status' || h === 'state');
      const confirmedAtColIdx = normalizedHeaders.findIndex((h) => h === 'confirmedat' || h.includes('date') || h.includes('time'));
      const signatureColIdx = normalizedHeaders.findIndex((h) => h === 'signature' || h === 'sig');

      for (let r = 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0 || row.every((c) => !c)) continue;
        result.totalRowsProcessed++;

        const topicIdVal = topicIdColIdx >= 0 ? String(row[topicIdColIdx] || '').trim() : '';
        const topicTitleVal = topicTitleColIdx >= 0 ? String(row[topicTitleColIdx] || '').trim() : '';
        const topicTypeVal = topicTypeColIdx >= 0 ? String(row[topicTypeColIdx] || '').trim() : '';
        const targetGroupVal = targetGroupColIdx >= 0 ? String(row[targetGroupColIdx] || '').trim() : '';
        const uNumVal = uNumberColIdx >= 0 ? String(row[uNumberColIdx] || '').trim() : '';
        const staffNameVal = staffNameColIdx >= 0 ? String(row[staffNameColIdx] || '').trim() : '';
        const emailVal = emailColIdx >= 0 ? String(row[emailColIdx] || '').trim() : '';
        const alsVal = alsColIdx >= 0 ? String(row[alsColIdx] || '').trim() : '';
        const leadVal = leadColIdx >= 0 ? String(row[leadColIdx] || '').trim() : '';
        const statusVal = statusColIdx >= 0 ? String(row[statusColIdx] || '').trim() : '';
        const confirmedAtVal = confirmedAtColIdx >= 0 ? String(row[confirmedAtColIdx] || '').trim() : '';
        const signatureVal = signatureColIdx >= 0 ? String(row[signatureColIdx] || '').trim() : '';

        // Match user by Email first, then U-Number, then Staff Name
        let matchedUser = workingUsersList.find((u) => {
          if (emailVal && (u.email || '').toLowerCase() === emailVal.toLowerCase()) return true;
          if (uNumVal && (u.uNumber || '').toLowerCase() === uNumVal.toLowerCase()) return true;
          if (staffNameVal && (u.name || '').toLowerCase() === staffNameVal.toLowerCase()) return true;
          return false;
        });

        if (!matchedUser) {
          // If staff member does not exist in roster, create new staff record automatically so no row is dropped
          const newUserId = `usr-${(uNumVal || emailVal || staffNameVal).toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now()}`;
          matchedUser = {
            id: newUserId,
            uNumber: uNumVal || `U${Math.floor(1000 + Math.random() * 9000)}`,
            name: staffNameVal || emailVal.split('@')[0] || 'Staff Member',
            email: emailVal || `${(uNumVal || 'staff').toLowerCase()}@airline.com`,
            als: alsVal || 'ALS-1',
            lead: leadVal || 'No',
            role: 'user',
            team: 'Ground Operations',
            department: 'Operations',
            isPasswordSet: false,
          };
          workingUsersList.push(matchedUser);
          newUsersMap.set(matchedUser.id, matchedUser);
        }

        // Match topic by Topic ID first, then Topic Title
        let matchedTopic = workingTopicsList.find((t) => {
          if (topicIdVal && (t.id || '').toLowerCase() === topicIdVal.toLowerCase()) return true;
          if (topicTitleVal && (t.title || '').toLowerCase() === topicTitleVal.toLowerCase()) return true;
          if (topicTitleVal && normalizeStr(t.title || '') === normalizeStr(topicTitleVal)) return true;
          if (topicIdVal && normalizeStr(t.id || '') === normalizeStr(topicIdVal)) return true;
          if (topicTitleVal.length >= 4 && (t.title || '').toLowerCase().includes(topicTitleVal.toLowerCase())) return true;
          return false;
        });

        if (!matchedTopic) {
          // If topic does not exist, create new topic record automatically so no row is dropped
          const newTopicId = topicIdVal || `top-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          matchedTopic = {
            id: newTopicId,
            title: topicTitleVal || topicIdVal || 'Compliance Topic',
            description: topicTitleVal || topicIdVal || 'Compliance Directive',
            type: (topicTypeVal as any) || 'Document Read and Sign',
            targetGroup: (targetGroupVal as any) || 'ALL',
            category: 'Compliance Directives',
            content: `Imported Directive: ${topicTitleVal || topicIdVal}`,
            createdBy: 'CSV Import',
            createdAt: new Date().toISOString(),
            status: 'active',
          };
          workingTopicsList.push(matchedTopic);
          newTopicsMap.set(matchedTopic.id, matchedTopic);
        }

        matchedUsersMap.set(matchedUser.id, matchedUser);
        matchedTopicsMap.set(matchedTopic.id, matchedTopic);

        const recKey = `${matchedUser.id}_${matchedTopic.id}`;
        let recordDate = new Date().toISOString();
        if (confirmedAtVal && !isNaN(Date.parse(confirmedAtVal))) {
          recordDate = new Date(confirmedAtVal).toISOString();
        }

        const isWbt = matchedTopic.type === 'WBT' || matchedTopic.type === 'Web-Based Training' || topicTypeVal.toUpperCase() === 'WBT';

        // Evaluate STATUS field: confirmed vs not confirmed
        const statusClean = statusVal.trim().toUpperCase();
        let recordStatus: 'confirmed' | 'pending_wbt_verification' | 'rejected' | 'missing' = 'confirmed';

        if (
          statusClean === 'CONFIRMED' ||
          statusClean === 'CONFIRM' ||
          statusClean === 'COMPLETED' ||
          statusClean === 'PASSED' ||
          statusClean === 'PASS' ||
          statusClean === 'YES' ||
          statusClean === 'Y' ||
          statusClean === 'TRUE' ||
          statusClean === '1' ||
          statusClean === 'OK' ||
          statusClean === 'SIGNED' ||
          statusClean === 'DONE'
        ) {
          recordStatus = isWbt ? 'pending_wbt_verification' : 'confirmed';
        } else if (
          statusClean === 'PENDING_WBT_VERIFICATION' ||
          statusClean === 'PENDING WBT' ||
          statusClean === 'WBT PENDING'
        ) {
          recordStatus = 'pending_wbt_verification';
        } else if (statusClean === 'REJECTED') {
          recordStatus = 'rejected';
        } else if (
          statusClean === 'MISSING' ||
          statusClean === 'PENDING' ||
          statusClean === 'NOT CONFIRMED' ||
          statusClean === 'UNCONFIRMED' ||
          statusClean === 'NO' ||
          statusClean === 'N' ||
          statusClean === 'FALSE' ||
          statusClean === '0' ||
          statusClean === 'NOT STARTED' ||
          statusClean === 'INCOMPLETE'
        ) {
          recordStatus = 'missing';
        } else if (statusClean) {
          recordStatus = isPositiveIndicator(statusVal)
            ? isWbt
              ? 'pending_wbt_verification'
              : 'confirmed'
            : 'missing';
        } else {
          // Default when status column is omitted or empty
          recordStatus = isWbt ? 'pending_wbt_verification' : 'confirmed';
        }

        recordsMap.set(recKey, {
          userId: matchedUser.id,
          userName: matchedUser.name || staffNameVal || matchedUser.email,
          userEmail: matchedUser.email || emailVal,
          uNumber: matchedUser.uNumber || uNumVal,
          topicId: matchedTopic.id,
          topicTitle: matchedTopic.title || topicTitleVal,
          topicType: topicTypeVal || matchedTopic.type,
          targetGroup: targetGroupVal || matchedTopic.targetGroup,
          als: alsVal || matchedUser.als,
          lead: leadVal || matchedUser.lead,
          confirmedAt: recordDate,
          status: recordStatus,
          signature: signatureVal || (recordStatus === 'confirmed' ? 'Electronically Verified' : ''),
          notes: signatureVal ? `Signature: ${signatureVal}` : statusVal ? `Status: ${statusVal}` : 'Imported via Flat CSV',
        });
      }
    } else {
      // MATRIX FORMAT (Headers = Topics, Rows = Staff)
      let staffIdentifierColIdx = -1;
      let nameColIdx = -1;
      let emailColIdx = -1;
      const metadataColIndices = new Set<number>();

      headerRow.forEach((h, idx) => {
        const norm = normalizeStr(h);
        if (norm.includes('email') || norm === 'mail') {
          emailColIdx = idx;
          metadataColIndices.add(idx);
        } else if (norm.includes('name') || norm.includes('staff') || norm.includes('user') || norm === 'names') {
          nameColIdx = idx;
          metadataColIndices.add(idx);
        } else if (norm.includes('unumber') || norm.includes('unum') || norm.includes('id') || norm.includes('staffid') || norm.includes('empid')) {
          staffIdentifierColIdx = idx;
          metadataColIndices.add(idx);
        } else if (
          norm === 'als' ||
          norm === 'lead' ||
          norm === 'team' ||
          norm === 'department' ||
          norm === 'role' ||
          norm === 'status' ||
          norm === 'date' ||
          norm === 'notes' ||
          norm === 'remarks' ||
          norm === 'actions' ||
          norm === '#' ||
          norm === 'sno' ||
          norm === 'no'
        ) {
          metadataColIndices.add(idx);
        }
      });

      if (staffIdentifierColIdx === -1 && nameColIdx === -1 && emailColIdx === -1) {
        staffIdentifierColIdx = 0;
        metadataColIndices.add(0);
      }

      const colToTopicMap = new Map<number, Topic>();
      headerRow.forEach((colHeader, colIdx) => {
        if (metadataColIndices.has(colIdx)) return;
        if (!colHeader.trim()) return;

        const normHeader = normalizeStr(colHeader);
        const matchedTopic = topics.find((t) => {
          const normTitle = normalizeStr(t.title || '');
          const normId = normalizeStr(t.id || '');
          return (
            (t.id || '').toLowerCase() === colHeader.trim().toLowerCase() ||
            (t.title || '').toLowerCase() === colHeader.trim().toLowerCase() ||
            normTitle === normHeader ||
            normId === normHeader ||
            (normHeader.length >= 4 && normTitle.includes(normHeader)) ||
            (normHeader.length >= 4 && normHeader.includes(normTitle))
          );
        });

        if (matchedTopic) {
          colToTopicMap.set(colIdx, matchedTopic);
          matchedTopicsMap.set(matchedTopic.id, matchedTopic);
        } else {
          if (!result.unmatchedTopics.includes(colHeader)) {
            result.unmatchedTopics.push(colHeader);
          }
        }
      });

      for (let r = 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0 || row.every((c) => !c)) continue;
        result.totalRowsProcessed++;

        const emailVal = emailColIdx >= 0 ? String(row[emailColIdx] || '').trim() : '';
        const nameVal = nameColIdx >= 0 ? String(row[nameColIdx] || '').trim() : '';
        const idVal = String(row[staffIdentifierColIdx] || '').trim();

        const matchedUser = users.find(
          (u) =>
            (emailVal && (u.email || '').toLowerCase() === emailVal.toLowerCase()) ||
            (idVal && (u.uNumber || '').toLowerCase() === idVal.toLowerCase()) ||
            (idVal && (u.email || '').toLowerCase() === idVal.toLowerCase()) ||
            (nameVal && (u.name || '').toLowerCase() === nameVal.toLowerCase()) ||
            (idVal && (u.name || '').toLowerCase() === idVal.toLowerCase())
        );

        if (!matchedUser) {
          const id = emailVal || nameVal || idVal || `Row ${r + 1}`;
          if (!result.unmatchedStaff.includes(id)) {
            result.unmatchedStaff.push(id);
          }
          continue;
        }

        matchedUsersMap.set(matchedUser.id, matchedUser);

        colToTopicMap.forEach((matchedTopic, colIdx) => {
          const cellVal = row[colIdx];
          if (isPositiveIndicator(cellVal)) {
            const recKey = `${matchedUser.id}_${matchedTopic.id}`;
            let dateStr = new Date().toISOString();

            if (typeof cellVal === 'string' && !isNaN(Date.parse(cellVal))) {
              dateStr = new Date(cellVal).toISOString();
            }

            const isWbt = matchedTopic.type === 'WBT' || matchedTopic.type === 'Web-Based Training';

            recordsMap.set(recKey, {
              userId: matchedUser.id,
              userName: matchedUser.name || matchedUser.email,
              userEmail: matchedUser.email,
              uNumber: matchedUser.uNumber,
              topicId: matchedTopic.id,
              topicTitle: matchedTopic.title,
              topicType: matchedTopic.type,
              targetGroup: matchedTopic.targetGroup,
              confirmedAt: dateStr,
              status: isWbt ? 'pending_wbt_verification' : 'confirmed',
              signature: 'Electronically Verified',
              notes: `Imported from Excel/CSV Matrix column: "${headerRow[colIdx]}"`,
            });
          }
        });
      }
    }

    result.records = Array.from(recordsMap.values());
    result.newUsersToSave = Array.from(newUsersMap.values());
    result.newTopicsToSave = Array.from(newTopicsMap.values());
    result.matchedStaffCount = matchedUsersMap.size;
    result.matchedTopicsCount = matchedTopicsMap.size;
  } catch (err: any) {
    result.errors.push(`Failed to parse file: ${err?.message || String(err)}`);
  }

  return result;
}

/**
 * Generates sample CSV string templates for downloadable reference matching requested headers
 */
export function generateSampleParticipationCSV(type: 'matrix' | 'flat', users: User[], topics: Topic[]): string {
  const sampleUsers = users.slice(0, 3);
  const sampleTopics = topics.slice(0, 3);

  if (type === 'matrix') {
    const headers = ['UNUMBER', 'STAFF NAME', 'EMAIL', 'ALS', 'LEAD', ...sampleTopics.map((t) => t.title.toUpperCase())];
    const rows = sampleUsers.map((u, i) => [
      u.uNumber || `U100${i}`,
      u.name || `Staff Member ${i + 1}`,
      u.email || `staff${i + 1}@example.com`,
      u.als || 'ALS 1',
      u.lead || 'Team Alpha',
      i === 0 ? 'CONFIRMED' : 'YES',
      i === 1 ? 'CONFIRMED' : 'NO',
      'YES',
    ]);

    return [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
  } else {
    // Exact requested headers: TOPIC ID | TOPIC TITLE | TOPIC TYPE | TARGET GROUP | UNUMBER | STAFF NAME | EMAIL | ALS | LEAD | STATUS | CONFIRMED AT | SIGNATURE
    const headers = [
      'TOPIC ID',
      'TOPIC TITLE',
      'TOPIC TYPE',
      'TARGET GROUP',
      'UNUMBER',
      'STAFF NAME',
      'EMAIL',
      'ALS',
      'LEAD',
      'STATUS',
      'CONFIRMED AT',
      'SIGNATURE',
    ];

    const rows = sampleUsers.flatMap((u, uIdx) =>
      sampleTopics.map((t, tIdx) => [
        t.id,
        t.title,
        t.type || 'Read & Sign',
        t.targetGroup || 'All Staff',
        u.uNumber || `U100${uIdx}`,
        u.name || `Staff ${uIdx + 1}`,
        u.email || `user${uIdx + 1}@example.com`,
        u.als || 'ALS 1',
        u.lead || 'Team Lead',
        tIdx % 2 === 0 ? 'CONFIRMED' : 'PENDING',
        '2026-10-14 10:00:00',
        'Digitally Signed',
      ])
    );

    return [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
  }
}

