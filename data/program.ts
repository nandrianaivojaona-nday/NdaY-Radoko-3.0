import { BudgetLine, EvidenceItem, OutcomeMeasure, ProgramPhase } from '../types';

export const POSITIONING_STATEMENT =
  "NdaY'Radoko is developing a locally designed, AI-assisted and drone-enabled outreach service that connects remote mother–infant households with physicians at health facilities. It supports structured collection and review of young-infant assessment information, aiming to reduce avoidable travel while improving timely access to appropriate care and referral.";

export const CORE_MESSAGE =
  "NdaY'Radoko addresses the distance between remote households and qualified young-infant care. Our proposed service combines structured assessment support, AI-assisted documentation, and a defined drone-enabled outreach pathway, with clinical decisions retained by physicians at participating health facilities. We seek funding to strengthen the functional prototype, co-design the service with mothers and local practitioners, validate technical and clinical feasibility, and evaluate access, safety, caregiver burden, and cost. The project will release reusable open-source components while protecting personal health information.";

export const INTENDED_USE = {
  population:
  'Young infants aged 0–59 days in eligible communities across Madagascar. The first feasibility-pilot locality has not been selected and would require local agreement and authorization.',
  service: 'A physician-supervised outreach encounter: a trained field assistant helps a caregiver collect a defined set of young-infant observations; an AI system prepares a documentation draft; a physician at a participating facility reviews the evidence and signs a disposition.',
  supportedTasks: [
    'Structured caregiver history for core young-infant danger signs.',
    'Device-assisted temperature and respiratory-rate measurement by a trained assistant.',
    'Consent-based remote visual observations where image quality is adequate.',
    'Physician review, signed disposition, caregiver instructions, and safety netting.',
    'Follow-up scheduling and referral outcome recording.',
  ],
  excluded: [
    'No autonomous diagnosis, prescribing, or treatment recommendation by the AI.',
    'No replacement of in-person examination when the approved protocol requires it.',
    'No assessment of infants older than 59 days in the first pilot.',
    'No emergency response capability: urgent care is arranged through existing referral routes.',
    'No unverified claim of measured diagnostic accuracy.',
  ],
  operator: 'A trained community assessment assistant or field officer, working with the caregiver, operates the equipment. The caregiver remains beside the infant at all times.',
  physicianProcess:
    'A physician at a participating facility reviews the recorded evidence and AI draft, may request more information, and signs a disposition: home follow-up, in-person assessment, or urgent referral.',
  escalationRules: [
    'Any reported danger sign triggers an immediate urgent-care pathway that does not wait for the AI or a flight.',
    'Unusable remote observations are recorded as unusable, never as normal.',
    'Required observations that are missing must be acknowledged with a reason before a physician signs.',
    'Equipment or connectivity failure falls back to community teleconsultation or in-person care.',
  ],
};

export const CARE_PATHWAY = [
  {
    id: 'request',
    title: 'Household request',
    detail: 'A caregiver or community focal point contacts the service. Consent and privacy choices are recorded before any assessment.',
    owner: 'Caregiver + field team',
  },
  {
    id: 'collect',
    title: 'Structured evidence collection',
    detail: 'A trained assistant helps record caregiver history, device measurements, and consent-based visual observations. Every item carries a source, time, unit, and quality flag.',
    owner: 'Trained field assistant',
  },
  {
    id: 'draft',
    title: 'AI documentation draft',
    detail: 'The system prepares a clearly labelled draft. It summarises evidence, flags missing information, and cannot diagnose or sign.',
    owner: 'AI system',
  },
  {
    id: 'review',
    title: 'Physician review',
    detail: 'A physician at a participating facility reviews the evidence and draft, requests more information if needed, and signs the clinical decision.',
    owner: 'Physician',
  },
  {
    id: 'decision',
    title: 'Disposition',
    detail: 'Home follow-up, in-person assessment, or urgent referral — each with caregiver instructions and safety-netting advice.',
    owner: 'Physician',
  },
  {
    id: 'outcome',
    title: 'Follow-up and outcome',
    detail: 'Follow-up completion or referral outcome is recorded so the service can learn whether the pathway worked.',
    owner: 'Field team + facility',
  },
];

export const URGENT_BYPASS =
  'If a danger sign is reported, the field team arranges same-day in-person care immediately. The AI draft and the drone are optional and must never delay escalation.';

export const EVIDENCE_REGISTER: EvidenceItem[] = [
  {
    id: 'EV-01',
    area: 'Clinical workflow',
    claim: 'Encounters are separate from patients and have an explicit review-and-signature state machine.',
    detail:
      'The prototype records assessment initiation, evidence collection, AI draft, physician review, signed disposition, follow-up, referral, and closure. Only a signed physician decision can close the clinical pathway.',
    status: 'working',
    source: 'services/clinicalWorkflow.ts, components/EncounterDetail.tsx',
  },
  {
    id: 'EV-02',
    area: 'Clinical workflow',
    claim: 'AI output cannot become a diagnosis by generation alone.',
    detail:
      'The draft is stored separately from the signed decision. A physician account, facility, timestamp, evidence fingerprint, and amendment history are recorded.',
    status: 'working',
    source: 'types.ts, services/clinicalWorkflow.ts',
  },
  {
    id: 'EV-03',
    area: 'Safety',
    claim: '“Not assessed” is distinct from “normal”, and unusable evidence is labelled.',
    detail:
      'Each observation carries a quality flag. Missing required observations block signature unless the physician explicitly acknowledges incomplete evidence and records a reason.',
    status: 'working',
    source: 'data/observations.ts, services/clinicalWorkflow.ts',
  },
  {
    id: 'EV-04',
    area: 'Safety',
    claim: 'Urgent referral bypasses the AI and the drone.',
    detail:
      'A field officer can trigger the urgent-care pathway immediately; it records a same-day referral without waiting for a draft, model response, or flight.',
    status: 'working',
    source: 'services/clinicalWorkflow.ts, components/EncounterDetail.tsx',
  },
  {
    id: 'EV-05',
    area: 'Access',
    claim: 'The clinical pathway does not depend on a flight.',
    detail:
      'Each encounter selects one of three equipment modes: drone-assisted outreach, community teleconsultation, or facility visit. The non-drone path is fully usable in the prototype.',
    status: 'working',
    source: 'types.ts, components/NewEncounterModal.tsx',
  },
  {
    id: 'EV-06',
    area: 'Identity',
    claim: 'Roles are bound to demo accounts and facilities, not selected freely in the interface.',
    detail:
      'Physician signing requires a physician account assigned to the encounter’s facility. The demo sign-in is explicitly labelled as not production authentication.',
    status: 'working',
    source: 'components/SignInPage.tsx, services/clinicalWorkflow.ts',
  },
  {
    id: 'EV-07',
    area: 'AI',
    claim: 'A working AI documentation draft exists when a model key is configured; otherwise a labelled local template is used.',
    detail:
      'The live path calls a configured Gemini model. Without a key, the deterministic local template is clearly marked simulated. Neither path diagnoses.',
    status: 'working',
    source: 'services/aiDraft.ts',
  },
  {
    id: 'EV-08',
    area: 'AI',
    claim: 'Diagnostic accuracy and clinical validation are not claimed.',
    detail:
      'No accuracy figure is displayed as a product outcome. The prototype has no measured accuracy, sensitivity, or specificity. A clinical evaluation is planned.',
    status: 'working',
    source: 'components/EquipmentCard.tsx, pages/ProgramPage.tsx',
  },
  {
    id: 'EV-09',
    area: 'Equipment',
    claim: 'Drone readiness records are traceable and labelled.',
    detail:
      'Readiness checks record status, evidence, date, and evidence class. Bench checks are labelled simulated; flight endurance, link budget, and flight logs are explicitly not tested.',
    status: 'simulated',
    source: 'data/seed.ts, pages/EquipmentPage.tsx',
  },
  {
    id: 'EV-10',
    area: 'Equipment',
    claim: 'Actual flight integration and airworthiness evidence.',
    detail:
      'Not implemented. No aircraft is operated by this repository, no flight log exists, and no civil-aviation approval has been obtained.',
    status: 'planned',
    source: 'docs/OPEN_SOURCE_PLAN.md, docs/SAFETY_AND_PRIVACY.md',
  },
  {
    id: 'EV-11',
    area: 'Data',
    claim: 'Shared, authorised health-data storage with offline synchronisation.',
    detail:
      'Not implemented. The current build uses a browser-local demonstration store. It is unsuitable for real patient data and must be replaced before any pilot.',
    status: 'planned',
    source: 'services/dataStore.ts, docs/SAFETY_AND_PRIVACY.md',
  },
  {
    id: 'EV-12',
    area: 'Protocols',
    claim: 'Protocol provenance, clinical approval, versioning, and review dates are recorded.',
    detail:
      'Each protocol record carries a source, version, approval status, approver, and review date. The seeded Madagascar protocol is deliberately “Draft — not reviewed”.',
    status: 'working',
    source: 'types.ts, pages/GovernancePage.tsx',
  },
  {
    id: 'EV-13',
    area: 'Evaluation',
    claim: 'Feasibility, safety, usability, and cost outcomes have been measured with mothers and clinicians.',
    detail:
      'Not implemented. The 12-month work plan describes the proposed co-design and evaluation; no pilot results exist yet.',
    status: 'planned',
    source: 'docs/FEMTECH_READINESS.md, docs/EVALUATION_PLAN.md',
  },
  {
    id: 'EV-14',
    area: 'Open source',
    claim: 'A reusable repository, licence, documentation, and release milestones exist.',
    detail:
      'The repository contains the prototype, documentation, a licence plan, and sample synthetic data. A public release has not yet been made.',
    status: 'planned',
    source: 'LICENSE, docs/OPEN_SOURCE_PLAN.md',
  },
];

export const WORK_PLAN: ProgramPhase[] = [
  {
    id: 'P1',
    months: 'Months 1–2',
    title: 'Co-design and governance',
    activities: [
      'Co-design workshops with mothers, caregivers, clinicians, and local implementers.',
      'Define the narrow intended use, inclusion/exclusion criteria, and referral routes.',
      'Agree data protection, consent, incident reporting, and clinical oversight.',
      'Produce a risk register and a study protocol for ethics review.',
    ],
    evidenceProduced: 'Validated service workflow, responsibilities, study plan, risk register.',
    status: 'Planned',
  },
  {
    id: 'P2',
    months: 'Months 2–4',
    title: 'Strengthen the physician-supervised software',
    activities: [
      'Replace the local demo store with an authorised shared data service.',
      'Harden authentication, facility access, and physician permissions.',
      'Complete protocol versioning, observation quality, sign-off, and failure recovery.',
      'Write acceptance tests with the clinical partner.',
    ],
    evidenceProduced: 'Testable software release and documented acceptance tests.',
    status: 'In progress',
  },
  {
    id: 'P3',
    months: 'Months 3–5',
    title: 'Equipment and drone pathway',
    activities: [
      'Integrate the actual equipment and flight-operations pathway.',
      'Test camera, link, endurance, and return-to-home behaviour.',
      'Document operating procedures, checklists, and failure modes.',
    ],
    evidenceProduced: 'Technical feasibility results and operating procedures.',
    status: 'Planned',
  },
  {
    id: 'P4',
    months: 'Months 5–6',
    title: 'Controlled simulations and readiness',
    activities: [
      'Run tabletop and field simulations of the full pathway, including failures.',
      'Test the urgent-care bypass and the non-drone fallback.',
      'Complete required approvals before any participant contact.',
    ],
    evidenceProduced: 'Failure-test results and required approvals.',
    status: 'Planned',
  },
  {
    id: 'P5',
    months: 'Months 7–10',
    title: 'Supervised feasibility evaluation',
    activities: [
      'Conduct an appropriately approved evaluation alongside standard care.',
      'Measure access, completeness, referral timeliness, caregiver burden, and cost.',
      'Review every safety event and every decision signed with incomplete evidence.',
    ],
    evidenceProduced: 'Feasibility, safety, usability, and comparative evidence.',
    status: 'Planned',
  },
  {
    id: 'P6',
    months: 'Months 11–12',
    title: 'Analysis and open release',
    activities: [
      'Analyse results and document full cost per completed encounter.',
      'Release reusable software and hardware documentation under an open licence.',
      'Publish an implementation guide and plan the next stage.',
    ],
    evidenceProduced: 'Evaluation report, open-source release, implementation guide.',
    status: 'Planned',
  },
];

export const BUDGET: BudgetLine[] = [
  { workstream: 'Clinical partnership, study design, oversight, and required review', amountUsd: 20000, note: 'Named clinical lead, protocol ratification, ethics and safety review.' },
  { workstream: 'Software, authentication, physician workflow, and data protection', amountUsd: 25000, note: 'Replace local store, access control, audit, offline policy.' },
  { workstream: 'Equipment and drone integration, technical testing', amountUsd: 20000, note: 'Only if a drone is justified by the co-design and comparator analysis.' },
  { workstream: 'Community co-design, training, and field implementation', amountUsd: 15000, note: 'Caregiver compensation, local assistants, travel, training.' },
  { workstream: 'Evaluation and cost analysis', amountUsd: 12000, note: 'Independent analysis support and data management.' },
  { workstream: 'Open-source documentation and reproducibility', amountUsd: 8000, note: 'Release engineering, implementation guide, sample data.' },
];

export const OUTCOME_MEASURES: OutcomeMeasure[] = [
  { dimension: 'Access', measure: 'Time from request to physician review', baseline: 'To be measured', target: 'Agreed with clinical partner', source: 'Encounter timestamps' },
  { dimension: 'Assessment quality', measure: 'Completeness and usability of required observations', baseline: 'To be measured', target: '≥90% of required items with a usable quality flag', source: 'Observation records' },
  { dimension: 'Clinical evaluation', measure: 'Agreement with an appropriate reference assessment, including missed danger signs', baseline: 'Not measured', target: 'Set with clinical partner', source: 'Supervised evaluation' },
  { dimension: 'Referral', measure: 'Time to action and completion of required referral', baseline: 'To be measured', target: 'Same-day action for danger signs', source: 'Referral records' },
  { dimension: 'Women’s experience', measure: 'Acceptability, privacy, burden, confidence in instructions, decision-making participation', baseline: 'To be measured', target: 'Co-designed with mothers', source: 'Caregiver interviews and surveys' },
  { dimension: 'Travel', measure: 'Avoidable journeys and associated time and cost', baseline: 'To be measured', target: 'Reduce avoidable journeys without delaying needed care', source: 'Travel log and cost survey' },
  { dimension: 'Reliability', measure: 'Failed flights, unusable measurements, connectivity loss, interrupted sessions', baseline: 'Not measured', target: 'Documented and bounded', source: 'Failure event log' },
  { dimension: 'Economics', measure: 'Full cost per completed, physician-reviewed encounter compared with alternatives', baseline: 'Not measured', target: 'Reported transparently', source: 'Cost analysis' },
  { dimension: 'Reusability', measure: 'Ability of another qualified team to deploy the documented open-source workflow', baseline: 'Not tested', target: 'At least one independent deployment test', source: 'Release documentation' },
];

export const RISKS = [
  {
    risk: 'Remote observations are insufficiently reliable for safe young-infant assessment.',
    impact: 'High',
    mitigation: 'Clinical partner maps every observation to a collection method; unusable evidence is labelled; in-person review is arranged when evidence is inadequate.',
  },
  {
    risk: 'A danger sign is missed because the family waits for the drone or AI.',
    impact: 'Critical',
    mitigation: 'Urgent-care bypass is prominent and independent of AI and flight; caregiver safety-netting is signed by the physician.',
  },
  {
    risk: 'The drone adds cost or delay without improving access.',
    impact: 'High',
    mitigation: 'Comparator analysis against community teleconsultation and outreach visits; modular design keeps the clinical pathway usable without a flight.',
  },
  {
    risk: 'Personal health information is exposed through local storage or insecure sharing.',
    impact: 'Critical',
    mitigation: 'No real patient data in the prototype; shared authorised data service, access control, encryption, retention and incident process required before pilot.',
  },
  {
    risk: 'The AI draft is mistaken for a clinical decision.',
    impact: 'High',
    mitigation: 'Separate draft and signed decision; physician identity, facility, timestamp, evidence fingerprint, and amendment history are mandatory.',
  },
  {
    risk: 'The study is too small to support claims about mortality or diagnostic safety.',
    impact: 'Medium',
    mitigation: 'Pre-specify feasibility and safety outcomes; do not claim mortality reduction or population-level diagnostic accuracy.',
  },
  {
    risk: 'Community trust is damaged by extractive design or unclear consent.',
    impact: 'High',
    mitigation: 'Co-design with mothers; consent and privacy choices; caregiver compensation; community feedback loop.',
  },
];

export const OPEN_SOURCE_COMPONENTS = [
  { component: 'Clinical workflow and state machine', licence: 'Apache-2.0', note: 'Source available; synthetic sample data only.' },
  { component: 'Observation catalogue and quality model', licence: 'Apache-2.0', note: 'Proposed mapping, not a clinical protocol; clinical ratification required.' },
  { component: 'Web application and UI', licence: 'Apache-2.0', note: "No NdaY' trademarks or brand assets included in the licence." },
  { component: 'Documentation and implementation guide', licence: 'CC BY 4.0', note: 'Reusable with attribution.' },
  { component: 'Hardware design and flight procedures', licence: 'To be decided with legal and aviation advisers', note: 'Will be released only after safety and regulatory review.' },
  { component: 'Patient data, images, and household locations', licence: 'Never public', note: 'Excluded from every release; no real patient data is stored in this repository.' },
];

export const APPLICATION_CHECKLIST = [
  { item: 'Eligibility evidence: legal entity, country registration, ownership and team information', status: 'Needs legal confirmation' },
  { item: 'Reproducible demonstration with simulated parts labelled', status: 'This repository' },
  { item: 'Clinical partnership with written responsibilities and named expertise', status: 'To be confirmed' },
  { item: 'Household operation diagram: equipment, assistant, data flow, physician, referral', status: 'docs/OPERATIONS.md' },
  { item: 'Women-centred problem statement grounded in consultations or stated evidence gaps', status: 'Co-design planned' },
  { item: 'Honest results record: what has been tested, with whom, and what was learned', status: 'docs/FEMTECH_READINESS.md' },
  { item: 'Feasible work plan and budget', status: 'Program page + docs' },
  { item: 'Risk and privacy plan', status: 'docs/SAFETY_AND_PRIVACY.md' },
  { item: 'Repository and release plan', status: 'docs/OPEN_SOURCE_PLAN.md' },
];

export const CALL_FACTS = [
  'UNICEF Femtech Ventures: up to US$100,000 and 12 months of mentorship.',
  'Applications due 4 November 2026 (as stated in the call summary used for this prototype).',
  'The first pillar includes antenatal and postnatal support, newborn and child health, and primary/community care.',
  'The call seeks registered companies in UNICEF programme countries, functional prototypes, and a commitment to open-source licensing.',
  'This prototype does not assert eligibility; legal and programme eligibility must be verified with UNICEF.',
];

// ---------------------------------------------------------------------------
// Partnership strategy — Demo Community–Demo District–Demo Region living lab
// ---------------------------------------------------------------------------

export const LIVING_LAB_STATEMENT =
  'NdaY’Radoko is being designed for adaptation to eligible localities across Madagascar. No first pilot locality, facility, or community has been selected or authorized. The initial feasibility site would be chosen through consultation with the Ministry of Health, Health Workers, Community Health Agents, and community members.';

export interface ProspectivePartner {
  priority: 'Governance' | 'Clinical and service delivery' | 'Community participation' | 'Technical delivery';
  name: string;
  fit: string;
  role: string;
}

export const PARTNERS: ProspectivePartner[] = [
  {
    priority: 'Governance',
    name: 'Ministry of Health',
    fit: 'Provides national health-system direction and the relevant authorization pathway.',
    role: 'Guide alignment with national priorities and determine the approvals required before any pilot.',
  },
  {
    priority: 'Clinical and service delivery',
    name: 'Health Workers',
    fit: 'Bring clinical and service-delivery knowledge from the locality selected for assessment.',
    role: 'Review the workflow, clinical scope, supervision, referral arrangements, and service readiness.',
  },
  {
    priority: 'Community participation',
    name: 'Community Health Agents',
    fit: 'Understand community health activities and local access barriers.',
    role: 'Advise on authorized community-level tasks, training, supervision, and follow-up.',
  },
  {
    priority: 'Community participation',
    name: 'Mothers, caregivers, and community members',
    fit: 'Bring the experiences and preferences of people the service is intended to support.',
    role: 'Participate in co-design and review accessibility, acceptability, privacy, and caregiver burden.',
  },
  {
    priority: 'Technical delivery',
    name: 'NdaY’Radoko product team',
    fit: 'Develops and maintains the software prototype.',
    role: 'Deliver the product, documentation, technical safeguards, and agreed evaluation support.',
  },
];

export const PARTNERSHIP_QUESTIONS = [
  'Which maternal and young-infant care access needs should be assessed in the locality?',
  'Which existing services and referral pathways must the workflow fit?',
  'Which tasks are within each authorized Health Worker and Community Health Agent role?',
  'What do mothers, caregivers, and community members need from the service?',
  'What approvals, staffing, connectivity, and safeguards would be required?',
  'Which product functions can be evaluated safely before any field use?',
];

export const PARTNER_DIVISION = [
  {
    partner: 'Ministry of Health',
    contribution: 'National direction and guidance on the applicable authorization pathway.',
  },
  {
    partner: 'Health Workers',
    contribution: 'Clinical workflow review, service readiness, supervision, and referral arrangements.',
  },
  {
    partner: 'Community Health Agents',
    contribution: 'Review of authorized community-level tasks, training, supervision, and follow-up.',
  },
  {
    partner: 'Mothers, caregivers, and community members',
    contribution: 'Co-design input and feedback on accessibility, acceptability, and privacy.',
  },
  {
    partner: 'NdaY’Radoko product team',
    contribution: 'Software development, technical documentation, and product support.',
  },
];

export const INITIAL_CONFIGURATION = [
  'Select one candidate locality through consultation; no locality is currently selected.',
  'Confirm the relevant Ministry of Health and local authorization pathway.',
  'Identify participating Health Workers and Community Health Agents only after their roles are agreed.',
  'Confirm a facility, referral destination, supervision, and fallback arrangements.',
  'Agree the clinical content and data-governance requirements before any field use.',
  'Begin with synthetic-data and usability work while approvals remain pending.',
];

export interface CommitmentDocument {
  document: string;
  minimum: string;
}

export const COMMITMENT_PACKAGE: CommitmentDocument[] = [
  {
    document: 'Ministry and public-service engagement record',
    minimum: 'Documented discussions, the proposed authorization pathway, and any conditions stated by the relevant authorities.',
  },
  {
    document: 'Locality-selection record',
    minimum: 'Selection criteria, community input, service-readiness findings, and the status of any site permissions.',
  },
  {
    document: 'Clinical workflow review',
    minimum: 'Review by qualified Health Workers of the intended workflow, clinical scope, escalation, and referral steps.',
  },
  {
    document: 'Community-engagement plan',
    minimum: 'How mothers, caregivers, Community Health Agents, and community members can participate safely and provide feedback.',
  },
  {
    document: 'Data-governance and safety plan',
    minimum: 'Data responsibilities, consent, privacy, access, retention, incident handling, and required approvals.',
  },
  {
    document: 'Evaluation plan',
    minimum: 'Feasibility questions, measures, methods, oversight, and progression or stop criteria.',
  },
  {
    document: 'Open-source release plan',
    minimum: 'Repository, licence, documentation, release milestones, and exclusion of personal health data.',
  },
];

export const REVISED_PARTNERSHIP_TEXT = `NdaY’Radoko is being designed for adaptation to eligible localities across Madagascar. No first pilot locality, facility, community, or implementation role has been confirmed. The initial feasibility locality would be identified through consultation with the Ministry of Health, Health Workers, Community Health Agents, mothers, caregivers, and community members.

Before any field use, the relevant authorities and review bodies would need to confirm the required approvals, clinical content, service workflow, data responsibilities, referral arrangements, and safety measures. Early funded work would focus on co-design, product improvement, synthetic-data testing, and preparation for an authorized feasibility pilot. Any pilot would remain limited to the approved locality, participants, workflow, and duration.

NdaY’ will remain responsible for product development and technical delivery. No external implementation commitment or site access is assumed.`;
export const DRONE_MODULAR_CLAIM =
  "Radoko's clinical coordination workflow will be evaluated independently of its transport mechanism. Drone-enabled support will be retained only where it demonstrates operational value over feasible alternatives.";
