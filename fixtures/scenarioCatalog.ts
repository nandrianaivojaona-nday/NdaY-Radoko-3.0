// fixtures/scenarioCatalog.ts
import { EquipmentMode, ObservationQuality } from '../types';
import { ScenarioCategory } from './types';

export interface ScenarioObservationValue {
  value: string;
  quality: ObservationQuality;
  notes?: string;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  category: ScenarioCategory;
  description: string;
  clinicalCaveat: string;
  expectedBehaviour: string;
  ageDays: number;
  sex: 'Female' | 'Male' | 'Unknown';
  caregiverName: string;
  caregiverRelationship: string;
  reportedConcerns: string[];
  equipmentMode: EquipmentMode;
  consentObtained: boolean;
  imageCaptureAllowed: boolean;
  observations: Record<string, ScenarioObservationValue>;
  signatureNote?: string;
}

const BASELINE_NORMAL: Record<string, ScenarioObservationValue> = {
  convulsions: { value: 'No', quality: 'Reported — unverified' },
  feeding_poorly: { value: 'No', quality: 'Reported — unverified' },
  vomits_everything: { value: 'No', quality: 'Reported — unverified' },
  lethargy: { value: 'Alert and active', quality: 'Observed — remote' },
  movement_only_when_stimulated: { value: 'No — moves spontaneously', quality: 'Observed — remote' },
  respiratory_rate: { value: '44', quality: 'Measured — device' },
  chest_indrawing: { value: 'Absent', quality: 'Observed — remote' },
  grunting: { value: 'Absent', quality: 'Observed — remote' },
  stridor: { value: 'Absent', quality: 'Observed — remote' },
  axillary_temperature: { value: '36.8', quality: 'Measured — device' },
  weight: { value: '3.2', quality: 'Measured — device' },
  breastfeeding_status: { value: 'Exclusively breastfeeding', quality: 'Reported — unverified' },
  feeding_change: { value: 'No change', quality: 'Reported — unverified' },
  jaundice_present: { value: 'No', quality: 'Observed — remote' },
  jaundice_onset_day: { value: 'N/A — no jaundice reported', quality: 'Reported — unverified' },
  jaundice_palms_soles: { value: 'No', quality: 'Observed — remote' },
  diarrhoea_present: { value: 'No', quality: 'Reported — unverified' },
  blood_in_stool: { value: 'No', quality: 'Reported — unverified' },
  sunken_eyes: { value: 'No', quality: 'Observed — remote' },
  umbilical_infection: { value: 'No', quality: 'Observed — remote' },
  skin_pustules: { value: 'No', quality: 'Observed — remote' },
  ear_discharge: { value: 'No', quality: 'Observed — remote' },
  oral_thrush: { value: 'No', quality: 'Observed — remote' },
  immunisation_status: { value: 'Up to date for age', quality: 'Reported — unverified' },
};

const CAVEAT =
  'Synthetic input fixture. Not a clinical case, not a completed test, and not a result. No AI draft is present, no physician decision is recorded, and no aircraft is operated.';

export const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
  {
    id: 'SC-01',
    name: 'Complete evidence — ready for physician review',
    category: 'complete-evidence',
    description:
      'All required observations carry usable values. Prepared so the physician-review screen can be demonstrated without signing.',
    clinicalCaveat: CAVEAT,
    expectedBehaviour:
      'Overview should show all required observations assessed; the physician decision tab should be reachable but the signature should NOT be exercised in a demo.',
    ageDays: 21,
    sex: 'Female',
    caregiverName: 'Caregiver A',
    caregiverRelationship: 'Mother',
    reportedConcerns: ['Feeding concern'],
    equipmentMode: 'Community teleconsultation',
    consentObtained: true,
    imageCaptureAllowed: true,
    observations: { ...BASELINE_NORMAL },
    signatureNote: 'No physician decision is recorded in this fixture.',
  },
  {
    id: 'SC-02',
    name: 'Incomplete evidence — missing required observations',
    category: 'incomplete-evidence',
    description:
      'Two required observations are marked "Not assessed", so completeness must remain below 100% and the physician gate must block signing unless incompleteness is acknowledged.',
    clinicalCaveat: CAVEAT,
    expectedBehaviour:
      'Evidence tab should show required observations missing; decision tab should block signing and require explicit acknowledgement of incomplete evidence.',
    ageDays: 14,
    sex: 'Female',
    caregiverName: 'Caregiver B',
    caregiverRelationship: 'Mother',
    reportedConcerns: ['Feeding concern', 'Cough'],
    equipmentMode: 'Community teleconsultation',
    consentObtained: true,
    imageCaptureAllowed: true,
    observations: {
      ...BASELINE_NORMAL,
      chest_indrawing: { value: '', quality: 'Not assessed' },
      grunting: { value: '', quality: 'Not assessed' },
    },
  },
  {
    id: 'SC-03',
    name: 'Danger sign reported — urgent-care pathway',
    category: 'danger-sign',
    description:
      'Caregiver reports convulsions. A same-day referral is recorded locally by the field officer; the AI draft and any flight are bypassed.',
    clinicalCaveat: CAVEAT,
    expectedBehaviour:
      'Overview should show the urgent-care banner; the outcome tab should allow recording a referral; the AI draft tab should remain empty.',
    ageDays: 12,
    sex: 'Female',
    caregiverName: 'Caregiver C',
    caregiverRelationship: 'Mother',
    reportedConcerns: ['Convulsions or fits'],
    equipmentMode: 'Community teleconsultation',
    consentObtained: true,
    imageCaptureAllowed: false,
    observations: {
      ...BASELINE_NORMAL,
      convulsions: { value: 'Yes — during this illness', quality: 'Reported — unverified' },
      feeding_poorly: { value: 'Yes — not feeding at all', quality: 'Reported — unverified' },
    },
  },
  {
    id: 'SC-04',
    name: 'Consent not recorded — assessment blocked',
    category: 'consent-blocked',
    description:
      'Consent has not been obtained, so the observation panel must refuse to accept entries and the signature gate must remain blocked.',
    clinicalCaveat: CAVEAT,
    expectedBehaviour:
      'Evidence tab should show a consent-required notice; observation inputs should be disabled; saving should be blocked.',
    ageDays: 5,
    sex: 'Male',
    caregiverName: 'Caregiver D',
    caregiverRelationship: 'Mother',
    reportedConcerns: [],
    equipmentMode: 'Community teleconsultation',
    consentObtained: false,
    imageCaptureAllowed: false,
    observations: {},
  },
  {
    id: 'SC-05',
    name: 'No observations recorded — empty encounter',
    category: 'no-observations',
    description:
      'An encounter that has just been opened. Every observation is "Not assessed". Used to confirm the empty-state rendering.',
    clinicalCaveat: CAVEAT,
    expectedBehaviour:
      'Completeness should show 0 of N required; no observations should be shown as usable; signature must remain blocked.',
    ageDays: 3,
    sex: 'Female',
    caregiverName: 'Caregiver E',
    caregiverRelationship: 'Mother',
    reportedConcerns: [],
    equipmentMode: 'Facility visit',
    consentObtained: true,
    imageCaptureAllowed: false,
    observations: {},
  },
  {
    id: 'SC-06',
    name: 'Unusable evidence — chest-indrawing recording failed',
    category: 'unusable-quality',
    description:
      'Chest indrawing was attempted but the recording is unusable. The value must remain flagged Unusable, not converted to "Absent".',
    clinicalCaveat: CAVEAT,
    expectedBehaviour:
      'Quality badge should display "Unusable"; completeness should count the item as missing; missing-is-not-normal banner should appear.',
    ageDays: 9,
    sex: 'Female',
    caregiverName: 'Caregiver F',
    caregiverRelationship: 'Mother',
    reportedConcerns: ['Cough'],
    equipmentMode: 'Community teleconsultation',
    consentObtained: true,
    imageCaptureAllowed: true,
    observations: {
      ...BASELINE_NORMAL,
      chest_indrawing: { value: 'Unable to assess', quality: 'Unusable', notes: 'Video link dropped during chest view.' },
    },
  },
  {
    id: 'SC-07',
    name: 'Maternal needs recorded — infant observation empty',
    category: 'maternal-focus',
    description:
      'The mother reports breastfeeding support needs and low mood. The infant observation catalogue is untouched. Used to verify that mother and infant records stay separate.',
    clinicalCaveat: CAVEAT,
    expectedBehaviour:
      'Linked mother card should show reported needs; infant observations should remain Not assessed; maternal observations should be on the mother record, not merged into the encounter.',
    ageDays: 27,
    sex: 'Female',
    caregiverName: 'Caregiver G',
    caregiverRelationship: 'Mother',
    reportedConcerns: [],
    equipmentMode: 'Community teleconsultation',
    consentObtained: true,
    imageCaptureAllowed: true,
    observations: {},
  },
  {
    id: 'SC-08',
    name: 'Multi-concern — feeding and breathing',
    category: 'multi-concern',
    description:
      'Caregiver reports both feeding difficulty and fast breathing. The concern guidance should surface both sets of prioritised observations.',
    clinicalCaveat: CAVEAT,
    expectedBehaviour:
      'Evidence tab should prioritise feeding and respiratory observations; concern banner should be present; no automated classification occurs.',
    ageDays: 18,
    sex: 'Male',
    caregiverName: 'Caregiver H',
    caregiverRelationship: 'Mother',
    reportedConcerns: ['Feeding concern', 'Fast breathing'],
    equipmentMode: 'Community teleconsultation',
    consentObtained: true,
    imageCaptureAllowed: true,
    observations: {
      ...BASELINE_NORMAL,
      feeding_poorly: { value: 'Yes — less than usual', quality: 'Reported — unverified' },
      respiratory_rate: { value: '58', quality: 'Measured — device' },
    },
  },
  {
    id: 'SC-09',
    name: 'Grandmother is primary caregiver',
    category: 'elderly-caregiver',
    description:
      'The mother record is present but the grandmother is the primary caregiver. Used to verify the caregiver fields render as entered.',
    clinicalCaveat: CAVEAT,
    expectedBehaviour:
      'Caregiver line should show the grandmother; mother record remains separate on the linked card.',
    ageDays: 8,
    sex: 'Male',
    caregiverName: 'Caregiver I',
    caregiverRelationship: 'Grandmother',
    reportedConcerns: ['Umbilicus is red or has pus'],
    equipmentMode: 'Community teleconsultation',
    consentObtained: true,
    imageCaptureAllowed: true,
    observations: {
      ...BASELINE_NORMAL,
      umbilical_infection: { value: 'Yes — redness', quality: 'Observed — remote' },
    },
  },
  {
    id: 'SC-10',
    name: 'Very young infant — day 0',
    category: 'very-young-infant',
    description: 'Age-band edge case: newborn on day 0.',
    clinicalCaveat: CAVEAT,
    expectedBehaviour:
      'Age label should show "Newborn (day 0)"; all normal young-infant validation applies.',
    ageDays: 0,
    sex: 'Female',
    caregiverName: 'Caregiver J',
    caregiverRelationship: 'Mother',
    reportedConcerns: [],
    equipmentMode: 'Facility visit',
    consentObtained: true,
    imageCaptureAllowed: false,
    observations: { ...BASELINE_NORMAL, weight: { value: '2.9', quality: 'Measured — device' } },
  },
  {
    id: 'SC-11',
    name: 'Older infant within band — day 59',
    category: 'older-infant-within-band',
    description: 'Age-band edge case: last day still inside the young-infant band.',
    clinicalCaveat: CAVEAT,
    expectedBehaviour:
      'Age label should show "59 days"; young-infant validation applies; day 60 would require a different protocol.',
    ageDays: 59,
    sex: 'Male',
    caregiverName: 'Caregiver K',
    caregiverRelationship: 'Mother',
    reportedConcerns: [],
    equipmentMode: 'Community teleconsultation',
    consentObtained: true,
    imageCaptureAllowed: true,
    observations: { ...BASELINE_NORMAL, weight: { value: '4.6', quality: 'Measured — device' } },
  },
  {
    id: 'SC-12',
    name: 'Age outside band — day 90',
    category: 'age-outside-band',
    description:
      'Deliberately outside the young-infant band. This fixture exists so reviewers can confirm the application rejects it during encounter creation. The fixture itself does not assert a rejection occurred.',
    clinicalCaveat: CAVEAT,
    expectedBehaviour:
      'The application should refuse to create this encounter at the registration step. This fixture documents the input only; it is not evidence that the app rejected it.',
    ageDays: 90,
    sex: 'Female',
    caregiverName: 'Caregiver L',
    caregiverRelationship: 'Mother',
    reportedConcerns: [],
    equipmentMode: 'Facility visit',
    consentObtained: true,
    imageCaptureAllowed: false,
    observations: {},
  },
];
