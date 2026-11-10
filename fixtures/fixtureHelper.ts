// fixtures/fixtureHelper.ts
import { ConsentRecord, Encounter, Mother, Observation, Patient } from '../types';
import {
  createEmptyMaternalObservations,
  createEmptyObservations,
  fingerprintObservations,
} from '../data/observations';
import { ScenarioDefinition, SCENARIO_DEFINITIONS } from './scenarioCatalog';
import { SyntheticScenario } from './types';

const RECORDED_BY = 'U-FIXTURE-BUILDER';
const RECORDED_AT = '2026-01-01T00:00:00.000Z';

const buildObservations = (definition: ScenarioDefinition): Observation[] => {
  const empty = createEmptyObservations();
  return empty.map((observation) => {
    const entry = definition.observations[observation.definitionId];
    if (!entry) return observation;
    return {
      ...observation,
      value: entry.value,
      quality: entry.quality,
      recordedAt: RECORDED_AT,
      recordedBy: RECORDED_BY,
      notes: entry.notes,
    };
  });
};

const buildMother = (definition: ScenarioDefinition): Mother => ({
  id: `MO-${definition.id}`,
  name: `Mother of ${definition.id}`,
  ageYears: definition.category === 'elderly-caregiver' ? null : 25,
  village: 'Synthetic Village',
  district: 'Synthetic District',
  countryId: 'madagascar',
  observations: createEmptyMaternalObservations(),
  reportedNeeds:
    definition.category === 'maternal-focus'
      ? ['breastfeeding support', 'low mood (informal report)']
      : [],
  createdAt: RECORDED_AT,
  createdBy: RECORDED_BY,
  dataClassification: 'Demo — synthetic',
  isPrimaryCaregiver: definition.caregiverRelationship === 'Mother',
});

const buildPatient = (definition: ScenarioDefinition, mother: Mother): Patient => ({
  id: `PT-${definition.id}`,
  motherId: mother.id,
  name: `Infant ${definition.id}`,
  ageDays: definition.ageDays,
  ageLabel:
    definition.ageDays < 1 ? 'Newborn (day 0)' : `${definition.ageDays} day${definition.ageDays === 1 ? '' : 's'}`,
  sex: definition.sex,
  caregiverName: definition.caregiverName,
  caregiverRelationship: definition.caregiverRelationship,
  village: 'Synthetic Village',
  district: 'Synthetic District',
  countryId: 'madagascar',
  reportedConcerns: definition.reportedConcerns,
  createdAt: RECORDED_AT,
  createdBy: RECORDED_BY,
  dataClassification: 'Demo — synthetic',
});

const buildConsent = (definition: ScenarioDefinition): ConsentRecord => ({
  obtained: definition.consentObtained,
  obtainedBy: definition.consentObtained ? RECORDED_BY : null,
  obtainedAt: definition.consentObtained ? RECORDED_AT : null,
  scope: definition.consentObtained ? 'Synthetic fixture consent (not a real consent record).' : '',
  imageCaptureAllowed: definition.consentObtained && definition.imageCaptureAllowed,
  audioRecordingAllowed: false,
  videoRecordingAllowed: false,
});

const buildEncounter = (
  definition: ScenarioDefinition,
  mother: Mother,
  patient: Patient,
  observations: Observation[],
): Encounter => {
  const dangerSign = definition.category === 'danger-sign';
  return {
    id: `ENC-${definition.id}`,
    motherId: mother.id,
    patientId: patient.id,
    countryId: 'madagascar',
    facilityId: 'FAC-SYNTHETIC',
    createdBy: RECORDED_BY,
    createdAt: RECORDED_AT,
    status: dangerSign
      ? 'Referral in progress'
      : definition.category === 'no-observations'
      ? 'Assessment initiated'
      : definition.category === 'complete-evidence'
      ? 'Awaiting physician review'
      : 'Evidence collected',
    equipmentMode: definition.equipmentMode,
    assignedDroneId: null,
    consent: buildConsent(definition),
    observations,
    aiDraft: null,
    physicianDecision: null,
    followUp: null,
    referral: dangerSign
      ? {
          facility: 'Synthetic receiving facility (placeholder)',
          urgency: 'Same day',
          reason: 'Caregiver reported convulsions. Same-day referral recorded locally by the field officer.',
          initiatedAt: RECORDED_AT,
          initiatedBy: RECORDED_BY,
          completedAt: null,
          outcome: '',
        }
      : null,
    safetyEscalation: dangerSign
      ? {
          triggered: true,
          reason: 'Convulsions reported by caregiver.',
          triggeredAt: RECORDED_AT,
          triggeredBy: RECORDED_BY,
        }
      : { triggered: false, reason: '', triggeredAt: null, triggeredBy: null },
    failureEvents: [],
    deliveryState: dangerSign ? 'Received by facility' : 'Saved locally',
    draftReview: null,
    logistics: {
      required: false,
      mode: 'None',
      status: 'Not required',
      note: 'No logistics mission is requested by fixtures.',
      deliveryOutcome: '',
    },
    history: [
      {
        at: RECORDED_AT,
        actorId: RECORDED_BY,
        actorName: 'Fixture builder',
        action: 'Fixture prepared',
        detail: 'Synthetic input fixture. No physician decision recorded.',
        evidenceClass: 'simulated',
      },
    ],
    notes: definition.signatureNote ?? '',
  };
};

export const buildScenario = (definition: ScenarioDefinition): SyntheticScenario => {
  const observations = buildObservations(definition);
  const mother = buildMother(definition);
  const patient = buildPatient(definition, mother);
  const encounter = buildEncounter(definition, mother, patient, observations);

  return {
    synthetic: true,
    id: definition.id,
    name: definition.name,
    category: definition.category,
    description: definition.description,
    clinicalCaveat: definition.clinicalCaveat,
    mother,
    patient,
    encounter,
    expectedBehaviour: definition.expectedBehaviour,
  };
};

export const buildAllScenarios = (): SyntheticScenario[] =>
  SCENARIO_DEFINITIONS.map(buildScenario);

export const fingerprintScenario = (scenario: SyntheticScenario): string => {
  const canonical = [
    scenario.id,
    scenario.category,
    scenario.encounter.equipmentMode,
    String(scenario.encounter.consent.obtained),
    String(scenario.encounter.consent.imageCaptureAllowed),
    fingerprintObservations(scenario.encounter.observations),
  ].join('|');
  let hash = 2166136261;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `sc-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

export const assertScenarioShape = (scenario: SyntheticScenario): void => {
  if (scenario.synthetic !== true) throw new Error(`${scenario.id}: synthetic flag must be true.`);
  if (!/^SC-\d{2}$/.test(scenario.id)) throw new Error(`${scenario.id}: invalid id format.`);
  if (!scenario.clinicalCaveat?.trim()) throw new Error(`${scenario.id}: clinical caveat missing.`);
  if (scenario.patient.motherId !== scenario.mother.id)
    throw new Error(`${scenario.id}: patient.motherId does not match mother.id.`);
  if (scenario.encounter.patientId !== scenario.patient.id)
    throw new Error(`${scenario.id}: encounter.patientId does not match patient.id.`);
  if (scenario.encounter.motherId !== scenario.mother.id)
    throw new Error(`${scenario.id}: encounter.motherId does not match mother.id.`);
  if (scenario.encounter.aiDraft !== null)
    throw new Error(`${scenario.id}: fixtures must not carry an AI draft.`);
  if (scenario.encounter.physicianDecision !== null)
    throw new Error(`${scenario.id}: fixtures must not carry a physician decision.`);
  if (scenario.encounter.equipmentMode === 'Drone-assisted outreach')
    throw new Error(`${scenario.id}: fixtures must not reference drone-assisted outreach.`);
  if (scenario.mother.dataClassification !== 'Demo — synthetic')
    throw new Error(`${scenario.id}: mother classification must be Demo — synthetic.`);
  if (scenario.patient.dataClassification !== 'Demo — synthetic')
    throw new Error(`${scenario.id}: patient classification must be Demo — synthetic.`);
};
