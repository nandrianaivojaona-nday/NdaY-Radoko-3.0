import {
  AiDraft,
  ConsentRecord,
  DeliveryState,
  Disposition,
  DraftReview,
  Encounter,
  EncounterStatus,
  FollowUp,
  LogisticsMission,
  Observation,
  ObservationDefinition,
  Patient,
  Mother,
  PhysicianDecision,
  Referral,
  UserAccount,
} from '../types';
import {
  OBSERVATION_BY_ID,
  createEmptyMaternalObservations,
  fingerprintObservations,
  summariseCompleteness,
} from '../data/observations';

export const newId = (prefix: string): string => {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${random}`;
};

export const canViewEncounter = (user: UserAccount, encounter: Encounter): boolean => {
  if (user.role === 'Program Admin') return true;
  if (user.role === 'Physician') return encounter.facilityId === user.facilityId;
  return true; // Field officers work across the outreach team in this prototype.
};

export const canRecordObservations = (user: UserAccount, encounter: Encounter): boolean =>
  (user.role === 'Field Officer' || user.role === 'Physician') &&
  !['Decision signed', 'Follow-up scheduled', 'Referral in progress', 'Closed'].includes(encounter.status);

export const canPrepareDraft = (user: UserAccount, encounter: Encounter): boolean =>
  user.role !== 'Program Admin' &&
  !['Decision signed', 'Follow-up scheduled', 'Referral in progress', 'Closed'].includes(encounter.status);

export const canSignDecision = (user: UserAccount, encounter: Encounter): boolean => {
  if (user.role !== 'Physician') return false;
  if (encounter.facilityId !== user.facilityId) return false;
  return ['Evidence collected', 'AI draft ready', 'Awaiting physician review', 'More information requested'].includes(
    encounter.status,
  );
};

export const canRequestMoreInformation = (user: UserAccount, encounter: Encounter): boolean =>
  user.role === 'Physician' &&
  encounter.facilityId === user.facilityId &&
  ['AI draft ready', 'Awaiting physician review'].includes(encounter.status);

export const canCompleteFollowUp = (user: UserAccount, encounter: Encounter): boolean =>
  user.role !== 'Program Admin' && encounter.status === 'Follow-up scheduled' && Boolean(encounter.followUp);

export const canCompleteReferral = (user: UserAccount, encounter: Encounter): boolean =>
  user.role !== 'Program Admin' && encounter.status === 'Referral in progress' && Boolean(encounter.referral);

const pushEvent = (
  encounter: Encounter,
  user: UserAccount,
  action: string,
  detail: string,
  evidenceClass: 'working' | 'simulated' | 'planned' = 'working',
): Encounter => ({
  ...encounter,
  history: [
    {
      at: new Date().toISOString(),
      actorId: user.id,
      actorName: `${user.name} (${user.role})`,
      action,
      detail,
      evidenceClass,
    },
    ...encounter.history,
  ],
});

// ---------------------------------------------------------------------------
// Required-observation completeness
// ---------------------------------------------------------------------------

/**
 * Collect every required observation that is not clinically usable, across
 * three distinct reasons the handoff treats as equally disqualifying:
 *
 *  - "Not assessed"  — the field officer did not attempt the observation.
 *  - "Unavailable"   — caregiver declined, device absent, etc.
 *  - "Unusable"      — a value was captured but is not clinically interpretable
 *                      (e.g. image quality too poor).
 *
 * `summariseCompleteness` reports the first kind under `requiredMissing`. The
 * other two must be scanned explicitly so that a required observation cannot
 * be "assessed" by declaring it unavailable.
 */
const collectIncompleteRequired = (encounter: Encounter): ObservationDefinition[] => {
  const summary = summariseCompleteness(encounter.observations);

  return summary.requiredMissing
    .map(({ id }) => OBSERVATION_BY_ID.get(id))
    .filter((definition): definition is ObservationDefinition => Boolean(definition));
};

// ---------------------------------------------------------------------------
// Record creation
// ---------------------------------------------------------------------------

export const createMotherRecord = (input: {
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
  reportedNeeds: string[];
  createdBy: string;
  externalRecordRef?: string;
  /** Whether the mother is the primary caregiver for the linked infant. */
  isPrimaryCaregiver?: boolean;
}): Mother => ({
  id: newId('MO'),
  name: input.name.trim(),
  ageYears: input.ageYears,
  village: input.village.trim(),
  villageAreaId: input.villageAreaId,
  fokontany: input.fokontany?.trim(),
  fokontanyAreaId: input.fokontanyAreaId,
  commune: input.commune?.trim(),
  communeAreaId: input.communeAreaId,
  district: input.district.trim(),
  districtAreaId: input.districtAreaId,
  region: input.region?.trim(),
  regionAreaId: input.regionAreaId,
  faritany: input.faritany?.trim(),
  faritanyAreaId: input.faritanyAreaId,
  countryId: input.countryId,
  observations: createEmptyMaternalObservations(),
  reportedNeeds: input.reportedNeeds,
  createdAt: new Date().toISOString(),
  createdBy: input.createdBy,
  dataClassification: 'Demo — synthetic',
  externalRecordRef: input.externalRecordRef,
  isPrimaryCaregiver: input.isPrimaryCaregiver ?? true,
});

export const createPatientRecord = (input: {
  motherId: string;
  name: string;
  ageDays: number;
  sex: Patient['sex'];
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
  createdBy: string;
  externalRecordRef?: string;
}): Patient => ({
  id: newId('PT'),
  motherId: input.motherId,
  name: input.name.trim(),
  ageDays: input.ageDays,
  ageLabel:
    input.ageDays < 1
      ? 'Newborn (day 0)'
      : `${input.ageDays} day${input.ageDays === 1 ? '' : 's'}`,
  sex: input.sex,
  caregiverName: input.caregiverName.trim(),
  caregiverRelationship: input.caregiverRelationship,
  village: input.village.trim(),
  villageAreaId: input.villageAreaId,
  fokontany: input.fokontany?.trim(),
  fokontanyAreaId: input.fokontanyAreaId,
  commune: input.commune?.trim(),
  communeAreaId: input.communeAreaId,
  district: input.district.trim(),
  districtAreaId: input.districtAreaId,
  region: input.region?.trim(),
  regionAreaId: input.regionAreaId,
  faritany: input.faritany?.trim(),
  faritanyAreaId: input.faritanyAreaId,
  countryId: input.countryId,
  reportedConcerns: input.reportedConcerns,
  createdAt: new Date().toISOString(),
  createdBy: input.createdBy,
  dataClassification: 'Demo — synthetic',
  externalRecordRef: input.externalRecordRef,
});

export const createEncounterRecord = (input: {
  motherId: string;
  patientId: string;
  countryId: string;
  facilityId: string;
  communeFacilityId?: string;
  districtReferralFacilityId?: string;
  regionalReferralFacilityId?: string;
  provincialReferralFacilityId?: string;
  createdBy: string;
  equipmentMode: Encounter['equipmentMode'];
  observationTemplate: Observation[];
  consent: ConsentRecord;
}): Encounter => ({
  id: newId('ENC'),
  motherId: input.motherId,
  patientId: input.patientId,
  countryId: input.countryId,
  facilityId: input.facilityId,
  communeFacilityId: input.communeFacilityId,
  districtReferralFacilityId: input.districtReferralFacilityId,
  regionalReferralFacilityId: input.regionalReferralFacilityId,
  provincialReferralFacilityId: input.provincialReferralFacilityId,
  createdBy: input.createdBy,
  createdAt: new Date().toISOString(),
  status: 'Assessment initiated',
  equipmentMode: input.equipmentMode,
  assignedDroneId: null,
  consent: input.consent,
  observations: input.observationTemplate,
  aiDraft: null,
  physicianDecision: null,
  followUp: null,
  referral: null,
  safetyEscalation: { triggered: false, reason: '', triggeredAt: null, triggeredBy: null },
  failureEvents: [],
  deliveryState: 'Saved locally',
  draftReview: null,
  logistics: { required: false, mode: 'Local resources', status: 'Not required', note: '', deliveryOutcome: '' },
  history: [
    {
      at: new Date().toISOString(),
      actorId: input.createdBy,
      actorName: input.createdBy,
      action: 'Encounter created',
      detail: `Mother ${input.motherId} · Equipment mode: ${input.equipmentMode}`,
      evidenceClass: 'working',
    },
  ],
  notes: '',
});

// ---------------------------------------------------------------------------
// Observation capture
// ---------------------------------------------------------------------------

export const saveObservations = (
  encounter: Encounter,
  user: UserAccount,
  observations: Observation[],
): Encounter => {
  const summary = summariseCompleteness(observations);
  const status: EncounterStatus =
    summary.requiredAssessed === 0 ? 'Assessment initiated' : 'Evidence collected';

  const currentFp = fingerprintObservations(observations);
  const draftStale = encounter.aiDraft ? encounter.aiDraft.evidenceFingerprint !== currentFp : false;
  const decisionStale = encounter.physicianDecision ? encounter.physicianDecision.evidenceFingerprint !== currentFp : false;

  const next: Encounter = {
    ...encounter,
    observations,
    status: encounter.status === 'More information requested' ? 'Evidence collected' : status,
    aiDraft: encounter.aiDraft
      ? { ...encounter.aiDraft, isStale: draftStale }
      : null,
    physicianDecision: encounter.physicianDecision
      ? { ...encounter.physicianDecision, isStale: decisionStale }
      : null,
  };
  return pushEvent(
    next,
    user,
    'Observations recorded',
    `${summary.requiredAssessed}/${summary.requiredTotal} required observations assessed${
      draftStale || decisionStale ? ' (previous review/draft marked stale)' : ''
    }`,
  );
};

// ---------------------------------------------------------------------------
// AI draft
// ---------------------------------------------------------------------------

export const attachDraft = (encounter: Encounter, user: UserAccount, draft: AiDraft): Encounter => {
  // INVARIANT: this is the only function that moves an encounter to
  // "Awaiting physician review".
  const next: Encounter = {
    ...encounter,
    aiDraft: draft,
    status: 'Awaiting physician review',
  };
  return pushEvent(
    next,
    user,
    draft.simulated ? 'Simulated AI draft prepared' : 'AI draft prepared',
    `${draft.model}; evidence ${draft.evidenceFingerprint}. Awaiting physician review.`,
    draft.simulated ? 'simulated' : 'working',
  );
};

export const reviewDraft = (
  encounter: Encounter,
  user: UserAccount,
  status: DraftReview['status'],
  note: string,
): Encounter => {
  if (!encounter.aiDraft) return encounter;
  const review: DraftReview = {
    status,
    note: note.trim(),
    byId: user.id,
    byName: `${user.name} (${user.role})`,
    at: new Date().toISOString(),
  };
  return pushEvent(
    { ...encounter, draftReview: review },
    user,
    `AI summary ${status.toLowerCase()}`,
    note.trim(),
  );
};

export const requestMoreInformation = (
  encounter: Encounter,
  user: UserAccount,
  detail: string,
): Encounter => {
  const next: Encounter = { ...encounter, status: 'More information requested' };
  return pushEvent(next, user, 'More information requested', detail);
};

// ---------------------------------------------------------------------------
// Physician decision
// ---------------------------------------------------------------------------

export interface DecisionInput {
  disposition: Disposition;
  protocolClassification: string;
  protocolPlan: string;
  protocolId?: string | null;
  protocolVersion?: string | null;
  workingAssessment: string;
  instructionsForCaregiver: string;
  safetyNetting: string;
  followUpDueAt?: string;
  followUpMethod?: FollowUp['method'];
  referralFacility?: string;
  referralUrgency?: Referral['urgency'];
  referralReason?: string;
  incompleteEvidenceAcknowledged: boolean;
  incompleteEvidenceReason?: string;
  /** The physician attests that the caregiver understood the plan and safety netting. */
  caregiverUnderstandingConfirmed: boolean;
  caregiverUnderstandingNotes?: string;
}

export interface DecisionValidation {
  valid: boolean;
  errors: string[];
  incompleteRequired: ObservationDefinition[];
}

export const validateDecision = (
  encounter: Encounter,
  input: DecisionInput,
): DecisionValidation => {
  const errors: string[] = [];
  const incompleteRequired = collectIncompleteRequired(encounter);

  if (!input.protocolClassification.trim()) errors.push('Record the clinician-entered classification after comparing findings with the protocol.');
  if (!input.protocolPlan.trim()) errors.push('Record the clinician-entered treatment, referral, counselling, or follow-up plan.');
  if (!input.workingAssessment.trim()) errors.push('A working assessment is required.');
  if (!input.instructionsForCaregiver.trim())
    errors.push('Instructions for the caregiver are required.');
  if (!input.safetyNetting.trim()) errors.push('Safety-netting advice is required.');

  // "Not assessed", "Unavailable" (caregiver declined, device absent) and
  // "Unusable" (value present but not interpretable) are all disqualifying.
  // None of them silently become "normal".
  if (incompleteRequired.length > 0 && !input.incompleteEvidenceAcknowledged) {
    errors.push(
      `Required observations are not clinically usable (${incompleteRequired.length}). Acknowledge incomplete evidence or collect more information.`,
    );
  }
  if (
    incompleteRequired.length > 0 &&
    input.incompleteEvidenceAcknowledged &&
    !input.incompleteEvidenceReason?.trim()
  ) {
    errors.push('Explain why the decision is being signed with incomplete evidence.');
  }
  if (!input.caregiverUnderstandingConfirmed) {
    errors.push(
      'Caregiver understanding of the plan and danger signs must be confirmed before signing.',
    );
  }
  if (input.disposition === 'Home follow-up') {
    if (!input.followUpDueAt) errors.push('A follow-up date is required for home follow-up.');
    if (!input.followUpMethod) errors.push('A follow-up method is required.');
  }
  if (input.disposition !== 'Home follow-up') {
    if (!input.referralFacility?.trim())
      errors.push('A receiving facility is required for referral or in-person assessment.');
    if (!input.referralUrgency) errors.push('A referral urgency is required.');
  }

  return { valid: errors.length === 0, errors, incompleteRequired };
};

export const signDecision = (
  encounter: Encounter,
  physician: UserAccount,
  facilityName: string,
  input: DecisionInput,
): Encounter => {
  // INVARIANT enforcement: only a Physician whose facilityId matches the
  // encounter can sign. Callers should already gate on `canSignDecision`, but
  // the check is repeated here so a programmatic caller cannot bypass it.
  if (physician.role !== 'Physician') {
    throw new Error('Only a physician account can sign a decision.');
  }
  if (!physician.facilityId || physician.facilityId !== encounter.facilityId) {
    throw new Error('The signing physician must belong to the encounter facility.');
  }

  // "Saved locally" and "Received by facility" are distinct. The UI warns in
  // this case; the console warning is for programmatic callers.
  if (encounter.deliveryState !== 'Received by facility') {
    // eslint-disable-next-line no-console
    console.warn(
      `[clinicalWorkflow] signDecision on ${encounter.id} while deliveryState is "${encounter.deliveryState}". The decision is signed locally; the record has not yet been received by the facility.`,
    );
  }

  const now = new Date().toISOString();
  const incompleteRequired = collectIncompleteRequired(encounter);

  const decision: PhysicianDecision = {
    id: newId('DEC'),
    physicianId: physician.id,
    physicianName: physician.name,
    facilityId: physician.facilityId,
    facilityName,
    disposition: input.disposition,
    protocolClassification: input.protocolClassification.trim(),
    protocolPlan: input.protocolPlan.trim(),
    protocolId: input.protocolId ?? null,
    protocolVersion: input.protocolVersion ?? null,
    workingAssessment: input.workingAssessment.trim(),
    instructionsForCaregiver: input.instructionsForCaregiver.trim(),
    safetyNetting: input.safetyNetting.trim(),
    signedAt: now,
    evidenceFingerprint: fingerprintObservations(encounter.observations),
    incompleteEvidenceAcknowledged:
      incompleteRequired.length > 0 && input.incompleteEvidenceAcknowledged,
    incompleteEvidenceReason: input.incompleteEvidenceReason?.trim() || undefined,
    amendments: [],
    caregiverUnderstandingConfirmed: input.caregiverUnderstandingConfirmed,
    caregiverUnderstandingNotes: input.caregiverUnderstandingNotes?.trim() ?? '',
  };

  let followUp: FollowUp | null = null;
  let referral: Referral | null = null;
  let status: EncounterStatus;

  if (input.disposition === 'Home follow-up') {
    followUp = {
      dueAt: input.followUpDueAt ?? now,
      method: input.followUpMethod ?? 'Phone call',
      completedAt: null,
      outcome: '',
    };
    status = 'Follow-up scheduled';
  } else {
    referral = {
      facility: input.referralFacility ?? '',
      urgency:
        input.referralUrgency ??
        (input.disposition === 'Urgent referral' ? 'Same day' : 'Within 24 hours'),
      reason: input.referralReason?.trim() || input.workingAssessment.trim(),
      initiatedAt: now,
      initiatedBy: physician.id,
      completedAt: null,
      outcome: '',
    };
    status = 'Referral in progress';
  }

  const next: Encounter = {
    ...encounter,
    status,
    physicianDecision: decision,
    followUp,
    referral,
  };

  return pushEvent(
    next,
    physician,
    'Physician decision signed',
    `${input.disposition}${
      incompleteRequired.length > 0 ? ' (incomplete evidence acknowledged)' : ''
    }`,
  );
};

export const amendDecision = (
  encounter: Encounter,
  physician: UserAccount,
  newDisposition: Disposition,
  reason: string,
  plan?: {
    followUpDueAt?: string;
    followUpMethod?: FollowUp['method'];
    referralFacility?: string;
    referralUrgency?: Referral['urgency'];
    referralReason?: string;
  },
): Encounter => {
  // Same invariant as signDecision: only a Physician at the encounter's
  // facility can amend. Programmatic callers cannot bypass this.
  if (physician.role !== 'Physician') {
    throw new Error('Only a physician account can amend a decision.');
  }
  if (!physician.facilityId || physician.facilityId !== encounter.facilityId) {
    throw new Error('The amending physician must belong to the encounter facility.');
  }
  if (!encounter.physicianDecision) return encounter;
  if (!reason.trim()) return encounter;

  const now = new Date().toISOString();
  const previous = encounter.physicianDecision;

  const updated: PhysicianDecision = {
    ...previous,
    disposition: newDisposition,
    amendments: [
      ...previous.amendments,
      {
        at: now,
        byId: physician.id,
        byName: physician.name,
        reason,
        previousDisposition: previous.disposition,
        newDisposition,
      },
    ],
  };

  // Keep the plan structures consistent with the new disposition. The previous
  // plan is preserved on the opposite channel rather than silently dropped.
  let followUp: FollowUp | null = encounter.followUp;
  let referral: Referral | null = encounter.referral;
  let status: EncounterStatus;

  if (newDisposition === 'Home follow-up') {
    if (!followUp) {
      followUp = {
        dueAt: plan?.followUpDueAt ?? now,
        method: plan?.followUpMethod ?? 'Phone call',
        completedAt: null,
        outcome: '',
      };
    } else if (plan?.followUpDueAt) {
      followUp = {
        ...followUp,
        dueAt: plan.followUpDueAt,
        method: plan.followUpMethod ?? followUp.method,
      };
    }
    status = 'Follow-up scheduled';
  } else {
    if (!referral) {
      referral = {
        facility: plan?.referralFacility ?? '',
        urgency: plan?.referralUrgency ?? 'Within 24 hours',
        reason: plan?.referralReason?.trim() || reason,
        initiatedAt: now,
        initiatedBy: physician.id,
        completedAt: null,
        outcome: '',
      };
    } else if (plan?.referralFacility || plan?.referralUrgency) {
      referral = {
        ...referral,
        facility: plan?.referralFacility ?? referral.facility,
        urgency: plan?.referralUrgency ?? referral.urgency,
        reason: plan?.referralReason?.trim() || referral.reason,
      };
    }
    status = 'Referral in progress';
  }

  const next = pushEvent(
    { ...encounter, physicianDecision: updated, followUp, referral, status },
    physician,
    'Decision amended',
    reason,
  );
  return next;
};

/**
 * Emergency bypass: this is the ONLY path that moves an encounter into a
 * decision status ("Referral in progress") without going through
 * signDecision. Per the handoff, it never touches the AI draft, never
 * requires a flight, and never waits for a physician signature. The
 * "only signDecision" invariant is scoped to the normal decision flow;
 * this is the documented exception.
 */
export const escalateUrgentCare = (
  encounter: Encounter,
  user: UserAccount,
  reason: string,
  receivingFacility: string,
): Encounter => {
  // A closed encounter is history; a new danger sign should create a new encounter.
  if (encounter.status === 'Closed') return encounter;

  const now = new Date().toISOString();
  const next: Encounter = {
    ...encounter,
    status: 'Referral in progress',
    safetyEscalation: {
      triggered: true,
      reason,
      triggeredAt: now,
      triggeredBy: user.id,
    },
    referral: {
      facility: receivingFacility,
      urgency: 'Same day',
      reason,
      initiatedAt: now,
      initiatedBy: user.id,
      completedAt: null,
      outcome: '',
    },
  };
  return pushEvent(
    next,
    user,
    'Urgent care escalation — AI and drone bypassed',
    reason,
    'working',
  );
};

export const completeFollowUp = (
  encounter: Encounter,
  user: UserAccount,
  outcome: string,
): Encounter => {
  if (!encounter.followUp) return encounter;
  if (encounter.status !== 'Follow-up scheduled') return encounter;
  const next: Encounter = {
    ...encounter,
    status: 'Closed',
    followUp: { ...encounter.followUp, completedAt: new Date().toISOString(), outcome },
  };
  return pushEvent(next, user, 'Follow-up completed', outcome);
};

export const completeReferral = (
  encounter: Encounter,
  user: UserAccount,
  outcome: string,
): Encounter => {
  if (!encounter.referral) return encounter;
  if (encounter.status !== 'Referral in progress') return encounter;
  const next: Encounter = {
    ...encounter,
    status: 'Closed',
    referral: { ...encounter.referral, completedAt: new Date().toISOString(), outcome },
  };
  return pushEvent(next, user, 'Referral outcome recorded', outcome);
};

export const logFailure = (
  encounter: Encounter,
  user: UserAccount,
  type: string,
  detail: string,
): Encounter => {
  const next: Encounter = {
    ...encounter,
    failureEvents: [{ at: new Date().toISOString(), type, detail }, ...encounter.failureEvents],
  };
  return pushEvent(next, user, 'Operational failure logged', `${type}: ${detail}`, 'working');
};

export const observationValueFor = (encounter: Encounter, definitionId: string): string =>
  encounter.observations.find((o) => o.definitionId === definitionId)?.value ?? '';

export const observationDefinitionFor = (definitionId: string): ObservationDefinition | undefined =>
  OBSERVATION_BY_ID.get(definitionId);

export const CLOSED_STATUSES: EncounterStatus[] = ['Closed'];
export const ACTIVE_STATUSES: EncounterStatus[] = [
  'Assessment initiated',
  'Evidence collected',
  'AI draft ready',
  'Awaiting physician review',
  'More information requested',
  'Decision signed',
  'Follow-up scheduled',
  'Referral in progress',
];

export const DELIVERY_STATES: DeliveryState[] = [
  'Saved locally',
  'Awaiting transmission',
  'Received by facility',
  'Assigned to physician',
  'Under review',
];

export const advanceDeliveryState = (
  encounter: Encounter,
  user: UserAccount,
  next: DeliveryState,
  detail = '',
): Encounter =>
  pushEvent(
    { ...encounter, deliveryState: next },
    user,
    'Transmission state updated',
    `${encounter.deliveryState} → ${next}${detail ? ` · ${detail}` : ''}`,
  );

export const updateLogistics = (
  encounter: Encounter,
  user: UserAccount,
  logistics: LogisticsMission,
): Encounter =>
  pushEvent(
    { ...encounter, logistics },
    user,
    'Logistics mission updated',
    `${logistics.mode} · ${logistics.status} · ${logistics.deliveryOutcome || 'no delivery outcome'}`,
  );

// ---------------------------------------------------------------------------
// Structured classification evaluation
// ---------------------------------------------------------------------------
import type {
  CriteriaCheck, CriteriaGroup, CriteriaOperator, ProtocolClassificationRule,
} from '../types';

export type CriteriaMatch = 'matched' | 'not-matched' | 'indeterminate';

export interface RuleEvaluation {
  ruleId: string;
  label: string;
  result: CriteriaMatch;
  matchedCriteria: string[];
  unmatchedCriteria: string[];
  unresolvedCriteria: string[];
}

const parseNumber = (v: string): number | null => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const evaluateOperator = (
  raw: string, op: CriteriaOperator, expected: string | number | string[],
): boolean => {
  const expectedStr = Array.isArray(expected)
    ? expected.map((v) => String(v).toLowerCase())
    : String(expected).toLowerCase();
  const rawLower = raw.toLowerCase();
  const rawNum = parseNumber(raw);
  const expectedNum = typeof expected === 'number'
    ? expected
    : typeof expected === 'string' ? parseNumber(expected) : null;
  switch (op) {
    case 'equals': return rawLower === expectedStr;
    case 'notEquals': return rawLower !== expectedStr;
    case 'greaterOrEqual': return rawNum !== null && expectedNum !== null && rawNum >= expectedNum;
    case 'lessOrEqual': return rawNum !== null && expectedNum !== null && rawNum <= expectedNum;
    case 'greater': return rawNum !== null && expectedNum !== null && rawNum > expectedNum;
    case 'less': return rawNum !== null && expectedNum !== null && rawNum < expectedNum;
    case 'in':
      return Array.isArray(expected)
        ? (expected as string[]).map((v) => String(v).toLowerCase()).includes(rawLower)
        : rawLower === expectedStr;
    case 'notIn':
      return Array.isArray(expected)
        ? !(expected as string[]).map((v) => String(v).toLowerCase()).includes(rawLower)
        : rawLower !== expectedStr;
    case 'contains': {
      const needle = Array.isArray(expectedStr) ? (expectedStr[0] ?? '') : expectedStr;
      return rawLower.includes(needle);
    }
    default: return false;
  }
};

export const evaluateCheck = (
  check: CriteriaCheck, observations: Observation[],
): CriteriaMatch => {
  const o = observations.find((x) => x.definitionId === check.observationId);
  if (!o || !o.value.trim()
    || o.quality === 'Not assessed'
    || o.quality === 'Unavailable'
    || o.quality === 'Unusable') return 'indeterminate';
  const m = evaluateOperator(o.value, check.operator, check.value);
  const f = check.negate ? !m : m;
  return f ? 'matched' : 'not-matched';
};

export const evaluateCriteriaGroup = (
  g: CriteriaGroup, observations: Observation[],
): { result: CriteriaMatch; matched: string[]; unmatched: string[]; unresolved: string[] } => {
  const matches = g.checks.map((c) => ({
    description: c.description,
    result: evaluateCheck(c, observations),
  }));
  const matched = matches.filter((m) => m.result === 'matched').map((m) => m.description);
  const unmatched = matches.filter((m) => m.result === 'not-matched').map((m) => m.description);
  const unresolved = matches.filter((m) => m.result === 'indeterminate').map((m) => m.description);
  let result: CriteriaMatch;
  if (g.match === 'any') {
    if (matched.length > 0) result = 'matched';
    else if (unresolved.length > 0) result = 'indeterminate';
    else result = 'not-matched';
  } else if (g.match === 'all') {
    if (unmatched.length > 0) result = 'not-matched';
    else if (unresolved.length > 0) result = 'indeterminate';
    else result = 'matched';
  } else {
    const t = g.countThreshold ?? 1;
    if (matched.length >= t) result = 'matched';
    else if (matched.length + unresolved.length < t) result = 'not-matched';
    else result = 'indeterminate';
  }
  return { result, matched, unmatched, unresolved };
};

export const evaluateClassificationRules = (
  rules: ProtocolClassificationRule[], observations: Observation[],
): RuleEvaluation[] =>
  rules.map((rule) => {
    if (!rule.criteria) return {
      ruleId: rule.id, label: rule.label, result: 'indeterminate',
      matchedCriteria: [], unmatchedCriteria: [],
      unresolvedCriteria: ['No structured criteria mapped.'],
    };
    const { result, matched, unmatched, unresolved } = evaluateCriteriaGroup(
      rule.criteria, observations,
    );
    return {
      ruleId: rule.id, label: rule.label, result,
      matchedCriteria: matched, unmatchedCriteria: unmatched, unresolvedCriteria: unresolved,
    };
  });
