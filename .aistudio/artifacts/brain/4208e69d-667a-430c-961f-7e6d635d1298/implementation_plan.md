# Topic Participation Excel Importer & Firestore Sync

Implement a robust Excel/CSV Topic Participation Importer matching the station participation matrix format, with instant ingestion, data parsing, validation, automated synchronization to Cloud Firestore, and real-time update confirmation.

## User Review & Critical Decisions

> [!IMPORTANT]
> The import file structure strictly matches the provided 12-column matrix:
> `TOPIC ID`, `TOPIC TITLE`, `TOPIC TYPE`, `TARGET GROUP`, `UNUMBER`, `STAFF NAME`, `EMAIL`, `ALS`, `LEAD`, `STATUS`, `CONFIRMED AT`, `SIGNATURE`.

- **Handling Existing Records**: As selected in Option 3, the importer selectively loads/appends new topic participation records, leaving existing confirmed records intact while adding missing topics or newly acknowledged entries.
- **Pre-populated Dataset & Sample Ingestion**: In addition to an Excel/CSV file upload modal in the Admin Console, the provided dataset (covering `top-mv12hw2n`, `top-mv2lddg8`, `top-mv2lhf19`, `top-mv2ljhaq`, `top-mv40649u`, `top-mv4071lu`, and `top-mv40av9z`) will be available as an instant "Load Provided Sheet Data" one-click action.
- **Firestore Persistence Guarantee**: All imported topics (`/topics`), staff assignments (`/topic_assignments`), confirmations (`/compliance_verifications`), and newly discovered staff members (`/users`) are committed directly to Cloud Firestore in batched transactions, followed by the live Firestore update modal and toast confirmation.

---

## 1. Overview & Core Concept

- **What It Does**: Enables station administrators to import large-scale compliance participation records directly from Excel spreadsheets (`.xlsx`, `.xls`) or `.csv` files.
- **Data Normalization**: Automatically extracts topics, normalizes target groups (including fixing typos such as `CUTOM` -> `CUSTOM`), identifies assigned staff by U-Number and email, and marks verified confirmations with timestamps and digital signatures.
- **Target Persona**: Station Quality & Compliance Managers, SuperAdmins, and Duty Managers reviewing multi-topic training sessions, briefings, and GPD/GPI directives.

---

## 2. User Experience & Visual Design

- **Admin Console Action Bar**:
  - Adds a dedicated **"Import Topic Participation"** button alongside existing tools in the Admin Console header.
  - Features an intuitive modal with drag-and-drop file upload, column mapping preview, parsing summary (Total Rows, Topics Detected, Confirmed Signatures, Pending Staff), and an instant "Import Provided Sheet (7 Topics / 160+ Records)" shortcut.
- **Live Preview & Validation**:
  - Displays a high-density, scrollable preview table of parsed rows before committing.
  - Highlights valid signatures in emerald (`CONFIRMED`) and pending staff in amber (`MISSING / PENDING`).
- **Real-Time Cloud Confirmation**:
  - Upon clicking "Commit to Firestore", records are written in chunked batches (400 records per batch) to Firestore.
  - Triggers the prominent `FirestoreSaveModal` with full document count, target collections (`/topics`, `/topic_assignments`, `/compliance_verifications`), and database ID `ai-studio-readsigncomplian-4208e69d-667a-430c-961f-7e6d635d1298`.

---

## 3. Key Product Decisions & Trade-Offs

- **Client-Side Parsing via `xlsx`**:
  - *Chosen Approach*: Use the installed `xlsx` library to parse `.xlsx`/`.csv` client-side directly in the browser before sending batched writes to Firestore.
  - *Why*: Instantaneous validation, zero server payload limitations, and immediate interactive row inspection for the admin.
- **Data Deduplication & Assignment Linkage**:
  - *Chosen Approach*: Derive both `topics`, `topic_assignments` (keyed by `topicId_userId`), and `compliance_verifications` (keyed by `conf-topicId-userId`) to prevent duplicate writes and keep completion rate metrics 100% accurate.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                 Excel / CSV Source File                     │
│  TOPIC ID | TITLE | TYPE | GROUP | UNUMBER | STATUS | etc.  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             lib/topic-participation-importer.ts             │
│  - Reads binary workbook buffer via XLSX.read               │
│  - Normalizes headers (case-insensitive & whitespace-safe)  │
│  - Extracts unique Topics, Staff, Assignments, Confirmations│
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      In-Memory Store         │ │   Cloud Firestore Batches  │
│  - inMemoryTopics            │ │  - /topics                 │
│  - inMemoryUsers             │ │  - /topic_assignments      │
│  - inMemoryConfirmations     │ │  - /compliance_verifications│
└──────────────────────────────┘ └────────────┬───────────────┘
                                              │
                                              ▼
                                 ┌────────────────────────────┐
                                 │ FirestoreSaveModal & Toast │
                                 │ "✓ Firebase Updated Live"  │
                                 └────────────────────────────┘
```

- **Entities Touched**:
  1. `Topic`: Created or updated with `id`, `title`, `type`, `targetGroup`, `content`, `dueDate`, `createdAt`.
  2. `TopicAssignment`: Stored with `id: ${topicId}_${userId}`, `status: 'confirmed' | 'pending'`, `assignedAt`.
  3. `TopicConfirmation`: Stored for confirmed rows with `confirmedAt`, `signatureText`, `status: 'confirmed'`.
  4. `User`: Automatically syncs any new personnel found in the sheet who do not exist in the station roster.
