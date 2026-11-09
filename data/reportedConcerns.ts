import { OBSERVATION_BY_ID } from './observations';

/**
 * Proposed concern-to-observation navigation for the demonstration.
 * This is not a diagnosis or classification engine. The map must be reviewed
 * against Madagascar's current approved PCIMNE/IMCI chart before clinical use.
 */
export interface ReportedConcernOption {
  id: string;
  label: string;
  aliases: string[];
  observationIds: string[];
  urgentCareCue?: boolean;
  sameDayReviewCue?: boolean;
}

export const REPORTED_CONCERN_OPTIONS: ReportedConcernOption[] = [
  {
    id: 'convulsions',
    label: 'Convulsions or fits',
    aliases: ['convulsion', 'seizure', 'fit'],
    observationIds: ['convulsions', 'lethargy'],
    urgentCareCue: true,
  },
  {
    id: 'feeding_difficulty',
    label: 'Unable to feed or feeding much less than usual',
    aliases: ['poor feeding', 'feeding poorly', 'feeding concern', 'not feeding'],
    observationIds: ['feeding_poorly', 'feeding_change', 'breastfeeding_status', 'weight'],
    urgentCareCue: true,
  },
  {
    id: 'vomits_everything',
    label: 'Vomits everything or cannot keep feeds down',
    aliases: ['vomiting everything', 'vomits everything', 'vomiting'],
    observationIds: ['vomits_everything', 'feeding_change'],
    urgentCareCue: true,
  },
  {
    id: 'reduced_activity',
    label: 'Very sleepy, difficult to wake, or moving less than usual',
    aliases: ['lethargy', 'difficult to wake', 'sleepy', 'no movement'],
    observationIds: ['lethargy', 'movement_only_when_stimulated'],
    urgentCareCue: true,
  },
  {
    id: 'breathing_difficulty',
    label: 'Fast or difficult breathing, chest indrawing, or grunting',
    aliases: ['cough', 'fast breathing', 'difficulty breathing', 'breathing difficulty', 'grunting'],
    observationIds: ['respiratory_rate', 'chest_indrawing', 'grunting', 'stridor'],
    urgentCareCue: true,
  },
  {
    id: 'temperature_concern',
    label: 'Feels very hot or unusually cold',
    aliases: ['fever', 'hot', 'cold', 'low temperature'],
    observationIds: ['axillary_temperature', 'lethargy'],
    sameDayReviewCue: true,
  },
  {
    id: 'jaundice',
    label: 'Yellow eyes or skin',
    aliases: ['jaundice', 'yellow skin', 'yellow eyes'],
    observationIds: ['jaundice_present', 'jaundice_onset_day', 'jaundice_palms_soles'],
  },
  {
    id: 'yellow_palms_soles',
    label: 'Yellow palms or soles',
    aliases: ['yellow palms', 'yellow soles'],
    observationIds: ['jaundice_present', 'jaundice_onset_day', 'jaundice_palms_soles'],
    urgentCareCue: true,
  },
  {
    id: 'diarrhoea',
    label: 'Diarrhoea',
    aliases: ['diarrhea', 'diarrhoea'],
    observationIds: ['diarrhoea_present', 'diarrhoea_duration', 'blood_in_stool', 'sunken_eyes', 'skin_pinch'],
  },
  {
    id: 'umbilical_concern',
    label: 'Umbilicus is red or has pus',
    aliases: ['umbilicus redness', 'umbilical redness', 'pus from umbilicus', 'umbilical infection'],
    observationIds: ['umbilical_infection', 'axillary_temperature'],
    sameDayReviewCue: true,
  },
  {
    id: 'skin_pustules',
    label: 'Skin pustules or sores',
    aliases: ['skin pustules', 'pustules', 'skin sores'],
    observationIds: ['skin_pustules', 'axillary_temperature'],
  },
  {
    id: 'other',
    label: 'Other concern (describe below)',
    aliases: [],
    observationIds: ['other_problem'],
  },
];

const normalize = (value: string): string => value.trim().toLocaleLowerCase();

export const concernMatches = (reported: string, option: ReportedConcernOption): boolean => {
  const value = normalize(reported);
  return value === normalize(option.label) || value === option.id || option.aliases.some((alias) =>
    value === normalize(alias) || value.includes(normalize(alias)),
  );
};

export interface ConcernRecommendations {
  matched: ReportedConcernOption[];
  prioritizedObservationIds: string[];
  urgentCareCue: boolean;
  sameDayReviewCue: boolean;
}

export const getConcernRecommendations = (reportedConcerns: string[]): ConcernRecommendations => {
  const matched = REPORTED_CONCERN_OPTIONS.filter((option) =>
    reportedConcerns.some((reported) => concernMatches(reported, option)),
  );
  const baselineDangerIds = ['convulsions', 'feeding_poorly', 'vomits_everything', 'lethargy'];
  const prioritizedObservationIds = [...new Set([
    ...baselineDangerIds,
    ...matched.flatMap((option) => option.observationIds),
  ])].filter((id) => OBSERVATION_BY_ID.has(id));

  return {
    matched,
    prioritizedObservationIds,
    urgentCareCue: matched.some((option) => option.urgentCareCue),
    sameDayReviewCue: matched.some((option) => option.sameDayReviewCue),
  };
};

export const isReportedConcernUrgent = (reportedConcerns: string[]): boolean =>
  getConcernRecommendations(reportedConcerns).urgentCareCue;
