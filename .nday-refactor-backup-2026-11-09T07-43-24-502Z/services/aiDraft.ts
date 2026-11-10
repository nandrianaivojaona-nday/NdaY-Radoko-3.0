import { GoogleGenAI } from '@google/genai';
import { AiDraft, Encounter, Language, Patient, ProtocolRecord, Mother } from '../types';
import {
  OBSERVATION_BY_ID,
  fingerprintObservations,
  isUsableObservation,
  summariseCompleteness,
} from '../data/observations';

export const LIVE_MODEL = 'gemini-2.5-pro';
export const FALLBACK_MODEL = 'Local deterministic template (simulated)';

/** The build injects GEMINI_API_KEY. Treat the shipped placeholder as “not configured”. */
export const isAiConfigured = (): boolean => {
  const key = process.env.API_KEY;
  return Boolean(key && key !== 'PLACEHOLDER_API_KEY' && key.length > 10);
};

const languageName: Record<Language, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  mg: 'Malagasy'
};

const observationLines = (encounter: Encounter): string => {
  const assessed = encounter.observations.filter((o) => o.quality !== 'Not assessed' && o.value.trim());
  if (assessed.length === 0) return 'No observations have been recorded.';
  return assessed
    .map((o) => {
      const definition = OBSERVATION_BY_ID.get(o.definitionId);
      const unit = definition?.unit ? ` ${definition.unit}` : '';
      return `- ${definition?.label ?? o.definitionId}: ${o.value}${unit} [${o.quality}]`;
    })
    .join('\n');
};

const missingLines = (encounter: Encounter): string => {
  const summary = summariseCompleteness(encounter.observations);

  if (summary.requiredMissing.length === 0) {
    return 'All required observations have usable evidence.';
  }

  const observationsById = new Map(
    encounter.observations.map((observation) => [observation.definitionId, observation]),
  );

  return summary.requiredMissing
    .map((definition) => {
      const quality = observationsById.get(definition.id)?.quality ?? 'Not assessed';
      return `- ${definition.label} [${quality}]`;
    })
    .join('\n');
};

const buildLocalDraft = (
  encounter: Encounter,
  patient: Patient,
  protocol: ProtocolRecord | null,
  language: Language,
): AiDraft => {
  const summary = summariseCompleteness(encounter.observations);
  const dangerIds = ['convulsions', 'feeding_poorly', 'vomits_everything', 'lethargy'];
  const danger = encounter.observations
  .filter((o) => dangerIds.includes(o.definitionId) && isUsableObservation(o))
  .map((o) => {
    const definition = OBSERVATION_BY_ID.get(o.definitionId);
    return `- ${definition?.label}: ${o.value}`;
  });

  const text = [
    'AI DOCUMENTATION DRAFT — NOT A DIAGNOSIS',
    '',
    '1. Reported observations',
    observationLines(encounter),
    '',
    '2. Danger signs explicitly reported',
    danger.length > 0 ? danger.join('\n') : 'Not established from the recorded observations.',
    '',
    '3. Information missing or unclear',
    missingLines(encounter),
    '',
    '4. Points for physician review',
    `- Patient: ${patient.name}, ${patient.ageLabel}; caregiver: ${patient.caregiverName} (${patient.caregiverRelationship}).`,
    `- Equipment mode: ${encounter.equipmentMode}.`,
    `- Consent recorded: ${encounter.consent.obtained ? 'yes' : 'no'}; image capture: ${encounter.consent.imageCaptureAllowed ? 'allowed' : 'not allowed'}.`,
    protocol
      ? `- Protocol reference: ${protocol.title} v${protocol.version} (${protocol.clinicalApproval}).`
      : '- No approved protocol version is attached to this encounter.',
    '- The physician must decide whether the recorded evidence is sufficient for a clinical decision.',
    '',
    '5. Limitations',
    'This draft was produced by a deterministic local template because no AI model is configured. It does not diagnose, classify, score, or recommend treatment. It is intended only to help a qualified physician review the recorded information.',
  ].join('\n');

  return {
    id: `DRAFT-${Date.now()}`,
    text,
    generatedAt: new Date().toISOString(),
    model: FALLBACK_MODEL,
    protocolId: protocol?.id ?? null,
    protocolVersion: protocol?.version ?? null,
    evidenceFingerprint: fingerprintObservations(encounter.observations),
    simulated: true,
    limitations:
      'Simulated draft. No clinical validation. Must be reviewed and signed by a qualified physician before any action.',
  };
};

const buildLiveDraft = async (
  encounter: Encounter,
  patient: Patient,
  protocol: ProtocolRecord | null,
  language: Language,
): Promise<AiDraft> => {
  const key = process.env.API_KEY;
  if (!key) throw new Error('No API key');
  const ai = new GoogleGenAI({ apiKey: key });
  const summary = summariseCompleteness(encounter.observations);

  const prompt = `You are preparing a documentation draft for a qualified physician who will make the clinical decision. You are NOT the clinician. Write in ${languageName[language]}.

Absolute rules:
- Do not diagnose, classify severity, assign a probability or confidence score, or recommend treatment.
- Use only the observations supplied. Never infer that an unasked question was answered.
- If a danger sign is explicitly recorded, flag it for urgent review; do not suggest waiting.
- If required observations are missing, list them and state that the physician must decide whether remote evidence is sufficient.
- Use exactly these sections:
  1. Reported observations
  2. Danger signs explicitly reported
  3. Information missing or unclear
  4. Points for physician review
  5. Limitations (AI-generated documentation draft; not a diagnosis)

Patient context (synthetic demo record):
- Name: ${patient.name}
- Age: ${patient.ageLabel}
- Caregiver: ${patient.caregiverName} (${patient.caregiverRelationship})
- Reported concerns: ${patient.reportedConcerns.join(', ') || 'none recorded'}

Protocol reference: ${protocol ? `${protocol.title} v${protocol.version}; approval: ${protocol.clinicalApproval}; source: ${protocol.sourceOrganisation}` : 'none attached'}

Recorded observations:
${observationLines(encounter)}

Required observations still missing:
${missingLines(encounter)}

Completeness: ${summary.requiredAssessed}/${summary.requiredTotal} required observations assessed.`;

  const response = await ai.models.generateContent({
    model: LIVE_MODEL,
    contents: prompt,
  });

  const text = response.text?.trim();
  if (!text) throw new Error('Empty model response');

  return {
    id: `DRAFT-${Date.now()}`,
    text,
    generatedAt: new Date().toISOString(),
    model: LIVE_MODEL,
    protocolId: protocol?.id ?? null,
    protocolVersion: protocol?.version ?? null,
    evidenceFingerprint: fingerprintObservations(encounter.observations),
    simulated: false,
    limitations:
      'AI-generated documentation draft. Not a diagnosis and not clinically validated. A qualified physician must review the evidence and sign the decision.',
  };
};

/**
 * Prepare the physician-facing draft. When no model is configured, or the model
 * call fails, a deterministic local template is used and clearly labelled as
 * simulated. The encounter never advances on the basis of this draft alone.
 */
export const prepareAiDraft = async (
  encounter: Encounter,
  patient: Patient,
  mother: Mother | null,
  protocol: ProtocolRecord | null,
  language: Language,
): Promise<AiDraft> => {
  if (!isAiConfigured()) {
    return buildLocalDraft(encounter, patient, protocol, language);
  }
  try {
    return await buildLiveDraft(encounter, patient, protocol, language);
  } catch (error) {
    console.error('AI draft failed; using simulated local template.', error);
    const fallback = buildLocalDraft(encounter, patient, protocol, language);
    return {
      ...fallback,
      limitations: `${fallback.limitations} The live model call failed in this environment, so a local template was used instead.`,
    };
  }
};
