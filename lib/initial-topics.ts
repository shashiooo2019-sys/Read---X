import { Topic, TopicConfirmation } from './types';
import { INITIAL_STAFF_ROSTER } from './roster-data';

export const INITIAL_TOPICS: Topic[] = [
  {
    id: 'top-101',
    title: 'GPD/GPI 2026-08: Ramp Safety & Turnaround Standard Operating Procedures',
    type: 'GPD/GPI Read and Sign',
    targetGroup: 'ALL',
    content: `All station personnel operating airside or engaged in aircraft turnaround operations must comply with GPD/GPI 2026-08. Key operational directives include:
1. Strict adherence to personal protective equipment (PPE) requirements: High-visibility vest (EN ISO 20471 Class 2), steel-toe safety footwear, ear defenders in the engine safety zone.
2. Aircraft Marshalling and Chock placement within 60 seconds of complete aircraft standstill and beacon lights turned off.
3. GSE (Ground Support Equipment) staging: No vehicle or tow tractor may approach within 5 meters of the aircraft envelope until anti-collision beacons are switched off.
4. Foreign Object Debris (FOD) continuous vigilance: All agents must perform FOD check along the turnaround path prior to arrival and post departure.
Failure to acknowledge and adhere to this procedure will result in operational suspension pending safety audit review.`,
    attachmentUrl: 'https://operations.dlh.de/gpd/2026-08-ramp-safety.pdf',
    attachmentName: 'GPD-GPI-2026-08-RampSafety.pdf',
    effectiveDate: '2026-10-01',
    dueDate: '2026-10-15',
    createdAt: '2026-10-01T08:30:00Z',
    createdBy: 'shashi.srivastava@dlh.de',
    version: 'v2.4'
  },
  {
    id: 'top-102',
    title: 'AHD 2026-14: Winter Operations De-Icing & Cold Weather Aircraft Protocol',
    type: 'AHD/AHI Read and Sign',
    targetGroup: 'ALS',
    content: `This Airport Handling Directive (AHD 2026-14) is mandatory for all ALS (Aircraft Liaison & Station) qualified personnel.
Operating guidelines for sub-zero ground temperatures:
- One-step and two-step de-icing / anti-icing holdover times (HOT) calculation tables.
- Mandatory post de-icing physical tactile inspection on wing leading edges and control surfaces.
- Radio communication protocol with flight deck regarding Type IV fluid application, mixture ratio, and start/finish timestamps.
- Continuous reporting of ramp surface friction coefficient to station dispatch.
Ensure you have reviewed the fluid application charts attached before signing acknowledgment.`,
    attachmentUrl: 'https://operations.dlh.de/ahd/2026-14-winter-ops.pdf',
    attachmentName: 'AHD-2026-14-WinterDeIcing.pdf',
    effectiveDate: '2026-10-03',
    dueDate: '2026-10-20',
    createdAt: '2026-10-03T11:00:00Z',
    createdBy: 'sweta.khaneja@dlh.de',
    version: 'v3.1'
  },
  {
    id: 'top-103',
    title: 'Lead Station Directive: Irregular Operations & Escalation Matrix Q4',
    type: 'Document Read and Sign',
    targetGroup: 'Lead',
    content: `Attention all Duty Leads, Supervisors, and Station Leads:
In response to scheduled slot adjustments and runway maintenance at Delhi (DEL) / hub gateways, the revised Escalation Protocol is now active:
1. Delays exceeding 45 minutes must be logged in the Station Log and escalated to OCC within 10 minutes of confirmation.
2. Gate re-assignments and passenger misconnection rerouting protocols across Star Alliance partners (Lufthansa, Swiss, Austrian).
3. Vouchers and hotel accommodation authorization thresholds: Lead approval required up to €250; Station Director approval for exceptional charters.
4. Handover briefing standard: Outgoing lead must conduct verbal and digital debrief with the incoming shift lead.`,
    attachmentUrl: 'https://operations.dlh.de/lead/escalation-matrix-q4.pdf',
    attachmentName: 'Lead-Escalation-Matrix-Q4.pdf',
    effectiveDate: '2026-09-28',
    dueDate: '2026-10-12',
    createdAt: '2026-09-28T09:15:00Z',
    createdBy: 'sanjay.jan@dlh.de',
    version: 'v1.8'
  },
  {
    id: 'top-104',
    title: 'Dangerous Goods (DGR) Lithium Battery Transport Refresher 2026',
    type: 'Training',
    targetGroup: 'ALL',
    content: `All personnel involved in check-in, baggage acceptance, ramp loading, and cargo screening must complete and acknowledge this annual recurrent training module.
Topics covered:
- Section II lithium ion (UN3481) and lithium metal (UN3091) packed with/in equipment limits.
- Mandatory questioning at passenger check-in for damaged, recalled, or power bank carriage in checked luggage.
- Spill/thermal runaway containment response kit deployment airside.
- Notification to Captain (NOTOC) verification steps before cargo door closure.`,
    attachmentUrl: 'https://training.lhgroup.de/dgr-2026-batteries',
    attachmentName: 'DGR-Lithium-Battery-Guideline-2026.pdf',
    effectiveDate: '2026-09-15',
    dueDate: '2026-10-05',
    createdAt: '2026-09-15T14:00:00Z',
    createdBy: 'rajan.nangia@dlh.de',
    version: 'v4.0'
  },
  {
    id: 'top-105',
    title: 'Daily Operational Briefing: Peak Hour Turnaround Coordination',
    type: 'Briefing',
    targetGroup: 'ALS',
    content: `Briefing summary for ALS Specialists and Coordinators:
Expected high movement density between 18:00 and 23:30 IST.
- Concurrent departures LH761 and LX147.
- Fueling safety corridor must remain clear of all non-essential equipment.
- Ground power unit (GPU) and Pre-Conditioned Air (PCA) connections to be prioritized over APU burn to meet airport emission targets.
- Confirm understanding of the coordinated gate push-back sequence.`,
    attachmentUrl: 'https://briefings.dlh.de/del-station-peak-briefing',
    attachmentName: 'Peak-Turnaround-Briefing-Notes.pdf',
    effectiveDate: '2026-10-05',
    dueDate: '2026-10-08',
    createdAt: '2026-10-05T07:45:00Z',
    createdBy: 'shashi.srivastava@dlh.de',
    version: 'v1.0'
  },
  {
    id: 'top-106',
    title: 'De-escalation & Disruptive Passenger Handling Simulation Exercise',
    type: 'Role Play',
    targetGroup: 'Lead',
    content: `Practical role-play confirmation for Station and Team Leads:
Participants must review and acknowledge scenario outcomes covering:
1. Scenario A: Inebriated passenger refusing boarding gate security instructions.
2. Scenario B: Denied boarding compensation handling and EU261 passenger rights notification under extreme disruption.
3. Scenario C: Interfacing with Airport Security Police (CISF) and filing station incident reporting within 2 hours.
All Leads must confirm active participation in the station role-play drills.`,
    attachmentUrl: 'https://drills.dlh.de/role-play-scenarios-2026',
    attachmentName: 'Disruptive-Passenger-Roleplay-Rubric.pdf',
    effectiveDate: '2026-09-22',
    dueDate: '2026-10-02',
    createdAt: '2026-09-22T10:00:00Z',
    createdBy: 'sanjay.jan@dlh.de',
    version: 'v1.2'
  },
  {
    id: 'top-107',
    title: 'BCAS Airside Security Audit & Zone Access Compliance Notice',
    type: 'Others',
    customTypeDesc: 'Station Security Compliance Directive',
    targetGroup: 'ALL',
    content: `Bureau of Civil Aviation Security (BCAS) and Station Security Notice:
- Airside Entry Permits (AEP) must be visibly displayed at all times between neck and waist.
- Tailgating through airside security doors (Zone 1 to Zone 4) is strictly forbidden; each staff member must scan individually.
- Tool control and accountability: Any equipment taken into the security hold area must be declared at the security checkpoint and accounted for before shift end.
- Report any unattended baggage or unauthorized person immediately to the Security Duty Officer.`,
    attachmentUrl: 'https://security.dlh.de/bcas-audit-2026.pdf',
    attachmentName: 'Airside-Security-Audit-Directive.pdf',
    effectiveDate: '2026-10-02',
    publishedDate: '2026-10-02',
    dueDate: '2026-10-18',
    createdAt: '2026-10-02T16:20:00Z',
    createdBy: 'sweta.khaneja@dlh.de',
    version: 'v2.0'
  },
  {
    id: 'top-108',
    title: 'Winter Schedule 2026/27 Airside Ramp Operations & Gate Allocation Directive',
    type: 'Document Read and Sign',
    targetGroup: 'ALS_AND_LEAD',
    content: `Advance notification for upcoming Winter flight schedule rollout:
1. Effective with winter timetable transition, enhanced towing and gate turnaround buffers will be enforced across LH/LX/OS flights.
2. ALS Specialists and Station Leads must review updated gate parking plan and auxiliary power unit (APU) limits.
3. This directive is scheduled for official publication on October 25, 2026. Staff acknowledgment will open on the published date.`,
    attachmentUrl: 'https://operations.dlh.de/winter-2026-schedule.pdf',
    attachmentName: 'Winter-Schedule-2026-Gate-Plan.pdf',
    publishedDate: '2026-10-25',
    effectiveDate: '2026-10-25',
    dueDate: '2026-11-09',
    createdAt: '2026-10-06T12:00:00Z',
    createdBy: 'shashi.srivastava@dlh.de',
    version: 'v1.0'
  }
];

// Helper to generate seed confirmations
export function generateInitialConfirmations(): TopicConfirmation[] {
  const confirmations: TopicConfirmation[] = [];
  let confId = 1;

  const topicMap = new Map(INITIAL_TOPICS.map(t => [t.id, t]));

  const addConf = (topicId: string, user: typeof INITIAL_STAFF_ROSTER[0], dateStr: string, ip: string) => {
    const topic = topicMap.get(topicId);
    confirmations.push({
      id: `conf-${confId++}`,
      topicId,
      documentId: topicId,
      documentTitle: topic ? topic.title : topicId,
      documentVersion: topic?.version || 'v1.0',
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      confirmedAt: dateStr,
      status: 'confirmed',
      signatureText: user.name,
      ipAddress: ip,
    });
  };

  // top-104 is ALL target: many have confirmed
  const top104Eligible = INITIAL_STAFF_ROSTER;
  top104Eligible.slice(0, 85).forEach((user, idx) => {
    const day = 16 + (idx % 12);
    const dateStr = `2026-09-${day.toString().padStart(2, '0')}T10:30:00Z`;
    addConf('top-104', user, dateStr, `10.240.12.${(idx % 240) + 10}`);
  });

  // top-101 is ALL target (effective Oct 1): 45 staff have confirmed so far
  INITIAL_STAFF_ROSTER.slice(5, 52).forEach((user, idx) => {
    const day = (idx % 6) + 1;
    const dateStr = `2026-10-0${day}T14:15:00Z`;
    addConf('top-101', user, dateStr, `10.240.12.${(idx % 240) + 10}`);
  });

  // top-102 is ALS target:
  const alsStaff = INITIAL_STAFF_ROSTER.filter(u => u.isAls);
  alsStaff.slice(0, Math.floor(alsStaff.length * 0.65)).forEach((user, idx) => {
    addConf('top-102', user, `2026-10-04T09:20:00Z`, `10.240.12.${(idx % 240) + 10}`);
  });

  // top-103 is Lead target:
  const leadStaff = INITIAL_STAFF_ROSTER.filter(u => u.isLead);
  leadStaff.slice(0, Math.floor(leadStaff.length * 0.7)).forEach((user, idx) => {
    addConf('top-103', user, `2026-09-30T16:45:00Z`, `10.240.12.${(idx % 240) + 10}`);
  });

  // top-106 is Lead target:
  leadStaff.slice(0, Math.floor(leadStaff.length * 0.85)).forEach((user, idx) => {
    addConf('top-106', user, `2026-09-25T11:10:00Z`, `10.240.12.${(idx % 240) + 10}`);
  });

  // top-107 is ALL target:
  INITIAL_STAFF_ROSTER.slice(0, 30).forEach((user, idx) => {
    addConf('top-107', user, `2026-10-03T18:00:00Z`, `10.240.12.${(idx % 240) + 10}`);
  });

  return confirmations;
}
