/**
 * NdaY'Radoko domain model.
 *
 * The application models a physician-supervised outreach service. It is
 * deliberately explicit about what is working, what is simulated for the
 * prototype, and what is still planned. The AI produces a draft; only a
 * signed physician decision can close an encounter.
 *
 * Mother and infant are separate people. They are linked to one care episode
 * through `Encounter.motherId` and `Patient.motherId`. Their observations are
 * recorded separately and never silently merged.
 */

// ---------------------------------------------------------------------------
// Identity and access
// ---------------------------------------------------------------------------

export type Language = 'en' | 'fr' | 'es' | 'de' | 'mg';

/** Roles are assigned to a demo account; they are never selected ad hoc in the UI. */
export type UserRole = 'Physician' | 'Field Officer' | 'Program Admin';

export interface Facility {
  id: string;
  name: string;
  level: 'Community health site' | 'CSB I' | 'CSB II' | 'CHD/CHRD' | 'CHR/CHRR' | 'CHU' | 'Community outreach team';
  commune?: string;
  communeAreaId?: string;
  district: string;
  region?: string;
  faritany?: string;
  referralFacilityId?: string;
  countryId: string;
  contactNote?: string;
}

/** Territorial administration and health referral are related but distinct hierarchies. */
export interface AdministrativeArea {
  id: string;
  name: string;
  level: 'Faritany' | 'Faritra' | 'Distrika' | 'Kaominina' | 'Fokontany' | 'Vohitra/Kartie';
  parentId: string | null;
  sourceStatus: 'Verified reference' | 'Demo placeholder';
  type?: 'URBAN' | 'RURAL';
}

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  facilityId: string | null;
  title: string;
  /** Demo-only credential label. No real authentication is implemented. */
  demoCredential: string;
  professionalRegistration?: string;
  isDemo: boolean;
}

export interface Session {
  user: UserAccount;
  signedInAt: string;
  mode: 'demo-local';
}

// ---------------------------------------------------------------------------
// Evidence classification
// ---------------------------------------------------------------------------

/**
 * Used everywhere a claim is made about the product.
 * - working: exercised in this repository and demonstrable now
 * - simulated: deliberately synthetic demo behaviour, not measured evidence
 * - planned: not implemented; described to support honest review
 */
export type EvidenceClass = 'working' | 'simulated' | 'planned';

export const EVIDENCE_LABELS: Record<EvidenceClass, string> = {
  working: 'Working in prototype',
  simulated: 'Simulated — not measured',
  planned: 'Planned — not implemented',
};

// ---------------------------------------------------------------------------
// Clinical observations
// ---------------------------------------------------------------------------

export type ObservationCategory =
  | 'Danger signs'
  | 'Breathing'
  | 'Temperature'
  | 'Feeding and weight'
  | 'Jaundice'
  | 'Diarrhoea'
  | 'Skin, umbilicus and ear'
  | 'HIV and infant feeding'
  | 'Other';

export type ObservationMethod =
  | 'Caregiver report'
  | 'Device measurement'
  | 'Remote visual observation'
  | 'Trained in-person assessment';

/**
 * How an observation was actually obtained.
 * This is distinct from the quality flag: it identifies *who or what* produced
 * the value, not how reliable it is. The UI shows both.
 */
export type ObservationSource =
  | 'Caregiver report'
  | 'Field officer observation'
  | 'Device measurement'
  | 'Remote observation'
  | 'In-person observation'
  | 'Unavailable';

  export interface ProtocolRuleCitation {
    /** Must match a source ID in the protocol's source register. */
    sourceId: string;
    section: string;
    page: number;
    tableOrStep?: string;
    /** Leave blank until the source is checked against this observation. */
    reviewedBy?: string;
    reviewedAt?: string;
  }

export interface ObservationDefinition {
  id: string;
  label: string;
  category: ObservationCategory;
  method: ObservationMethod;
  /** Whether the observation can credibly be gathered without a clinician at the household. */
  remoteFeasibility: 'Remote' | 'Remote with trained assistant' | 'In person only';
  /** Required for a complete young-infant assessment package. */
  requiredForReview: boolean;
  unit?: string;
  valueType: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
  guidance: string;
  protocolReference: string;
  protocolCitations?: ProtocolRuleCitation[];
}

export interface ProtocolRuleCitation {
  /** ID of a source in the protocol source register. */
  sourceId: string;
  /** Heading as it appears in the source document. */
  section: string;
  /** Printed page number in the reviewed copy. */
  page: number;
  tableOrStep?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

/**
 * A locally reviewed handling of one rule in the international baseline.
 * Pending or undocumented entries must never silently replace the baseline.
 */
export interface ProtocolContextualization {
  id: string;
  baselineRuleId: string;
  handling: 'Confirmed unchanged' | 'Modified locally' | 'Additional local rule' | 'Not adopted locally' | 'Under review';
  localRuleText?: string;
  rationale: string;
  citations: ProtocolRuleCitation[];
  reviewedBy?: string;
  reviewedAt?: string;
  version?: string;
}

/** Chart-derived classification and its linked management actions. */
export interface ProtocolClassificationRule {
  id: string;
  label: string;
  /** Exact chart colour label, e.g. the wording used in the source. */
  chartColourLabel: string;
  /** Approximate UI swatch for the chart colour family; not a sampled source-pixel value. */
  chartColourHex?: string;
  criteriaSummary: string;
  actions: Array<{
    id: string;
    label: string;
    detail: string;
    category: 'Treatment' | 'Referral' | 'Counselling' | 'Follow-up' | 'Other action';
  }>;
  citations: ProtocolRuleCitation[];
}

/**
 * Observation quality flags. `Unavailable` is intentionally distinct from
 * `Not assessed` and `Unusable`: a caregiver may decline, a device may not be
 * present, or an image may be unusable. None of those may be recorded as normal.
 */
export type ObservationQuality =
  | 'Not assessed'
  | 'Unavailable'
  | 'Reported — unverified'
  | 'Measured — device'
  | 'Observed — remote'
  | 'Observed — in person'
  | 'Unusable';

export interface Observation {
  definitionId: string;
  value: string;
  quality: ObservationQuality;
  /** Explicit source. Derived from quality when omitted (see `deriveSource`). */
  source?: ObservationSource;
  recordedAt: string | null;
  recordedBy: string | null;
  notes?: string;
  /** Supporting material reference (image, file, device log) where appropriate and consented. */
  evidenceRef?: string;
  protocolCitations?: ProtocolRuleCitation[];
}

// ---------------------------------------------------------------------------
// People — mother and infant are separate, linked to one care episode
// ---------------------------------------------------------------------------

/** Demo records are synthetic. Pilot records would require a lawful basis and access controls. */
export type DataClassification = 'Demo — synthetic' | 'Pilot — restricted';

/**
 * The mother record. Maternal observations use the same Observation shape and
 * quality model as infant observations, but are stored on the mother, not on the
 * infant encounter. This keeps the two clinical pictures separate.
 */
export interface Mother {
  id: string;
  name: string;
  ageYears: number | null;
  village: string;
  villageAreaId?: string;
  fokontany?: string;
  fokontanyAreaId?: string;
  commune?: string;
  communeAreaId?: string;
  district: string;
  districtAreaId?: string;
  region?: string;
  regionAreaId?: string;
  faritany?: string;
  faritanyAreaId?: string;
  countryId: string;
  observations: Observation[];
  reportedNeeds: string[];
  createdAt: string;
  createdBy: string;
  dataClassification: DataClassification;
  externalRecordRef?: string;
  /** True when this mother is the primary caregiver for the linked infant. */
  isPrimaryCaregiver: boolean;
}

export interface Patient {
  id: string;
  /** Links the infant to a mother record. */
  motherId: string;
  name: string;
  /** Age in days is used because young-infant guidance is age-banded. */
  ageDays: number;
  ageLabel: string;
  sex: 'Female' | 'Male' | 'Unknown';
  caregiverName: string;
  caregiverRelationship: string;
  village: string;
  villageAreaId?: string;
  fokontany?: string;
  fokontanyAreaId?: string;
  commune?: string;
  communeAreaId?: string;
  district: string;
  districtAreaId?: string;
  region?: string;
  regionAreaId?: string;
  faritany?: string;
  faritanyAreaId?: string;
  countryId: string;
  reportedConcerns: string[];
  createdAt: string;
  createdBy: string;
  dataClassification: DataClassification;
  /** Reference to an existing facility/CommCare record, to avoid duplicate registration. */
  externalRecordRef?: string;
}

// ---------------------------------------------------------------------------
// Encounters and clinical decisions
// ---------------------------------------------------------------------------

export type EncounterStatus =
  | 'Assessment initiated'
  | 'Evidence collected'
  | 'AI draft ready'
  | 'Awaiting physician review'
  | 'More information requested'
  | 'Decision signed'
  | 'Follow-up scheduled'
  | 'Referral in progress'
  | 'Closed';

export type Disposition = 'Home follow-up' | 'In-person assessment' | 'Urgent referral';

export interface AiDraft {
  id: string;
  text: string;
  generatedAt: string;
  model: string;
  protocolId: string | null;
  protocolVersion: string | null;
  evidenceFingerprint: string;
  /** True when produced by the deterministic local fallback, not a live model. */
  simulated: boolean;
  limitations: string;
}

export interface DecisionAmendment {
  at: string;
  byId: string;
  byName: string;
  reason: string;
  previousDisposition: Disposition;
  newDisposition: Disposition;
}

export interface PhysicianDecision {
  id: string;
  physicianId: string;
  physicianName: string;
  facilityId: string;
  facilityName: string;
  disposition: Disposition;
  /** Classification entered by the physician after comparing findings to the cited protocol. */
  protocolClassification?: string;
  /** Physician-entered protocol plan: treatment, referral, counselling, or follow-up. */
  protocolPlan?: string;
  protocolId?: string | null;
  protocolVersion?: string | null;
  workingAssessment: string;
  instructionsForCaregiver: string;
  safetyNetting: string;
  signedAt: string;
  evidenceFingerprint: string;
  /** True when the physician signed despite required observations being incomplete. */
  incompleteEvidenceAcknowledged: boolean;
  incompleteEvidenceReason?: string;
  amendments: DecisionAmendment[];
  /**
   * Whether the physician confirmed the caregiver understood the instructions
   * and safety-netting advice. Recorded separately from the working assessment.
   */
  caregiverUnderstandingConfirmed: boolean;
  caregiverUnderstandingNotes?: string;
}

export interface FollowUp {
  dueAt: string;
  method: 'Phone call' | 'Community health worker visit' | 'Facility visit' | 'Drone-assisted check-in';
  completedAt: string | null;
  outcome: string;
}

export interface Referral {
  facility: string;
  urgency: 'Same day' | 'Within 24 hours' | 'Routine';
  reason: string;
  initiatedAt: string;
  initiatedBy: string;
  completedAt: string | null;
  outcome: string;
}

export interface EncounterEvent {
  at: string;
  actorId: string;
  actorName: string;
  action: string;
  detail?: string;
  evidenceClass: EvidenceClass;
}

export interface ConsentRecord {
  obtained: boolean;
  obtainedBy: string | null;
  obtainedAt: string | null;
  scope: string;
  /** Caregiver can decline remote image capture while accepting remote assessment. */
  imageCaptureAllowed: boolean;
}

export type EquipmentMode = 'Drone-assisted outreach' | 'Community teleconsultation' | 'Facility visit';

/**
 * Explicit transmission states. "Saved locally" must never be presented as
 * "received by the physician".
 */
export type DeliveryState =
  | 'Saved locally'
  | 'Awaiting transmission'
  | 'Received by facility'
  | 'Assigned to physician'
  | 'Under review';

export type DraftReviewStatus = 'Accepted' | 'Rejected' | 'Amended';

export interface DraftReview {
  status: DraftReviewStatus;
  note: string;
  byId: string;
  byName: string;
  at: string;
}

/** Logistics is recorded separately from the clinical encounter. A successful delivery means equipment arrived — not that the infant was assessed. */
export interface LogisticsMission {
  required: boolean;
  mode: 'Local resources' | 'Drone delivery' | 'Other approved transport' | 'None';
  status: 'Not required' | 'Requested' | 'In transit' | 'Delivered' | 'Failed';
  note: string;
  deliveryOutcome: string;
}

export interface Encounter {
  id: string;
  /** Links the encounter to the mother record. Null only for legacy or migrated records. */
  motherId: string | null;
  patientId: string;
  countryId: string;
  facilityId: string;
  communeFacilityId?: string;
  districtReferralFacilityId?: string;
  regionalReferralFacilityId?: string;
  provincialReferralFacilityId?: string;
  createdBy: string;
  createdAt: string;
  status: EncounterStatus;
  equipmentMode: EquipmentMode;
  assignedDroneId: string | null;
  consent: ConsentRecord;
  observations: Observation[];
  aiDraft: AiDraft | null;
  physicianDecision: PhysicianDecision | null;
  followUp: FollowUp | null;
  referral: Referral | null;
  safetyEscalation: {
    triggered: boolean;
    reason: string;
    triggeredAt: string | null;
    triggeredBy: string | null;
  };
  failureEvents: { at: string; type: string; detail: string }[];
  deliveryState: DeliveryState;
  draftReview: DraftReview | null;
  logistics: LogisticsMission;
  history: EncounterEvent[];
  notes: string;
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export enum DroneStatus {
  Registered = 'Registered',
  Configuring = 'Configuration in progress',
  ReadyForTrial = 'Ready for field trial',
  InFieldTrial = 'In field trial',
  Maintenance = 'Maintenance required',
  Retired = 'Retired',
}

export interface ReadinessCheck {
  id: string;
  label: string;
  status: 'Passed' | 'Failed' | 'Not tested' | 'Simulated pass';
  evidence: string;
  checkedAt: string | null;
  checkedBy: string | null;
  evidenceClass: EvidenceClass;
}

export interface Activity {
  timestamp: string;
  event: string;
  details?: string;
  evidenceClass?: EvidenceClass;
}

export interface Drone {
  id: string;
  name: string;
  status: DroneStatus;
  countryId: string;
  role: string;
  model: string;
  serialNumber: string;
  readiness: ReadinessCheck[];
  lastFlightAt: string | null;
  flightHours: number | null;
  notes: string;
  assignedEncounterId: string | null;
  activityLog: Activity[];
}

export type AgeProtocol = 'Young Infant' | 'Child';

// ---------------------------------------------------------------------------
// Protocols and countries
// ---------------------------------------------------------------------------

export type ProtocolApprovalStatus = 'Draft — not reviewed' | 'Approved by clinical lead' | 'Retired';
export type ProtocolSourceRole =
  | 'National clinical source'
  | 'National validation event'
  | 'Historical clue'
  | 'WHO comparator';

export type ProtocolSourceVerification =
  | 'Document reviewed'
  | 'Reported — document pending'
  | 'Comparator only';

export interface ProtocolSource {
  id: string;
  role: ProtocolSourceRole;
  title: string;
  organisation: string;
  version: string | null;
  date: string | null;
  url?: string;
  verification: ProtocolSourceVerification;
  notes: string;
  rules: string[]; // Add the 'rules' property to match the usage
}

export interface ValidationEventRecord {
  status: 'Reported — record pending' | 'Documented';
  leadOrganisation: string;
  funder: string;
  venue: string;
  date: string | null;
  evidenceDescription: string;
}

export interface ProtocolRuleCitation {
  sourceId: string;
  ruleId: string; // Added ruleId property
  section: string;
  page: number;
  tableOrStep?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface DigitalPolicyRequirement {
  id: string;
  theme: string;
  strategyReference: string;
  requirement: string;
  appImplication: string;
  status:
    | 'To assess'
    | 'In design'
    | 'Evidence documented'
    | 'Requires Ministry confirmation';
}


export interface ProtocolRecord {
  id: string;
  countryId: string;
  ageProtocol: AgeProtocol;
  /** Clarifies that an international reference is not automatically adopted nationally. */
  scope?: 'International reference — not nationally adopted' | 'Madagascar national draft';
  title: string;
  version: string;
  sourceTitle: string;
  sourceOrganisation: string;
  sourceUrl?: string;
  sourceDate: string;
  importedAt: string;
  importedBy: string;
  clinicalApproval: ProtocolApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  reviewDueAt?: string;
  notes: string;
  demoReview?: ProtocolDemoReview;
  sources?: ProtocolSource[];
  /** Explicit national adaptations linked to international baseline rule IDs. */
  contextualizations?: ProtocolContextualization[];
  /** Source-mapped chart classes with their matching colour and action list. */
  classificationRules?: ProtocolClassificationRule[];
  validationEvent?: ValidationEventRecord;
}

export interface Country {
  id: string;
  name: string;
  localLanguage: Language;

  /** A country protocol is configured; this does not mean field deployment has begun. */
  isImplemented: boolean;

  /** "Pilot site" is reserved for a site selected and authorized for a pilot. */
  role: 'National design context' | 'Pilot site' | 'Exploration only';

  protocols: ProtocolRecord[];
  /** Raw protocol text used by the prototype's assessment session. */
  protocolText: Record<AgeProtocol, string>;
}
// ---------------------------------------------------------------------------
// Program readiness content
// ---------------------------------------------------------------------------

export interface EvidenceItem {
  id: string;
  area: string;
  claim: string;
  detail: string;
  status: EvidenceClass;
  source: string;
}

export interface ProgramPhase {
  id: string;
  months: string;
  title: string;
  activities: string[];
  evidenceProduced: string;
  status: 'Complete' | 'In progress' | 'Planned';
}

export interface OutcomeMeasure {
  dimension: string;
  measure: string;
  baseline: string;
  target: string;
  source: string;
}

export interface BudgetLine {
  workstream: string;
  amountUsd: number;
  note: string;
}

// ---------------------------------------------------------------------------
// Chat and persisted data
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
}

export interface AppData {
  schemaVersion: number;
  mothers: Mother[];
  patients: Patient[];
  encounters: Encounter[];
  countries: Country[];
  drones: Drone[];
  facilities: Facility[];
  administrativeAreas?: AdministrativeArea[];
  users: UserAccount[];
}

/**
 * Clinical status is tracked per locale. `Draft — needs local review` locales
 * show a banner and fall back to English for unreviewed clinical strings.
 * Structural labels may be translated earlier; clinical content may not.
 */
export const LANGUAGES: {
  code: Language;
  name: string;
  clinicalStatus: 'Reviewed' | 'Draft — needs local review';
}[] = [
  { code: 'en', name: 'English', clinicalStatus: 'Reviewed' },
  { code: 'fr', name: 'Français', clinicalStatus: 'Reviewed' },
  { code: 'es', name: 'Español', clinicalStatus: 'Draft — needs local review' },
  { code: 'de', name: 'Deutsch', clinicalStatus: 'Draft — needs local review' },
  { code: 'mg', name: 'Malagasy', clinicalStatus: 'Draft — needs local review' },
];

/** Keep demo review separate from clinic approval */

export interface ProtocolDemoReview {
  recordedBy: string;
  recordedAt: string;
}
