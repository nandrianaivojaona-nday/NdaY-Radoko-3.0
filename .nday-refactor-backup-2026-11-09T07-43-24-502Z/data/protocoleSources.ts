import { ProtocolRuleCitation, ProtocolSource } from '../types';

export const validateProtocolCitations = (
    citations: ProtocolRuleCitation[],
    sources: ProtocolSource[],
  ): string[] => {
    const issues: string[] = [];
  
    for (const citation of citations) {
      const source = sources.find((item) => item.id === citation.sourceId);
  
      if (!source) {
        issues.push(`Unknown source ID: ${citation.sourceId}`);
        continue;
      }
  
      if (source.role !== 'National clinical source') {
        issues.push(`${citation.sourceId} is not a national clinical source.`);
      }
  
      if (source.verification !== 'Document reviewed') {
        issues.push(`${citation.sourceId} has not been verified as a reviewed document.`);
      }
  
      if (!citation.ruleId.trim() || !source.rules.includes(citation.ruleId)) {
        issues.push(`Rule ${citation.ruleId || '(missing)'} is not mapped to ${citation.sourceId}.`);
      }
  
      if (!citation.section.trim()) {
        issues.push(`Section is missing for ${citation.sourceId}.`);
      }
  
      if (!Number.isInteger(citation.page) || citation.page < 1) {
        issues.push(`Page number is invalid for ${citation.sourceId}.`);
      }
  
      if (Boolean(citation.reviewedBy) !== Boolean(citation.reviewedAt)) {
        issues.push(`Reviewer and review date must both be present, or both absent, for ${citation.sourceId}.`);
      }
    }
  
    return issues;
  };
export const getSourceById = (
    sources: ProtocolSource[],
    sourceId: string,
  ): ProtocolSource | undefined =>
    sources.find((source) => source.id === sourceId);
  

export const MADAGASCAR_YOUNG_INFANT_SOURCES: ProtocolSource[] = [
  {
    id: 'MG-PCIMNE-ACCESS-VALIDATION',
    role: 'National validation event',
    title: 'PCIMNE young-infant protocol validation workshop',
    organisation: 'Madagascar Ministry of Public Health',
    version: null,
    date: null,
    verification: 'Reported — document pending',
    notes:
      'Reported by the project owner as Ministry-led and ACCESS-funded at Lion d’Or, Anosy Avaratra. Workshop record and validated chart copy are still needed to identify the approved edition and map its rules.',
    rules: [],
  },
  {
    id: 'NDAY-RADOKO-PITCH-V1-2',
    role: 'Historical clue',
    title: "Pitch 2 mn preparation version 1.2",
    organisation: "NdaY’Radoko project",
    version: '1.2',
    date: null,
    verification: 'Document reviewed',
    notes:
      'Refers to a young-infant chart booklet and lists assessment signs. It helps identify the chart family, but does not name or approve an edition.',
    rules: [],
  },
  {
    id: 'WHO-IMCI-SYI-2019',
    role: 'WHO comparator',
    title: 'Management of the sick young infant aged up to 2 months: IMCI chart booklet',
    organisation: 'WHO',
    version: '2019',
    date: '2019-07-22',
    url: 'https://www.who.int/publications/i/item/9789241516365',
    verification: 'Comparator only',
    notes:
      'International comparator. Do not label this as the Madagascar-adopted chart without evidence of national adoption.',
    rules: [],
  },
];

/** International reference set used as the prototype default, not as Madagascar policy. */
export const WHO_UNICEF_YOUNG_INFANT_SOURCES: ProtocolSource[] = [
  {
    id: 'WHO-UNICEF-SYI-2019',
    role: 'WHO comparator',
    title: 'Management of the sick young infant aged up to 2 months: IMCI chart booklet',
    organisation: 'World Health Organization and UNICEF',
    version: '2019',
    date: '2019-07-22',
    url: 'https://www.who.int/publications/i/item/9789241516365',
    verification: 'Comparator only',
    notes: 'WHO states this 2019 young-infant update supersedes the 2014 chart. This remains the global assessment/classification chart reference; it is not evidence of Madagascar national adoption.',
    rules: ['SYI-2019-VERY-SEVERE-DISEASE', 'SYI-2019-LOCAL-BACTERIAL-INFECTION', 'SYI-2019-SEVERE-DISEASE-UNLIKELY', 'SYI-2019-SEVERE-JAUNDICE', 'SYI-2019-JAUNDICE', 'SYI-2019-NO-JAUNDICE', 'SYI-2019-SEVERE-DEHYDRATION', 'SYI-2019-SOME-DEHYDRATION', 'SYI-2019-NO-DEHYDRATION', 'SYI-2019-FEEDING-PROBLEM-LOW-WEIGHT', 'SYI-2019-NO-FEEDING-PROBLEM'],
  },
  {
    id: 'WHO-SBI-0-59-2024',
    role: 'WHO comparator',
    title: 'WHO recommendations for management of serious bacterial infections in infants aged 0–59 days',
    organisation: 'World Health Organization',
    version: '2024',
    date: '2024-12-08',
    url: 'https://www.who.int/publications/i/item/9789240102903',
    verification: 'Comparator only',
    notes: 'WHO 2024 SBI definitions supplement, but do not replace the 2019 chart booklet. The fever threshold and age scope for fast breathing differ; keep source pathways distinct pending qualified reconciliation and local approval.',
    rules: ['SBI-2024-PSBI-7-SIGN', 'SBI-2024-CRITICAL-ILLNESS', 'SBI-2024-CLINICAL-SEVERE-INFECTION'],
  },
  {
    id: 'WHO-IYCF-MODEL-2025',
    role: 'WHO comparator',
    title: 'Infant and young child feeding: model chapter for textbooks for medical students and allied health professionals, second edition',
    organisation: 'World Health Organization',
    version: '2025',
    date: '2025-09-24',
    url: 'https://www.who.int/publications/i/item/9789240113732',
    verification: 'Comparator only',
    notes: 'Updated infant-feeding/nutrition reference to supplement feeding assessment and counselling. It does not replace IMCI illness classifications or treatment charts.',
    rules: [],
  },
  {
    id: 'UNICEF-EARLY-CHILD-NUTRITION',
    role: 'WHO comparator',
    title: 'Early childhood nutrition',
    organisation: 'UNICEF',
    version: null,
    date: null,
    url: 'https://www.unicef.org/nutrition/early-childhood-nutrition',
    verification: 'Comparator only',
    notes: 'UNICEF nutrition resource describing WHO/UNICEF infant-feeding recommendations; counselling reference only, not a clinical classification chart.',
    rules: [],
  },
];
