// services/aiDraft.ts
import { AiDraft, Encounter, Language, Patient, ProtocolRecord } from '../types';
import {
  OBSERVATION_BY_ID, fingerprintObservations, isUsableObservation, summariseCompleteness,
} from '../data/observations';

export const LIVE_MODEL = 'gemini-2.5-flash';
export const FALLBACK_MODEL = 'Local deterministic template (simulated)';

export const languageName: Record<Language, string> = {
  en: 'English', fr: 'French', es: 'Spanish', de: 'German', mg: 'Malagasy',
};

export const observationLines = (e: Encounter): string => {
  const a = e.observations.filter((o) => o.quality !== 'Not assessed' && o.value.trim());
  if (a.length === 0) return 'No observations have been recorded.';
  return a.map((o) => {
    const d = OBSERVATION_BY_ID.get(o.definitionId);
    const u = d?.unit ? ` ${d.unit}` : '';
    return `- ${d?.label ?? o.definitionId}: ${o.value}${u} [${o.quality}]`;
  }).join('\n');
};

export const missingLines = (e: Encounter): string => {
  const s = summariseCompleteness(e.observations);
  if (s.requiredMissing.length === 0) return 'All required observations have usable evidence.';
  const byId = new Map(e.observations.map((o) => [o.definitionId, o]));
  return s.requiredMissing.map((d) => {
    const q = byId.get(d.id)?.quality ?? 'Not assessed';
    return `- ${d.label} [${q}]`;
  }).join('\n');
};

export const buildLocalDraft = (
  e: Encounter, p: Patient, protocol: ProtocolRecord | null,
  language: Language, extraLimitation?: string,
): AiDraft => {
  summariseCompleteness(e.observations);
  const dangerIds = ['convulsions', 'feeding_poorly', 'vomits_everything', 'lethargy'];
  const danger = e.observations
    .filter((o) => dangerIds.includes(o.definitionId) && isUsableObservation(o))
    .map((o) => `- ${OBSERVATION_BY_ID.get(o.definitionId)?.label}: ${o.value}`);
  const text = [
    'AI DOCUMENTATION DRAFT — NOT A DIAGNOSIS', '',
    '1. Reported observations', observationLines(e), '',
    '2. Danger signs explicitly reported',
    danger.length > 0 ? danger.join('\n') : 'Not established from the recorded observations.', '',
    '3. Information missing or unclear', missingLines(e), '',
    '4. Points for physician review',
    `- Patient: ${p.name}, ${p.ageLabel}; caregiver: ${p.caregiverName} (${p.caregiverRelationship}).`,
    `- Equipment mode: ${e.equipmentMode}.`,
    `- Consent recorded: ${e.consent.obtained ? 'yes' : 'no'}; image capture: ${e.consent.imageCaptureAllowed ? 'allowed' : 'not allowed'}.`,
    protocol
      ? `- Protocol reference: ${protocol.title} v${protocol.version} (${protocol.clinicalApproval}).`
      : '- No approved protocol version attached.',
    '- The physician must decide whether recorded evidence is sufficient.', '',
    '5. Limitations',
    'This draft was produced by a deterministic local template. It does not diagnose, classify, score, or recommend treatment. It is intended only to help a qualified physician review the recorded information.',
    ...(extraLimitation ? ['', extraLimitation] : []),
  ].join('\n');
  return {
    id: `DRAFT-${Date.now()}`, text, generatedAt: new Date().toISOString(),
    model: FALLBACK_MODEL, protocolId: protocol?.id ?? null,
    protocolVersion: protocol?.version ?? null,
    evidenceFingerprint: fingerprintObservations(e.observations), simulated: true,
    limitations: 'Simulated draft. No clinical validation. Must be reviewed and signed by a qualified physician before any action.',
  };
};
