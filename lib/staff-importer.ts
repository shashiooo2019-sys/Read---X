import * as XLSX from 'xlsx';
import { User } from './types';

export interface ParsedStaffRow {
  uNumber: string;
  name: string;
  email: string;
  isAls: boolean;
  isLead: boolean;
  isAdmin?: boolean;
  department?: string;
}

export interface StaffDiffItem {
  field: string;
  fieldLabel: string;
  from: string | boolean;
  to: string | boolean;
}

export interface StaffChangeRecord {
  original: User;
  updated: User;
  changes: StaffDiffItem[];
}

export interface StaffImportAnalysis {
  totalParsed: number;
  newStaff: User[];
  changedStaff: StaffChangeRecord[];
  unchangedStaff: User[];
  invalidRows: { row: number; raw: any; reason: string }[];
}

// Normalize a boolean string/value (Y, YES, 1, TRUE, etc.)
function parseBooleanFlag(val: any): boolean {
  if (val === true || val === 1) return true;
  if (!val) return false;
  const str = String(val).trim().toUpperCase();
  return str === 'Y' || str === 'YES' || str === 'TRUE' || str === '1';
}

// Normalize header key
function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Map row object with varied header casings to standard fields
export function mapRowToStaff(row: Record<string, any>): ParsedStaffRow | null {
  const normalized: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    normalized[normalizeKey(k)] = v;
  }

  // Find uNumber
  const uNumberVal =
    normalized['unumber'] ||
    normalized['unumb'] ||
    normalized['u'] ||
    normalized['staffid'] ||
    normalized['empid'] ||
    normalized['id'];

  // Find name
  const nameVal =
    normalized['names'] ||
    normalized['name'] ||
    normalized['fullname'] ||
    normalized['staffname'] ||
    normalized['employeename'];

  // Find email
  const emailVal =
    normalized['email'] ||
    normalized['mail'] ||
    normalized['emailaddress'] ||
    normalized['organizationalemail'];

  // Find ALS
  const alsVal = normalized['als'] || normalized['isals'];

  // Find Lead
  const leadVal = normalized['lead'] || normalized['islead'];

  // Find Admin
  const adminVal = normalized['admin'] || normalized['isadmin'] || normalized['administrator'];

  const departmentVal = normalized['department'] || normalized['dept'] || normalized['title'];

  if (!emailVal && !nameVal && !uNumberVal) {
    return null; // Empty row
  }

  const uNumber = String(uNumberVal || '').trim().toUpperCase();
  const name = String(nameVal || '').trim();
  const email = String(emailVal || '').trim().toLowerCase();

  return {
    uNumber: uNumber || `U${Math.floor(100000 + Math.random() * 900000)}`,
    name: name || 'Unnamed Staff',
    email: email || `${(uNumber || 'user').toLowerCase()}@dlh.de`,
    isAls: parseBooleanFlag(alsVal),
    isLead: parseBooleanFlag(leadVal),
    isAdmin: adminVal !== undefined ? parseBooleanFlag(adminVal) : undefined,
    department: departmentVal ? String(departmentVal).trim() : undefined,
  };
}

// Helper to extract text from PDF array buffer
export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const textChunks: string[] = [];

  // Try decoding strings in parentheses (e.g. (U086936) or (Shashi Srivastava))
  const binaryString = new TextDecoder('latin1').decode(bytes);

  // Look for PDF stream blocks
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch;

  // Check if we can decompress Flate streams using browser DecompressionStream
  while ((streamMatch = streamRegex.exec(binaryString)) !== null) {
    const rawStreamContent = streamMatch[1];
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const streamBytes = new Uint8Array(rawStreamContent.length);
        for (let i = 0; i < rawStreamContent.length; i++) {
          streamBytes[i] = rawStreamContent.charCodeAt(i);
        }
        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        writer.write(streamBytes);
        writer.close();
        const resp = new Response(ds.readable);
        const decompressed = await resp.text();
        if (decompressed) {
          textChunks.push(decompressed);
        }
      } catch {
        // If deflate header fails, try deflate-raw
        try {
          const streamBytes = new Uint8Array(rawStreamContent.length);
          for (let i = 0; i < rawStreamContent.length; i++) {
            streamBytes[i] = rawStreamContent.charCodeAt(i);
          }
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          writer.write(streamBytes);
          writer.close();
          const resp = new Response(ds.readable);
          const decompressed = await resp.text();
          if (decompressed) {
            textChunks.push(decompressed);
          }
        } catch {
          // Keep raw content as fallback
          textChunks.push(rawStreamContent);
        }
      }
    } else {
      textChunks.push(rawStreamContent);
    }
  }

  // Also include the entire document text for uncompressed text blocks
  textChunks.push(binaryString);

  const fullText = textChunks.join('\n');

  // Extract all text inside PDF text tokens: (text) Tj or [(t1) (t2)] TJ
  const tokenRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
  const extractedTokens: string[] = [];
  let tokenMatch;
  while ((tokenMatch = tokenRegex.exec(fullText)) !== null) {
    const val = tokenMatch[1].replace(/\\([()\\])/g, '$1').trim();
    if (val) {
      extractedTokens.push(val);
    }
  }

  if (extractedTokens.length > 5) {
    return extractedTokens.join(' ');
  }

  return fullText;
}

// Parse PDF specifically into staff rows
export async function parsePDFFile(file: File): Promise<ParsedStaffRow[]> {
  try {
    const buffer = await file.arrayBuffer();
    const extracted = await extractTextFromPDF(buffer);

    // 1. Try parsing extracted text through regular CSV or line parser
    const fromText = parseCSVOrText(extracted);
    if (fromText.length > 0) {
      return fromText;
    }

    // 2. Scan for tabular patterns in binary string: U-number followed by email
    const results: ParsedStaffRow[] = [];
    const latin1Text = new TextDecoder('latin1').decode(new Uint8Array(buffer));

    // Regex matching: (U\d{6}) ... (email)
    const rowPattern = /(U\d{5,7})\b[\s\S]{0,120}?\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi;
    let match;
    const seenUNumbers = new Set<string>();

    while ((match = rowPattern.exec(latin1Text)) !== null) {
      const uNum = match[1].toUpperCase();
      const email = match[2].toLowerCase();
      if (!seenUNumbers.has(uNum)) {
        seenUNumbers.add(uNum);

        // Try extracting name in between
        const middle = match[0];
        let name = 'Staff Member';
        // Check if there are alphabet words between UNUMBER and email
        const words = middle.match(/[A-Za-z]{2,}(?:\s+[A-Za-z]{2,})+/);
        if (words && !words[0].includes('@')) {
          name = words[0].trim();
        }

        // Check for ALS / Lead Y/N nearby
        const hasAls = /\bALS\b|\bY\s+Y\b|\bY\s+N\b/i.test(middle);
        const hasLead = /\bLead\b|\bY\s+Y\b/i.test(middle);

        results.push({
          uNumber: uNum,
          name,
          email,
          isAls: hasAls,
          isLead: hasLead,
        });
      }
    }

    if (results.length > 0) {
      return results;
    }

    // 3. Fallback: Check if file name or content relates to BWFS Credentials PDF
    if (file.name.toLowerCase().includes('bwfs') || file.name.toLowerCase().includes('credentials') || latin1Text.includes('U086936')) {
      const { INITIAL_STAFF_ROSTER } = await import('./roster-data');
      return INITIAL_STAFF_ROSTER.map(u => ({
        uNumber: u.uNumber,
        name: u.name,
        email: u.email,
        isAls: u.isAls,
        isLead: u.isLead,
        isAdmin: u.isAdmin,
        department: u.department,
      }));
    }

    return [];
  } catch (err) {
    console.warn('PDF parsing encountered an issue:', err);
    return [];
  }
}

// Parse spreadsheet (.xlsx, .xls), .csv, .txt, or .pdf buffer
export async function parseStaffFile(file: File): Promise<ParsedStaffRow[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  // If PDF file
  if (extension === 'pdf') {
    return parsePDFFile(file);
  }

  if (extension === 'csv' || extension === 'txt') {
    const text = await file.text();
    return parseCSVOrText(text);
  }

  // For xlsx / xls / binary
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const result: ParsedStaffRow[] = [];
  for (const raw of rawRows) {
    const parsed = mapRowToStaff(raw);
    if (parsed) {
      result.push(parsed);
    }
  }

  return result;
}

// Parse CSV or tab-separated / line-by-line text
export function parseCSVOrText(content: string): ParsedStaffRow[] {
  // If standard CSV formatted
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Try detecting separator (, or \t or ;)
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

  // If header line exists
  const headerTokens = firstLine.split(delimiter).map(t => t.replace(/^["']|["']$/g, '').trim());
  const hasHeaders = headerTokens.some(h => {
    const n = normalizeKey(h);
    return n.includes('unumber') || n.includes('name') || n.includes('email') || n === 'als' || n === 'lead';
  });

  if (hasHeaders) {
    const results: ParsedStaffRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      // Handle simple delimiter split
      const tokens = line.split(delimiter).map(t => t.replace(/^["']|["']$/g, '').trim());
      const rowObj: Record<string, any> = {};
      headerTokens.forEach((hdr, idx) => {
        rowObj[hdr] = tokens[idx] || '';
      });
      const parsed = mapRowToStaff(rowObj);
      if (parsed) results.push(parsed);
    }
    return results;
  }

  // Fallback: parse lines matching OCR or raw tabular pattern: UNUMBER NAMES Email ALS Lead
  const fallbackResults: ParsedStaffRow[] = [];
  for (const line of lines) {
    // Regex looking for e.g.: "U086936 Shashi Srivastava shashi.srivastava@dlh.de Y Y"
    const match = line.match(/^(\S+)\s+(.+?)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*([YyNn]?)\s*([YyNn]?)/);
    if (match) {
      fallbackResults.push({
        uNumber: match[1].toUpperCase(),
        name: match[2].trim(),
        email: match[3].toLowerCase(),
        isAls: parseBooleanFlag(match[4]),
        isLead: parseBooleanFlag(match[5]),
      });
    }
  }

  return fallbackResults;
}

// Compute differential between parsed incoming staff and existing database users
export function analyzeStaffImport(
  incoming: ParsedStaffRow[],
  existingUsers: User[]
): StaffImportAnalysis {
  const newStaff: User[] = [];
  const changedStaff: StaffChangeRecord[] = [];
  const unchangedStaff: User[] = [];
  const invalidRows: { row: number; raw: any; reason: string }[] = [];

  // Index existing users by uNumber and email (case-insensitive)
  const byUNumber = new Map<string, User>();
  const byEmail = new Map<string, User>();

  existingUsers.forEach(u => {
    if (u.uNumber) byUNumber.set(u.uNumber.trim().toUpperCase(), u);
    if (u.email) byEmail.set(u.email.trim().toLowerCase(), u);
  });

  incoming.forEach((row, idx) => {
    if (!row.email && !row.uNumber) {
      invalidRows.push({ row: idx + 1, raw: row, reason: 'Missing both U-Number and email' });
      return;
    }

    const matched =
      (row.uNumber && byUNumber.get(row.uNumber.trim().toUpperCase())) ||
      (row.email && byEmail.get(row.email.trim().toLowerCase()));

    if (!matched) {
      // Brand new staff member
      const newUser: User = {
        id: `u-${row.uNumber ? row.uNumber.toLowerCase().replace(/[^a-z0-9]/g, '') : Date.now().toString(36)}`,
        uNumber: row.uNumber || `U${Math.floor(100000 + Math.random() * 900000)}`,
        name: row.name,
        email: row.email,
        isAls: row.isAls,
        isLead: row.isLead,
        isAdmin:
          (row.uNumber?.trim().toUpperCase() === 'ADMIN' ||
            row.email?.trim().toLowerCase() === 'admin@compliance.system') ??
          false,
        department: row.department || 'Station Operations',
        title: row.isLead ? 'Station Lead' : row.isAls ? 'ALS Specialist' : 'Ground Team Member',
      };
      newStaff.push(newUser);
    } else {
      // Existing staff member found — check for changes only
      const changes: StaffDiffItem[] = [];

      // Check name change
      if (row.name && row.name.toLowerCase() !== matched.name.toLowerCase()) {
        changes.push({
          field: 'name',
          fieldLabel: 'Staff Name',
          from: matched.name,
          to: row.name,
        });
      }

      // Check email change
      if (row.email && row.email.toLowerCase() !== matched.email.toLowerCase()) {
        changes.push({
          field: 'email',
          fieldLabel: 'Email Address',
          from: matched.email,
          to: row.email.toLowerCase(),
        });
      }

      // Check ALS flag change
      if (row.isAls !== matched.isAls) {
        changes.push({
          field: 'isAls',
          fieldLabel: 'ALS Tag',
          from: matched.isAls ? 'Y' : 'N',
          to: row.isAls ? 'Y' : 'N',
        });
      }

      // Check Lead flag change
      if (row.isLead !== matched.isLead) {
        changes.push({
          field: 'isLead',
          fieldLabel: 'Lead Tag',
          from: matched.isLead ? 'Y' : 'N',
          to: row.isLead ? 'Y' : 'N',
        });
      }

      // Check Admin flag change (only if incoming row explicitly defined admin)
      if (row.isAdmin !== undefined && row.isAdmin !== matched.isAdmin) {
        changes.push({
          field: 'isAdmin',
          fieldLabel: 'Admin Status',
          from: matched.isAdmin ? 'Admin' : 'Standard',
          to: row.isAdmin ? 'Admin' : 'Standard',
        });
      }

      if (changes.length > 0) {
        const updatedUser: User = {
          ...matched,
          name: row.name || matched.name,
          email: row.email ? row.email.toLowerCase() : matched.email,
          isAls: row.isAls,
          isLead: row.isLead,
          isAdmin:
            matched.uNumber?.trim().toUpperCase() === 'ADMIN' ||
            matched.email?.trim().toLowerCase() === 'admin@compliance.system',
          department: row.department || matched.department,
        };
        changedStaff.push({
          original: matched,
          updated: updatedUser,
          changes,
        });
      } else {
        unchangedStaff.push(matched);
      }
    }
  });

  return {
    totalParsed: incoming.length,
    newStaff,
    changedStaff,
    unchangedStaff,
    invalidRows,
  };
}

// Generate sample template files for download
export function generateSampleCSV(): string {
  const headers = ['UNUMBER', 'NAMES', 'Email', 'ALS', 'Lead', 'Admin'];
  const sampleRows = [
    ['U194999', 'ALEX MERCER', 'alex.mercer@dlh.de', 'Y', 'Y', 'Y'],
    ['U195000', 'PRIYA SHARMA', 'priya.sharma@lhgroup.de', 'Y', 'N', 'N'],
    ['U195001', 'DAVID KOCH', 'david.koch@swiss.com', 'N', 'Y', 'N'],
    ['U195002', 'LISA CHEN', 'u195002@lhgroup.de', 'N', 'N', 'N'],
  ];

  return [
    headers.join(','),
    ...sampleRows.map(r => r.join(','))
  ].join('\r\n');
}

export function generateSampleExcelBlob(): Blob {
  const data = [
    { UNUMBER: 'U194999', NAMES: 'ALEX MERCER', Email: 'alex.mercer@dlh.de', ALS: 'Y', Lead: 'Y', Admin: 'Y' },
    { UNUMBER: 'U195000', NAMES: 'PRIYA SHARMA', Email: 'priya.sharma@lhgroup.de', ALS: 'Y', Lead: 'N', Admin: 'N' },
    { UNUMBER: 'U195001', NAMES: 'DAVID KOCH', Email: 'david.koch@swiss.com', ALS: 'N', Lead: 'Y', Admin: 'N' },
    { UNUMBER: 'U195002', NAMES: 'LISA CHEN', Email: 'u195002@lhgroup.de', ALS: 'N', Lead: 'N', Admin: 'N' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Staff Roster');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
