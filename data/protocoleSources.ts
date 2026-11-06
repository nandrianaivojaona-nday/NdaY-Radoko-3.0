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