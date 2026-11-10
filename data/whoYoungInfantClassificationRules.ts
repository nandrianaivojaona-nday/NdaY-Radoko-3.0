import { ProtocolClassificationRule } from '../types';

/**
 * Source-mapped WHO/UNICEF 2019 chart classes for a non-clinical demonstrator.
 * Display swatches approximate the chart colour families; they are not sampled
 * pixel values. These entries are not Madagascar policy or clinically approved.
 */
export const WHO_YOUNG_INFANT_CLASSIFICATION_RULES: ProtocolClassificationRule[] = [
  {
    id: 'WHO-SYI-2019-VERY-SEVERE-DISEASE',
    label: 'VERY SEVERE DISEASE',
    chartColourLabel: 'Pink',
    chartColourHex: '#F2B8C0',
    criteriaSummary: 'Any one: not feeding well; convulsions; fast breathing ≥60/min; severe chest indrawing; axillary temperature ≥37.5°C; axillary temperature <35.5°C; movement only when stimulated or no movement. WHO 2024 SBI definitions differ; see the reconciliation notice.',
      criteria: { match: 'any', checks: [
    { observationId: 'feeding_poorly', description: 'Not feeding well', operator: 'in', value: ['Yes — less than usual', 'Yes — not feeding at all'] },
    { observationId: 'convulsions', description: 'Convulsions', operator: 'in', value: ['Yes — during this illness', 'Yes — now'] },
    { observationId: 'respiratory_rate', description: 'RR >= 60/min', operator: 'greaterOrEqual', value: 60 },
    { observationId: 'chest_indrawing', description: 'Chest indrawing', operator: 'equals', value: 'Present' },
    { observationId: 'axillary_temperature', description: 'Temp >= 37.5 C', operator: 'greaterOrEqual', value: 37.5 },
    { observationId: 'axillary_temperature', description: 'Temp < 35.5 C', operator: 'less', value: 35.5 },
    { observationId: 'movement_only_when_stimulated', description: 'Movement only when stimulated', operator: 'equals', value: 'Yes' },
  ] },
actions: [
      { id: 'who-syi-vsd-referral', label: 'Refer urgently to hospital', detail: 'Use the receiving facility and transport pathway; the chart specifies urgent referral.', category: 'Referral' },
      { id: 'who-syi-vsd-pre-referral', label: 'Pre-referral care', detail: 'The chart lists first-dose intramuscular antibiotics, prevention of low blood sugar, and keeping the infant warm during transport. Use only after local clinical review.', category: 'Treatment' },
      { id: 'who-syi-vsd-counselling', label: 'Explain urgent referral and warmth during transport', detail: 'Counsel the mother/caregiver on keeping the infant warm on the way to hospital.', category: 'Counselling' },
    ],
    citations: [{ sourceId: 'WHO-UNICEF-SYI-2019', ruleId: 'SYI-2019-VERY-SEVERE-DISEASE', section: 'Check for very severe disease and local bacterial infection', page: 41, tableOrStep: 'Assessment, classification and treatment table' }],
  },
  {
    id: 'WHO-SYI-2019-LOCAL-BACTERIAL-INFECTION',
    label: 'LOCAL BACTERIAL INFECTION',
    chartColourLabel: 'Yellow',
    chartColourHex: '#F4DE79',
    criteriaSummary: 'Umbilicus red or draining pus, or skin pustules. This class may coexist with other applicable classes; assess all relevant boxes.',
      criteria: { match: 'any', checks: [
    { observationId: 'umbilical_infection', description: 'Umbilicus red or pus', operator: 'in', value: ['Yes — redness', 'Yes — pus'] },
    { observationId: 'skin_pustules', description: 'Skin pustules', operator: 'in', value: ['Yes — few', 'Yes — many or extensive'] },
  ] },
actions: [
      { id: 'who-syi-lbi-treatment', label: 'Local-infection treatment', detail: 'The chart specifies an appropriate oral antibiotic and home treatment teaching; exact prescribing must follow approved local guidance.', category: 'Treatment' },
      { id: 'who-syi-lbi-home', label: 'Teach home care', detail: 'Teach the mother/caregiver how to treat local infection at home and give young-infant home care.', category: 'Counselling' },
      { id: 'who-syi-lbi-followup', label: 'Follow up in 2 days', detail: 'Reassess the local infection and escalate if worse or danger signs appear.', category: 'Follow-up' },
    ],
    citations: [{ sourceId: 'WHO-UNICEF-SYI-2019', ruleId: 'SYI-2019-LOCAL-BACTERIAL-INFECTION', section: 'Check for very severe disease and local bacterial infection', page: 41, tableOrStep: 'Assessment, classification and treatment table' }],
  },
  {
    id: 'WHO-SYI-2019-SEVERE-DISEASE-UNLIKELY',
    label: 'SEVERE DISEASE OR LOCAL INFECTION UNLIKELY',
    chartColourLabel: 'Green',
    chartColourHex: '#B8DDB6',
    criteriaSummary: 'None of the very-severe-disease signs and none of the local-bacterial-infection signs, after those items have been assessed.',
      criteria: { match: 'all', checks: [
    { observationId: 'feeding_poorly', description: 'Feeding not poor', operator: 'notIn', value: ['Yes — less than usual', 'Yes — not feeding at all'] },
    { observationId: 'convulsions', description: 'No convulsions', operator: 'notIn', value: ['Yes — during this illness', 'Yes — now'] },
    { observationId: 'respiratory_rate', description: 'RR < 60/min', operator: 'less', value: 60 },
    { observationId: 'chest_indrawing', description: 'No chest indrawing', operator: 'notEquals', value: 'Present' },
    { observationId: 'axillary_temperature', description: 'Temp < 37.5 C', operator: 'less', value: 37.5 },
    { observationId: 'axillary_temperature', description: 'Temp >= 35.5 C', operator: 'greaterOrEqual', value: 35.5 },
    { observationId: 'movement_only_when_stimulated', description: 'Moves spontaneously', operator: 'notEquals', value: 'Yes' },
    { observationId: 'umbilical_infection', description: 'No umbilical redness', operator: 'notIn', value: ['Yes — redness', 'Yes — pus'] },
    { observationId: 'skin_pustules', description: 'No skin pustules', operator: 'notIn', value: ['Yes — few', 'Yes — many or extensive'] },
  ] },
actions: [{ id: 'who-syi-no-infection-home', label: 'Advise young-infant home care', detail: 'This class requires completed assessment of the relevant signs; missing or unusable findings are not negative findings.', category: 'Counselling' }],
    citations: [{ sourceId: 'WHO-UNICEF-SYI-2019', ruleId: 'SYI-2019-SEVERE-DISEASE-UNLIKELY', section: 'Check for very severe disease and local bacterial infection', page: 41, tableOrStep: 'Assessment, classification and treatment table' }],
  },
  {
    id: 'WHO-SYI-2019-SEVERE-JAUNDICE',
    label: 'SEVERE JAUNDICE',
    chartColourLabel: 'Pink', chartColourHex: '#F2B8C0',
    criteriaSummary: 'Any jaundice when age is under 24 hours, or yellow palms and soles at any age.',
      criteria: { match: 'any', checks: [
    { observationId: 'jaundice_onset_day', description: 'Jaundice within 24h', operator: 'lessOrEqual', value: 0 },
    { observationId: 'jaundice_palms_soles', description: 'Yellow palms/soles', operator: 'equals', value: 'Yes' },
  ] },
actions: [
      { id: 'who-syi-severe-jaundice-referral', label: 'Refer urgently to hospital', detail: 'Use the local referral pathway.', category: 'Referral' },
      { id: 'who-syi-severe-jaundice-care', label: 'Pre-referral care', detail: 'The chart specifies prevention of low blood sugar and warmth during transport; use only after local clinical review.', category: 'Treatment' },
    ],
    citations: [{ sourceId: 'WHO-UNICEF-SYI-2019', ruleId: 'SYI-2019-SEVERE-JAUNDICE', section: 'Check for jaundice', page: 42, tableOrStep: 'Classify jaundice table' }],
  },
  {
    id: 'WHO-SYI-2019-JAUNDICE',
    label: 'JAUNDICE', chartColourLabel: 'Yellow', chartColourHex: '#F4DE79',
    criteriaSummary: 'Jaundice appearing after 24 hours and palms/soles not yellow.',
      criteria: { match: 'all', checks: [
    { observationId: 'jaundice_present', description: 'Jaundice present', operator: 'notEquals', value: 'No' },
    { observationId: 'jaundice_onset_day', description: 'After 24h', operator: 'greaterOrEqual', value: 1 },
    { observationId: 'jaundice_palms_soles', description: 'Palms/soles not yellow', operator: 'notEquals', value: 'Yes' },
  ] },
actions: [
      { id: 'who-syi-jaundice-home', label: 'Advise young-infant home care', detail: 'Advise immediate return if palms or soles become yellow.', category: 'Counselling' },
      { id: 'who-syi-jaundice-over-14', label: 'Refer if older than 14 days', detail: 'The chart specifies hospital assessment for jaundice persisting beyond 14 days.', category: 'Referral' },
      { id: 'who-syi-jaundice-followup', label: 'Follow up in 1 day', detail: 'Reassess jaundice and danger signs.', category: 'Follow-up' },
    ],
    citations: [{ sourceId: 'WHO-UNICEF-SYI-2019', ruleId: 'SYI-2019-JAUNDICE', section: 'Check for jaundice', page: 42, tableOrStep: 'Classify jaundice table' }],
  },
  {
    id: 'WHO-SYI-2019-NO-JAUNDICE',
    label: 'NO JAUNDICE', chartColourLabel: 'Green', chartColourHex: '#B8DDB6',
    criteriaSummary: 'No jaundice identified after assessment.',
      criteria: { match: 'all', checks: [
    { observationId: 'jaundice_present', description: 'No jaundice', operator: 'equals', value: 'No' },
  ] },
actions: [{ id: 'who-syi-no-jaundice-home', label: 'Advise young-infant home care', detail: '', category: 'Counselling' }],
    citations: [{ sourceId: 'WHO-UNICEF-SYI-2019', ruleId: 'SYI-2019-NO-JAUNDICE', section: 'Check for jaundice', page: 42, tableOrStep: 'Classify jaundice table' }],
  },
  {
    id: 'WHO-SYI-2019-SEVERE-DEHYDRATION',
    label: 'SEVERE DEHYDRATION', chartColourLabel: 'Pink', chartColourHex: '#F2B8C0',
    criteriaSummary: 'At least two: movement only when stimulated/no movement; sunken eyes; skin pinch returns very slowly (>2 seconds). Apply only when diarrhoea is present.',
      criteria: { match: 'count', countThreshold: 2, checks: [
    { observationId: 'movement_only_when_stimulated', description: 'Movement only when stimulated', operator: 'equals', value: 'Yes' },
    { observationId: 'sunken_eyes', description: 'Sunken eyes', operator: 'equals', value: 'Yes' },
    { observationId: 'skin_pinch', description: 'Very slow skin pinch', operator: 'equals', value: 'Goes back very slowly' },
  ] },
actions: [
      { id: 'who-syi-severe-dehydration-plan-c', label: 'Plan C or urgent referral', detail: 'The chart distinguishes infants with versus without another severe classification; local clinical review is required before selecting a pathway.', category: 'Treatment' },
      { id: 'who-syi-severe-dehydration-referral', label: 'Urgent referral when another severe class is present', detail: 'Continue breastfeeding and use the chart-directed referral pathway.', category: 'Referral' },
    ],
    citations: [{ sourceId: 'WHO-UNICEF-SYI-2019', ruleId: 'SYI-2019-SEVERE-DEHYDRATION', section: 'Assess and classify diarrhoea for dehydration', page: 42, tableOrStep: 'Dehydration classification table' }],
  },
  {
    id: 'WHO-SYI-2019-SOME-DEHYDRATION',
    label: 'SOME DEHYDRATION', chartColourLabel: 'Yellow', chartColourHex: '#F4DE79',
    criteriaSummary: 'At least two: restless/irritable; sunken eyes; skin pinch returns slowly. Apply only when diarrhoea is present.',
      criteria: { match: 'count', countThreshold: 2, checks: [
    { observationId: 'sunken_eyes', description: 'Sunken eyes', operator: 'equals', value: 'Yes' },
    { observationId: 'skin_pinch', description: 'Slow skin pinch', operator: 'in', value: ['Goes back slowly', 'Goes back very slowly'] },
  ] },
actions: [
      { id: 'who-syi-some-dehydration-plan-b', label: 'Plan B fluids and breastfeeding', detail: 'Use the chart and locally approved rehydration guidance.', category: 'Treatment' },
      { id: 'who-syi-some-dehydration-followup', label: 'Immediate-return advice and follow-up', detail: 'Follow up in 2 days if not improving; urgent referral if another severe classification is present.', category: 'Follow-up' },
    ],
    citations: [{ sourceId: 'WHO-UNICEF-SYI-2019', ruleId: 'SYI-2019-SOME-DEHYDRATION', section: 'Assess and classify diarrhoea for dehydration', page: 42, tableOrStep: 'Dehydration classification table' }],
  },
  {
    id: 'WHO-SYI-2019-NO-DEHYDRATION',
    label: 'NO DEHYDRATION', chartColourLabel: 'Green', chartColourHex: '#B8DDB6',
    criteriaSummary: 'Not enough signs to classify as some or severe dehydration. Apply only when diarrhoea is present and required signs are assessed.',
      criteria: { match: 'all', checks: [
    { observationId: 'movement_only_when_stimulated', description: 'Moves spontaneously', operator: 'notEquals', value: 'Yes' },
    { observationId: 'sunken_eyes', description: 'No sunken eyes', operator: 'notEquals', value: 'Yes' },
    { observationId: 'skin_pinch', description: 'Immediate skin pinch', operator: 'notIn', value: ['Goes back slowly', 'Goes back very slowly'] },
  ] },
actions: [{ id: 'who-syi-no-dehydration-home', label: 'Home fluids and continue breastfeeding', detail: 'Give return advice; follow up in 2 days if not improving.', category: 'Counselling' }],
    citations: [{ sourceId: 'WHO-UNICEF-SYI-2019', ruleId: 'SYI-2019-NO-DEHYDRATION', section: 'Assess and classify diarrhoea for dehydration', page: 42, tableOrStep: 'Dehydration classification table' }],
  },
  {
    id: 'WHO-SYI-2019-FEEDING-PROBLEM-LOW-WEIGHT',
    label: 'FEEDING PROBLEM OR LOW WEIGHT', chartColourLabel: 'Yellow', chartColourHex: '#F4DE79',
    criteriaSummary: 'Any: poor attachment; ineffective suckling; fewer than 8 breastfeeds/24 h; other foods/drinks; low weight for age; or oral thrush. Use the separate chart for HIV-exposed non-breastfed infants.',
      criteria: { match: 'any', checks: [
    { observationId: 'breastfeeding_status', description: 'Not exclusive BF', operator: 'notEquals', value: 'Exclusively breastfeeding' },
    { observationId: 'feeding_change', description: 'Feeding reduced', operator: 'in', value: ['Less than usual', 'Much less or stopped'] },
    { observationId: 'oral_thrush', description: 'Oral thrush', operator: 'equals', value: 'Yes' },
  ] },
actions: [
      { id: 'who-syi-feeding-assess', label: 'Provide feeding support', detail: 'Match counselling to the observed feeding issue; support positioning/attachment and effective feeding as appropriate.', category: 'Counselling' },
      { id: 'who-syi-feeding-followup', label: 'Arrange follow-up', detail: 'The chart specifies 2 days for feeding problem/thrush and 14 days for low weight for age.', category: 'Follow-up' },
    ],
    citations: [{ sourceId: 'WHO-UNICEF-SYI-2019', ruleId: 'SYI-2019-FEEDING-PROBLEM-LOW-WEIGHT', section: 'Check for feeding problem or low weight for age', page: 44, tableOrStep: 'Feeding classification table' }],
  },
  {
    id: 'WHO-SYI-2019-NO-FEEDING-PROBLEM',
    label: 'NO FEEDING PROBLEM', chartColourLabel: 'Green', chartColourHex: '#B8DDB6',
    criteriaSummary: 'Not low weight for age and no other signs of inadequate feeding, after the feeding assessment is completed.',
      criteria: { match: 'all', checks: [
    { observationId: 'breastfeeding_status', description: 'Exclusive BF', operator: 'equals', value: 'Exclusively breastfeeding' },
    { observationId: 'feeding_change', description: 'No change', operator: 'equals', value: 'No change' },
    { observationId: 'oral_thrush', description: 'No thrush', operator: 'notEquals', value: 'Yes' },
  ] },
actions: [{ id: 'who-syi-no-feeding-home', label: 'Advise home care and reinforce effective feeding', detail: 'Praise the mother/caregiver for feeding the infant well.', category: 'Counselling' }],
    citations: [{ sourceId: 'WHO-UNICEF-SYI-2019', ruleId: 'SYI-2019-NO-FEEDING-PROBLEM', section: 'Check for feeding problem or low weight for age', page: 44, tableOrStep: 'Feeding classification table' }],
  },
];
