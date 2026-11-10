import {
  AssessmentAcquisitionConfig,
  Observation,
  ObservationCategory,
  ObservationDefinition,
  ObservationQuality,
  ObservationSource,
  ProtocolSource,
} from '../types';
import { validateProtocolCitations } from './protocoleSources';

export const defaultAcquisitionFor = (def: Pick<ObservationDefinition, 'id' | 'method' | 'label' | 'category'>): AssessmentAcquisitionConfig => {
  if (['grunting', 'stridor'].includes(def.id)) {
    return {
      action: 'LISTEN',
      channels: ['microphone', 'speaker', 'camera'],
      instruction: `Listen carefully for ${def.label.toLowerCase()} using high-sensitivity remote microphone while infant is quiet.`,
    };
  }
  if (def.id === 'skin_pustules') {
    return {
      action: 'LOOK',
      channels: ['camera', 'speaker'],
      instruction: 'Inspect infant skin under clear lighting. Guide caregiver to gently uncover abdomen, folds, and extremities. Note lesion counts and distribution.',
    };
  }
  if (def.method === 'Caregiver report') {
    return {
      action: 'ASK',
      channels: ['speaker', 'microphone'],
      instruction: `Ask caregiver via remote two-way audio about ${def.label.toLowerCase()}. Record history faithfully.`,
    };
  }
  if (def.method === 'Remote visual observation') {
    return {
      action: 'LOOK',
      channels: ['camera', 'speaker'],
      instruction: `Inspect ${def.label.toLowerCase()} visually via camera workspace. Ensure adequate natural or clinical lighting.`,
    };
  }
  if (def.method === 'Device measurement') {
    return {
      action: 'MEASURE',
      channels: ['instrument', 'camera'],
      instruction: `Record ${def.label.toLowerCase()} using calibrated device or verified counting procedure.`,
    };
  }
  return {
    action: 'EXAMINE',
    channels: ['in-person', 'speaker'],
    instruction: `Trained in-person physical assessment required for ${def.label.toLowerCase()}. Never attempt forceful manipulation remotely.`,
  };
};

/**
 * A PROPOSED observation catalogue for young-infant (0–59 days) assessment.
 *
 * This is not a clinical protocol. It is the product team's working map of the
 * observations a physician-supervised service might collect, and of which ones
 * could plausibly be gathered remotely. The clinical partner must ratify every
 * row against the locally approved IMCI/IMNCI chart before any pilot use.
 */

export const isUsableObservation = (observation: Observation): boolean =>
  Boolean(
    observation.value.trim() &&
      observation.quality !== 'Not assessed' &&
      observation.quality !== 'Unavailable' &&
      observation.quality !== 'Unusable',
  );

export const OBSERVATION_CATALOGUE: ObservationDefinition[] = [
  // Danger signs -----------------------------------------------------------
  {
    id: 'convulsions',
    label: 'Convulsions reported',
    category: 'Danger signs',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: true,
    valueType: 'select',
    options: ['No', 'Yes — during this illness', 'Yes — now', 'Unable to determine'],
    guidance: 'Ask whether the infant had fits, shaking, or stiffness that could not be stopped.',
    protocolReference: 'IMCI young infant: convulsions',
    
  },
  {
    id: 'feeding_poorly',
    label: 'Feeding poorly',
    category: 'Danger signs',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: true,
    valueType: 'select',
    options: ['No', 'Yes — less than usual', 'Yes — not feeding at all', 'Unable to determine'],
    guidance: 'Compare with the infant’s normal feeding over the last 24 hours.',
    protocolReference: 'IMCI young infant: not feeding well',
  },

  {
    id: 'vomits_everything',
    label: 'Vomits everything',
    category: 'Danger signs',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: true,
    valueType: 'select',
    options: ['No', 'Yes', 'Unable to determine'],
    guidance: 'Ask whether the infant keeps any breast milk or feed down.',
    protocolReference: 'IMCI young infant: vomiting everything',
  },
  {
    id: 'lethargy',
    label: 'Level of consciousness and activity',
    category: 'Danger signs',
    method: 'Remote visual observation',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: true,
    valueType: 'select',
    options: ['Alert and active', 'Less active than usual', 'Lethargic or unconscious', 'Unable to assess'],
    guidance: 'Observe spontaneous movement and response to gentle stimulation. Do not interpret from a still image alone.',
    protocolReference: 'IMCI young infant: lethargic or unconscious',
  },
  {
    id: 'movement_only_when_stimulated',
    label: 'Movement only when stimulated',
    category: 'Danger signs',
    method: 'Remote visual observation',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: false,
    valueType: 'select',
    options: ['No — moves spontaneously', 'Yes', 'Unable to assess'],
    guidance: 'Observe for at least one minute before deciding that the infant is not moving spontaneously.',
    protocolReference: 'IMCI young infant: movement only when stimulated',
  },

  // Breathing --------------------------------------------------------------
  {
    id: 'respiratory_rate',
    label: 'Respiratory rate',
    category: 'Breathing',
    method: 'Device measurement',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: true,
    unit: 'breaths/min',
    valueType: 'number',
    guidance: 'Count for a full minute while the infant is calm. Repeat if the first count is elevated. Record the count actually used.',
    protocolReference: 'IMCI young infant: fast breathing (≥60 breaths/min)',
  },
  {
    id: 'chest_indrawing',
    label: 'Severe chest indrawing',
    category: 'Breathing',
    method: 'Remote visual observation',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: true,
    valueType: 'select',
    options: ['Absent', 'Present', 'Unable to assess'],
    guidance: 'Requires a clear, adequately lit view of the lower chest. If the view is inadequate, record “Unable to assess”; do not record “Absent”.',
    protocolReference: 'IMCI young infant: severe chest indrawing',
  },
  {
    id: 'grunting',
    label: 'Grunting',
    category: 'Breathing',
    method: 'Remote visual observation',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: true,
    valueType: 'select',
    options: ['Absent', 'Present', 'Unable to assess'],
    guidance: 'Listen during the same observation period as the respiratory-rate count.',
    protocolReference: 'IMCI young infant: grunting',
  },
  {
    id: 'stridor',
    label: 'Stridor when calm',
    category: 'Breathing',
    method: 'Remote visual observation',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: false,
    valueType: 'select',
    options: ['Absent', 'Present', 'Unable to assess'],
    guidance: 'Listen while the infant is calm. Stridor only when crying is not the same finding.',
    protocolReference: 'IMCI young infant: stridor',
  },

  // Temperature ------------------------------------------------------------
  {
    id: 'axillary_temperature',
    label: 'Axillary temperature',
    category: 'Temperature',
    method: 'Device measurement',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: true,
    unit: '°C',
    valueType: 'number',
    guidance: 'Use a validated thermometer and record the unit. Note the device identifier and time; do not estimate by touch.',
    protocolReference: 'IMCI young infant: fever or low body temperature',
  },

  // Feeding and weight -----------------------------------------------------
  {
    id: 'weight',
    label: 'Weight',
    category: 'Feeding and weight',
    method: 'Device measurement',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: false,
    unit: 'kg',
    valueType: 'number',
    guidance: 'Use a calibrated infant scale. A weight without a validated age reference cannot be interpreted remotely.',
    protocolReference: 'IMCI young infant: weight for age / feeding problem',
  },
  {
    id: 'breastfeeding_status',
    label: 'Breastfeeding status',
    category: 'Feeding and weight',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: true,
    valueType: 'select',
    options: ['Exclusively breastfeeding', 'Mixed feeding', 'Not breastfeeding', 'Unable to determine'],
    guidance: 'Ask openly and without judgement; feeding practice is sensitive and may change day to day.',
    protocolReference: 'IMCI young infant: breastfeeding assessment',
  },
  {
    id: 'feeding_change',
    label: 'Change in feeding in the last 24 hours',
    category: 'Feeding and weight',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: true,
    valueType: 'select',
    options: ['No change', 'Less than usual', 'Much less or stopped', 'Unable to determine'],
    guidance: 'Record what the caregiver says, not an inference from the infant’s appearance.',
    protocolReference: 'IMCI young infant: feeding problem',
  },

  // Jaundice ---------------------------------------------------------------
  {
    id: 'jaundice_present',
    label: 'Jaundice (yellow eyes or skin)',
    category: 'Jaundice',
    method: 'Remote visual observation',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: true,
    valueType: 'select',
    options: ['No', 'Yes — face only', 'Yes — chest or abdomen', 'Yes — palms or soles', 'Unable to assess'],
    guidance: 'Use natural light where possible. A camera or screen may alter colour; record the method and quality.',
    protocolReference: 'IMCI young infant: jaundice',
  },
  {
    id: 'jaundice_onset_day',
    label: 'Day jaundice first appeared',
    category: 'Jaundice',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: true,
    unit: 'day of life',
    valueType: 'number',
    guidance: 'Onset within the first 24 hours is a danger sign and requires urgent in-person assessment.',
    protocolReference: 'IMCI young infant: jaundice onset',
  },
  {
    id: 'jaundice_palms_soles',
    label: 'Yellow palms or soles',
    category: 'Jaundice',
    method: 'Remote visual observation',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: true,
    valueType: 'select',
    options: ['No', 'Yes', 'Unable to assess'],
    guidance: 'If colour cannot be judged reliably on camera, record “Unable to assess” and arrange in-person review.',
    protocolReference: 'IMCI young infant: jaundice severity',
  },

  // Diarrhoea --------------------------------------------------------------
  {
    id: 'diarrhoea_present',
    label: 'Diarrhoea reported',
    category: 'Diarrhoea',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: true,
    valueType: 'select',
    options: ['No', 'Yes', 'Unable to determine'],
    guidance: 'Ask about stool frequency and consistency using everyday language.',
    protocolReference: 'IMCI young infant: diarrhoea',
  },
  {
    id: 'diarrhoea_duration',
    label: 'Duration of diarrhoea',
    category: 'Diarrhoea',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: false,
    unit: 'days',
    valueType: 'number',
    guidance: 'Record only when diarrhoea is reported.',
    protocolReference: 'IMCI young infant: diarrhoea duration',
  },
  {
    id: 'blood_in_stool',
    label: 'Blood in stool',
    category: 'Diarrhoea',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: true,
    valueType: 'select',
    options: ['No', 'Yes', 'Unable to determine'],
    guidance: 'Ask directly; do not rely on a photograph of a nappy for this finding.',
    protocolReference: 'IMCI young infant: bloody diarrhoea',
  },
  {
    id: 'sunken_eyes',
    label: 'Sunken eyes',
    category: 'Diarrhoea',
    method: 'Remote visual observation',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: true,
    valueType: 'select',
    options: ['No', 'Yes', 'Unable to assess'],
    guidance: 'Compare with the caregiver’s account of the infant’s normal appearance.',
    protocolReference: 'IMCI young infant: dehydration',
  },
  {
    id: 'skin_pinch',
    label: 'Skin pinch',
    category: 'Diarrhoea',
    method: 'Trained in-person assessment',
    remoteFeasibility: 'In person only',
    requiredForReview: false,
    valueType: 'select',
    options: ['Not assessed', 'Goes back immediately', 'Goes back slowly', 'Goes back very slowly'],
    guidance: 'Must be performed by a trained person. Do not ask an untrained caregiver to interpret a skin pinch for remote classification.',
    protocolReference: 'IMCI young infant: dehydration',
  },

  // Skin, umbilicus and ear -----------------------------------------------
  {
    id: 'umbilical_infection',
    label: 'Umbilicus red or draining pus',
    category: 'Skin, umbilicus and ear',
    method: 'Remote visual observation',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: true,
    valueType: 'select',
    options: ['No', 'Yes — redness', 'Yes — pus', 'Unable to assess'],
    guidance: 'Requires a clear view and consent. Record image quality if a photograph is used.',
    protocolReference: 'IMCI young infant: local bacterial infection',
  },
  {
    id: 'skin_pustules',
    label: 'Skin pustules',
    category: 'Skin, umbilicus and ear',
    method: 'Remote visual observation',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: true,
    valueType: 'select',
    options: ['No', 'Yes — few', 'Yes — many or extensive', 'Unable to assess'],
    guidance: 'Remote assessment may under-count lesions; note the limitation.',
    protocolReference: 'IMCI young infant: local bacterial infection',
  },
  {
    id: 'ear_discharge',
    label: 'Pus draining from the ear',
    category: 'Skin, umbilicus and ear',
    method: 'Remote visual observation',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: true,
    valueType: 'select',
    options: ['No', 'Yes', 'Unable to assess'],
    guidance: 'Do not insert anything into the ear canal.',
    protocolReference: 'IMCI young infant: ear infection',
  },
  {
    id: 'bulging_fontanelle',
    label: 'Bulging fontanelle',
    category: 'Skin, umbilicus and ear',
    method: 'Trained in-person assessment',
    remoteFeasibility: 'In person only',
    requiredForReview: false,
    valueType: 'select',
    options: ['Not assessed', 'No', 'Yes', 'Unable to assess'],
    guidance: 'Requires palpation by a trained health worker; never coach a caregiver to press on the fontanelle.',
    protocolReference: 'IMCI young infant: very severe disease',
  },
  {
    id: 'oral_thrush',
    label: 'Oral thrush',
    category: 'Skin, umbilicus and ear',
    method: 'Remote visual observation',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: false,
    valueType: 'select',
    options: ['No', 'Yes', 'Unable to assess'],
    guidance: 'Requires a clear view of the mouth; poor image quality should be recorded as unable to assess.',
    protocolReference: 'IMCI young infant: HIV-related conditions',
  },

  // HIV and infant feeding -------------------------------------------------
  {
    id: 'maternal_hiv_status',
    label: 'Maternal HIV status known to the service',
    category: 'HIV and infant feeding',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: false,
    valueType: 'select',
    options: ['Not assessed', 'Known — on treatment', 'Known — not on treatment', 'Unknown', 'Declined to answer'],
    guidance: 'Highly sensitive. Collect only where the local protocol includes HIV assessment and consent covers it.',
    protocolReference: 'IMCI young infant: HIV infection',
  },
  {
    id: 'infant_hiv_test',
    label: 'Infant HIV test status',
    category: 'HIV and infant feeding',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: false,
    valueType: 'select',
    options: ['Not assessed', 'Tested — result available', 'Tested — result not available', 'Not tested', 'Unknown'],
    guidance: 'Do not record a result the caregiver cannot reliably state.',
    protocolReference: 'IMCI young infant: HIV testing',
  },

  // Other ------------------------------------------------------------------
  {
    id: 'immunisation_status',
    label: 'Immunisation status',
    category: 'Other',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: false,
    valueType: 'select',
    options: ['Not assessed', 'Up to date for age', 'Behind for age', 'Unknown'],
    guidance: 'Use the national schedule and the child’s record where available.',
    protocolReference: 'IMCI young infant: immunisation',
  },
  {
    id: 'other_problem',
    label: 'Other concern reported by the caregiver',
    category: 'Other',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: false,
    valueType: 'text',
    guidance: 'Record the caregiver’s own words. Do not translate this into a diagnosis.',
    protocolReference: 'IMCI young infant: other problems',
    
  },
];

export type ObservationTraceabilityStatus =
  | 'Exact chart citation pending'
  | 'Citation entered — review pending'
  | 'Citation/source check needed'
  | 'Citation reviewed';

export const getObservationTraceabilityStatus = (
  definition: ObservationDefinition,
  sources: ProtocolSource[],
): ObservationTraceabilityStatus => {
  const citations = definition.protocolCitations ?? [];

  if (citations.length === 0) {
    return 'Exact chart citation pending';
  }

  if (validateProtocolCitations(citations, sources).length > 0) {
    return 'Citation/source check needed';
  }

  const allReviewed = citations.every(
    (citation) => citation.reviewedBy && citation.reviewedAt,
  );

  return allReviewed
    ? 'Citation reviewed'
    : 'Citation entered — review pending';
};

export const OBSERVATION_BY_ID = new Map(
  OBSERVATION_CATALOGUE.map((d) => {
    if (!d.acquisition) {
      d.acquisition = defaultAcquisitionFor(d);
    }
    return [d.id, d];
  }),
);

export const OBSERVATION_CATEGORIES: ObservationCategory[] = [
  'Danger signs',
  'Breathing',
  'Temperature',
  'Feeding and weight',
  'Jaundice',
  'Diarrhoea',
  'Skin, umbilicus and ear',
  'HIV and infant feeding',
  'Other',
];

// ---------------------------------------------------------------------------
// Maternal observation catalogue (proposed — clinical partner must ratify)
// ---------------------------------------------------------------------------

export type MaternalCategory =
  | 'Postpartum danger signs'
  | 'Breastfeeding support'
  | 'Mental health and wellbeing'
  | 'Nutrition and food security'
  | 'HIV and treatment'
  | 'Other';

/** Same shape as ObservationDefinition but with maternal categories. */
export interface MaternalObservationDefinition extends Omit<ObservationDefinition, 'category'> {
  category: MaternalCategory;
}

/**
 * A PROPOSED maternal observation catalogue. This is not a clinical protocol.
 * It is the product team's working map of the maternal observations a
 * physician-supervised service might collect alongside the infant assessment,
 * and must be ratified by the clinical partner against the locally approved
 * maternal health guidance before any pilot use.
 */
export const MATERNAL_OBSERVATION_CATALOGUE: MaternalObservationDefinition[] = [
  {
    id: 'pph_bleeding',
    label: 'Heavy vaginal bleeding after birth',
    category: 'Postpartum danger signs',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: true,
    valueType: 'select',
    options: ['No', 'Yes — heavy bleeding now', 'Yes — stopped', 'Unable to determine'],
    guidance: 'Ask directly. Heavy bleeding is an emergency; escalate immediately without waiting for AI or a flight.',
    protocolReference: 'Maternal postpartum haemorrhage — refer urgently',
  },
  {
    id: 'maternal_fever',
    label: 'Maternal fever in the last 24 hours',
    category: 'Postpartum danger signs',
    method: 'Device measurement',
    remoteFeasibility: 'Remote with trained assistant',
    requiredForReview: true,
    unit: '°C',
    valueType: 'number',
    guidance: 'Use a validated thermometer if available; otherwise record a caregiver-reported temperature with the correct quality flag.',
    protocolReference: 'Maternal sepsis — refer urgently if ≥38 °C',
  },
  {
    id: 'severe_headache_vision',
    label: 'Severe headache or visual disturbance',
    category: 'Postpartum danger signs',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: true,
    valueType: 'select',
    options: ['No', 'Yes', 'Unable to determine'],
    guidance: 'Possible pre-eclampsia/eclampsia. Escalate immediately if reported.',
    protocolReference: 'Maternal hypertension — refer urgently',
  },
  {
    id: 'breastfeeding_difficulty',
    label: 'Difficulty breastfeeding in the last 24 hours',
    category: 'Breastfeeding support',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: true,
    valueType: 'select',
    options: ['No', 'Yes — latch difficulty', 'Yes — pain', 'Yes — perceived low supply', 'Unable to determine'],
    guidance: 'Record the caregiver’s words. Feeding support should be offered without judgement.',
    protocolReference: 'Breastfeeding support — WHO/UNICEF',
  },
  {
    id: 'maternal_low_mood',
    label: 'Caregiver reports persistent low mood or anxiety',
    category: 'Mental health and wellbeing',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: false,
    valueType: 'select',
    options: ['Not assessed', 'No', 'Yes — recent onset', 'Yes — persistent', 'Declined to answer'],
    guidance: 'Sensitive. Ask only when the local protocol includes maternal wellbeing and consent covers it. Do not diagnose.',
    protocolReference: 'Maternal mental health screening — local protocol only',
  },
  {
    id: 'maternal_food_security',
    label: 'Household food insecurity reported',
    category: 'Nutrition and food security',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: false,
    valueType: 'select',
    options: ['Not assessed', 'No', 'Yes — some concern', 'Yes — severe', 'Declined to answer'],
    guidance: 'Record caregiver wording. Link to nutrition support if available.',
    protocolReference: 'Madagascar national nutrition plan — food security screening',
  },
  {
    id: 'maternal_hiv_engagement',
    label: 'Maternal HIV treatment engagement',
    category: 'HIV and treatment',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: false,
    valueType: 'select',
    options: ['Not assessed', 'On treatment', 'Not on treatment', 'Declined to answer'],
    guidance: 'Highly sensitive. Collect only where the local protocol includes HIV assessment and consent covers it.',
    protocolReference: 'PMTCT — national programme',
  },
  {
    id: 'maternal_other_concern',
    label: 'Other maternal concern',
    category: 'Other',
    method: 'Caregiver report',
    remoteFeasibility: 'Remote',
    requiredForReview: false,
    valueType: 'text',
    guidance: 'Record the caregiver’s own words. Do not translate into a diagnosis.',
    protocolReference: 'Maternal other problems',
  },
];

export const MATERNAL_OBSERVATION_BY_ID = new Map(
  MATERNAL_OBSERVATION_CATALOGUE.map((d) => [d.id, d]),
);

export const MATERNAL_CATEGORIES: MaternalCategory[] = [
  'Postpartum danger signs',
  'Breastfeeding support',
  'Mental health and wellbeing',
  'Nutrition and food security',
  'HIV and treatment',
  'Other',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive the source from the quality flag when the source is not explicitly
 * recorded. This keeps the two fields consistent: a value recorded as
 * "Measured — device" implies a device measurement; "Observed — remote"
 * implies a remote observation; anything else means the source is unavailable.
 */
export const deriveSource = (quality: ObservationQuality): ObservationSource => {
  switch (quality) {
    case 'Reported — unverified':
      return 'Caregiver report';
    case 'Measured — device':
      return 'Device measurement';
    case 'Observed — remote':
      return 'Remote observation';
    case 'Observed — in person':
      return 'In-person observation';
    default:
      return 'Unavailable';
  }
};

export const createEmptyObservations = (): Observation[] =>
  OBSERVATION_CATALOGUE.map((definition) => ({
    definitionId: definition.id,
    value: '',
    quality: 'Not assessed' as ObservationQuality,
    recordedAt: null,
    recordedBy: null,
  }));

export const createEmptyMaternalObservations = (): Observation[] =>
  MATERNAL_OBSERVATION_CATALOGUE.map((definition) => ({
    definitionId: definition.id,
    value: '',
    quality: 'Not assessed' as ObservationQuality,
    recordedAt: null,
    recordedBy: null,
  }));

export const observationsByCategory = (): Record<string, ObservationDefinition[]> => {
  const grouped: Record<string, ObservationDefinition[]> = {};
  for (const definition of OBSERVATION_CATALOGUE) {
    grouped[definition.category] = grouped[definition.category] ?? [];
    grouped[definition.category].push(definition);
  }
  return grouped;
};

export interface CompletenessSummary {
  requiredTotal: number;
  requiredAssessed: number;
  /** Required observations with a captured value explicitly marked unusable. */
  requiredUnreliable: number;
  /** Required observations that could not be obtained. */
  requiredUnavailable: number;
  /** Required observations without usable evidence. */
  requiredMissing: { id: string; label: string }[];
  allAssessed: number;
  allTotal: number;
  percentComplete: number;
}

const summarise = (
  observations: Observation[],
  required: { id: string; label: string; requiredForReview: boolean }[],
  allTotal: number,
): CompletenessSummary => {
  const byId = new Map(observations.map((o) => [o.definitionId, o]));
  const requiredMissing: { id: string; label: string }[] = [];
  let requiredAssessed = 0;
  let requiredUnreliable = 0;
  let requiredUnavailable = 0;

  for (const definition of required) {
    if (!definition.requiredForReview) continue;

    const observation = byId.get(definition.id);

    if (!observation || !isUsableObservation(observation)) {
      requiredMissing.push({ id: definition.id, label: definition.label });

      if (observation?.quality === 'Unusable') requiredUnreliable += 1;
      if (observation?.quality === 'Unavailable') requiredUnavailable += 1;
      continue;
    }

    requiredAssessed += 1;
  }

  const allAssessed = observations.filter(isUsableObservation).length;
  const requiredTotal = required.filter((d) => d.requiredForReview).length;

  return {
    requiredTotal,
    requiredAssessed,
    requiredUnreliable,
    requiredUnavailable,
    requiredMissing,
    allAssessed,
    allTotal,
    percentComplete:
      requiredTotal === 0 ? 100 : Math.round((requiredAssessed / requiredTotal) * 100),
  };
};

export const summariseCompleteness = (observations: Observation[]): CompletenessSummary =>
  summarise(observations, OBSERVATION_CATALOGUE, OBSERVATION_CATALOGUE.length);

export const summariseMaternalCompleteness = (observations: Observation[]): CompletenessSummary =>
  summarise(observations, MATERNAL_OBSERVATION_CATALOGUE, MATERNAL_OBSERVATION_CATALOGUE.length);

/** Stable, non-reversible fingerprint of the evidence used for a draft or signature. */
export const fingerprintObservations = (observations: Observation[]): string => {
  const canonical = observations
    .filter((o) => o.quality !== 'Not assessed')
    .map(
      (o) =>
        `${o.definitionId}=${o.value}|${o.quality}|${o.source ?? deriveSource(o.quality)}|${(o.evidenceIds ?? []).slice().sort().join(',')}|${o.evidenceRef ?? ''}|${o.confirmedAt ?? ''}`,
    )
    .sort()
    .join(';');
  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `ev-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};
