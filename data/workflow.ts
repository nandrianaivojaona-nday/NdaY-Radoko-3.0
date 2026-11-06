import { EvidenceClass } from '../types';

export const WORKFLOW_DISCLAIMER =
  'This is a proposed, adaptable workflow for discussion. It is not an agreed service arrangement, an approved clinical protocol, or authorization to use the application with patients. The first pilot locality has not been selected. Local roles, clinical content, referral routes, and procedures must be confirmed with the Ministry of Health, Health Workers, Community Health Agents, and community members before any field use.';

  export const SERVICE_MAP: { step: string; note?: string; urgent?: boolean }[] = [
    { step: 'Mother–infant household', note: 'A caregiver requests help or an authorized existing service identifies a need.' },
    { step: 'Community Health Agent or other authorized worker', note: 'Role and scope must be confirmed for the selected locality.' },
    { step: 'Urgent concern → existing urgent-care pathway immediately', note: 'Do not wait for AI, connectivity, or equipment.', urgent: true },
    { step: 'Check eligibility for the locally authorized workflow' },
    { step: 'Collect and quality-check approved observations', note: 'The applicable protocol and authorized roles must be confirmed locally.' },
    { step: 'Consider whether logistics or equipment support is needed', note: 'Use an approved option only; service access must not depend on a drone.' },
    { step: 'Record the encounter in Radoko', note: 'The prototype uses synthetic data; real-data use requires a separate authorized system.' },
    { step: 'Health Worker review', note: 'Clinical decisions remain with an authorized Health Worker.' },
    { step: 'Use the locally confirmed referral network', note: 'Current destinations and procedures must be verified for the selected locality.' },
    { step: 'Communicate with the caregiver and record follow-up' },
  ];
  
  export const OPERATING_ARRANGEMENT: {
    decision: string;
    lead: string;
    toAgree: string;
  }[] = [
    {
      decision: 'Select a candidate locality',
      lead: 'Ministry of Health with local Health Workers, Community Health Agents, and communities',
      toAgree: 'Unmet needs, community priorities, service readiness, staffing, connectivity, and referral capacity.',
    },
    {
      decision: 'Confirm authorization',
      lead: 'Ministry of Health and relevant review bodies',
      toAgree: 'Required approvals for service delivery, clinical content, data, research, and equipment.',
    },
    {
      decision: 'Define clinical scope',
      lead: 'Qualified Health Workers with the relevant authorities',
      toAgree: 'Eligible encounters, exclusions, required observations, escalation, and follow-up.',
    },
    {
      decision: 'Confirm Health Worker coverage',
      lead: 'Participating health service',
      toAgree: 'Named responsibilities, availability, supervision, and locally agreed response expectations.',
    },
    {
      decision: 'Define Community Health Agent tasks',
      lead: 'Relevant health authorities and supervisors',
      toAgree: 'Authorized tasks, training, supervision, and limits of responsibility.',
    },
    {
      decision: 'Agree data and privacy safeguards',
      lead: 'Ministry of Health and designated data-governance leads',
      toAgree: 'Consent, access, data responsibilities, retention, security, and incident response.',
    },
    {
      decision: 'Confirm referral and logistics',
      lead: 'Health Workers and the relevant local services',
      toAgree: 'Receiving service, transport, fallback, equipment needs, safety, and cost.',
    },
  ];



export const ENCOUNTER_STEPS: { id: number; title: string; detail: string; bullets?: string[] }[] = [
  {
    id: 1,
    title: 'Identify the household and the reason for contact',
    detail: 'Entry points include an existing community worker’s household visit, a caregiver requesting help, a planned follow-up, or post-discharge contact. Radoko should use the locally applicable pathway rather than introduce a competing outreach schedule.',
    bullets: [
      'Infant and caregiver identity.',
      'Exact date of birth or documented uncertainty.',
      'Household/community and associated facility.',
      'Reason for contact; consent and preferred language.',
      'Existing record reference where available — avoid duplicate registration.',
    ],
  },
  {
    id: 2,
    title: 'Apply the approved initial safety screen',
    detail: 'The trained worker follows the locally approved young-infant procedure. If there is an urgent concern, the worker activates the existing clinical escalation route — remote support may assist communication but must not postpone necessary examination or transport.',
    bullets: ['Young-infant IMCI covers ages 0–59 days and involves more than camera observation. Clinical partners determine which assessments Radoko can support reliably.'],
  },
  {
    id: 3,
    title: 'Decide whether equipment or drone support is needed',
    detail: 'Do not dispatch a drone automatically for every encounter. Ask: can the assessment be completed with existing resources; is additional equipment needed; can a trained person operate it; is the drone useful and feasible; what alternative applies if it cannot fly. Record the logistics mission separately from the clinical encounter. A successful delivery means equipment arrived — not that the infant was assessed or the physician reviewed the case.',
  },
  {
    id: 4,
    title: 'Collect and quality-check observations',
    detail: 'For every supported item, capture source, time, value and units, quality (usable/uncertain/failed/not assessed), collector or device, and an evidence reference where appropriate and consented. Missing information must not become a “normal” finding. If a required observation cannot be obtained, route for reassessment or in-person care.',
  },
  {
    id: 5,
    title: 'Send a reviewable encounter to the physician',
    detail: 'The facility receives structured history and observations, missing-data and quality warnings, supporting material, a clearly labelled AI draft, the protocol version, and the urgency/collection time. Use explicit delivery states — “Saved locally” must not appear as “received by the physician”.',
    bullets: ['Saved locally → Awaiting transmission → Received by facility → Assigned to physician → Under review'],
  },
  {
    id: 6,
    title: 'Physician reviews and records a decision',
    detail: 'The physician can request more information, request in-person examination, record home follow-up, initiate referral, and reject or amend the AI summary. The signed record identifies the physician, facility, decision time, evidence reviewed, disposition, and follow-up instructions. The AI output is never automatically valid.',
  },
  {
    id: 7,
    title: 'Communicate with the mother or caregiver',
    detail: 'Explain what the physician concluded, what remains uncertain, what happens next, when and how follow-up will occur, and how to seek help if the situation changes. Check understanding in the caregiver’s preferred language. A displayed report is not evidence that instructions were received or understood. If the mother reports her own health concern, route it through an agreed maternal-care pathway.',
  },
  {
    id: 8,
    title: 'Complete follow-up or referral',
    detail: 'For home follow-up: assign a responsible person, set timing, record whether contact occurred, escalate missed or concerning follow-up. For referral: identify the receiving service, record clinical handover, activate the current transport/referral procedure, track arrival and barriers, and obtain the outcome or document why it remains unknown.',
  },
];

export const WORKFLOW_DIVISION: {
  actor: string;
  responsibility: string;
  boundary: string;
}[] = [
  {
    actor: 'Mother or caregiver',
    responsibility: 'Share preferences, provide consent where applicable, and participate in care planning.',
    boundary: 'Not expected to substitute for a trained examiner.',
  },
  {
    actor: 'Community Health Agent',
    responsibility: 'Support only tasks authorized and supervised for the selected locality.',
    boundary: 'Does not independently diagnose, prescribe, or approve clinical rules.',
  },
  {
    actor: 'Health Worker',
    responsibility: 'Review clinical information, make decisions within professional scope, and arrange referral or follow-up.',
    boundary: 'Does not treat AI output as automatically valid.',
  },
  {
    actor: 'Ministry of Health',
    responsibility: 'Provide relevant health-system direction and determine applicable authorization requirements.',
    boundary: 'A discussion or prototype does not itself constitute Ministry approval.',
  },
  {
    actor: 'NdaY’Radoko product team',
    responsibility: 'Develop and maintain the software, documentation, and technical safeguards.',
    boundary: 'Does not independently authorize clinical use.',
  },
];

export const CODE_MAPPING: { element: string; evolution: string; status: EvidenceClass }[] = [
  { element: 'Patient registration', evolution: 'Link to existing records (externalRecordRef), caregiver consent, facility, encounter history.', status: 'working' },
  { element: 'Drone assignment', evolution: 'Separate clinical eligibility from equipment/logistics dispatch (logistics mission).', status: 'working' },
  { element: 'Report generation', evolution: 'Produce an AI draft — not a final diagnosis (aiDraft).', status: 'working' },
  { element: 'Diagnosed state', evolution: 'Replaced by physician-review and signed-decision states (EncounterStatus).', status: 'working' },
  { element: 'Diagnostic report', evolution: 'AI draft, physician decision, and amendments preserved separately.', status: 'working' },
  { element: 'Transmission', evolution: 'Explicit delivery states: saved locally → under review.', status: 'working' },
  { element: 'AI summary', evolution: 'Physician can accept, reject, or amend the summary (draftReview).', status: 'working' },
  { element: 'Role selector', evolution: 'Replace self-assigned roles with authenticated, facility-scoped permissions.', status: 'simulated' },
  { element: 'Random accuracy / self-diagnostics', evolution: 'Removed from real-use mode; display only measured results.', status: 'working' },
  { element: 'Browser localStorage', evolution: 'Replace with an authorised shared data service and a deliberately designed offline layer.', status: 'planned' },
];

export const WORKSHOP_QUESTIONS = [
  'Which locality and care access needs should be considered first?',
  'Which current services and referral routes must the workflow fit?',
  'Which tasks may Health Workers and Community Health Agents perform?',
  'What do mothers, caregivers, and community members say they need?',
  'What clinical, data, ethics, and service approvals are required?',
  'What evidence is needed before progressing from simulation to field feasibility work?',
];

export const WORKSHOP_OUTPUT =
  'A documented locality-selection discussion, proposed workflow, authorization pathway, community-engagement plan, data-safety requirements, and feasibility-evaluation questions. These outputs do not themselves authorize a pilot.';
export const CLOSING_PROPOSITION =
  'NdaY’ is not proposing an isolated AI drone. It is proposing a carefully bounded extension of an existing public care network, with local clinical accountability and measurable benefits for mothers and young infants.';
