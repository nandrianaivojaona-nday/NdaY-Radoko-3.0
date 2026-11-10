// server/aiDraftServer.ts
import { GoogleGenAI } from '@google/genai';
import {
  AiDraft,
  Encounter,
  Language,
  Mother,
  Observation,
  Patient,
  ProtocolRecord,
} from '../types';
import {
  LIVE_MODEL,
  buildLocalDraft,
  languageName,
} from '../services/aiDraft';
import {
  OBSERVATION_BY_ID,
  fingerprintObservations,
  summariseCompleteness,
} from '../data/observations';

export interface ScrubbedDraftRequest {
  encounter: Pick<Encounter, 'equipmentMode' | 'observations' | 'consent'>;
  patient: Pick<Patient, 'ageDays' | 'ageLabel' | 'sex'> & {
    reportedConcerns: string[];
  };
  mother: Pick<Mother, 'ageYears' | 'reportedNeeds'> | null;
  protocol: Pick<
    ProtocolRecord,
    'id' | 'title' | 'version' | 'clinicalApproval' | 'sourceOrganisation'
  > | null;
  language: Language;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super('AI provider key is not configured on the server.');
    this.name = 'AiNotConfiguredError';
  }
}

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiProviderError';
  }
}

export const isServerAiConfigured = (): boolean => {
  const key = process.env.GEMINI_API_KEY ?? process.env.API_KEY ?? '';
  return Boolean(key && key.length > 10);
};

export const buildServerLiveDraft = async (
  request: ScrubbedDraftRequest,
): Promise<AiDraft> => {
  if (!isServerAiConfigured()) throw new AiNotConfiguredError();

  const key = (process.env.GEMINI_API_KEY ?? process.env.API_KEY)!;
  const ai = new GoogleGenAI({ apiKey: key });

  const summary = summariseCompleteness(
    request.encounter.observations.map((o) => ({
      definitionId: o.definitionId,
      value: o.value,
      quality: o.quality,
      recordedAt: null,
      recordedBy: null,
    })) as Observation[],
  );

  const obsLines =
    request.encounter.observations
      .filter((o) => o.quality !== 'Not assessed' && o.value.trim())
      .map((o) => {
        const definition = OBSERVATION_BY_ID.get(o.definitionId);
        const unit = definition?.unit ? ` ${definition.unit}` : '';
        return `- ${definition?.label ?? o.definitionId}: ${o.value}${unit} [${o.quality}]`;
      })
      .join('\n') || 'No observations recorded.';

  const missing =
    summary.requiredMissing
      .map((definition) => {
        const obs = request.encounter.observations.find((o) => o.definitionId === definition.id);
        return `- ${definition.label} [${obs?.quality ?? 'Not assessed'}]`;
      })
      .join('\n') || 'All required observations have usable evidence.';

  const prompt = `You are preparing a documentation draft for a qualified physician who will make the clinical decision. You are NOT the clinician. Write in ${languageName[request.language]}.

Absolute rules:
- Do not diagnose, classify severity, assign a probability or confidence score, or recommend treatment.
- Use only the observations supplied. Never infer that an unasked question was answered.
- If a danger sign is explicitly recorded, flag it for urgent review; do not suggest waiting.
- If required observations are missing, list them and state that the physician must decide whether remote evidence is sufficient.
- Do not repeat names, addresses, phone numbers, or other direct identifiers. Refer to "the infant", "the caregiver", "the mother".
- Use exactly these sections:
  1. Reported observations
  2. Danger signs explicitly reported
  3. Information missing or unclear
  4. Points for physician review
  5. Limitations (AI-generated documentation draft; not a diagnosis)

Patient context:
- Age: ${request.patient.ageLabel}
- Sex: ${request.patient.sex}
- Reported concerns: ${request.patient.reportedConcerns.join(', ') || 'none recorded'}
${request.mother ? `- Maternal context: age ${request.mother.ageYears ?? 'unknown'}; reported needs: ${request.mother.reportedNeeds.join(', ') || 'none recorded'}` : ''}

Protocol reference: ${request.protocol ? `${request.protocol.title} v${request.protocol.version}; approval: ${request.protocol.clinicalApproval}; source: ${request.protocol.sourceOrganisation}` : 'none attached'}

Recorded observations:
${obsLines}

Required observations still missing:
${missing}

Completeness: ${summary.requiredAssessed}/${summary.requiredTotal} required observations assessed.`;

  let response: Awaited<ReturnType<typeof ai.models.generateContent>>;
  try {
    response = await ai.models.generateContent({ model: LIVE_MODEL, contents: prompt });
  } catch (error) {
    throw new AiProviderError(error instanceof Error ? error.message : 'Model call failed');
  }

  const text = response.text?.trim();
  if (!text) throw new AiProviderError('Empty model response');

  const fingerprint = fingerprintObservations(
    request.encounter.observations as Observation[],
  );

  return {
    id: `DRAFT-${Date.now()}`,
    text,
    generatedAt: new Date().toISOString(),
    model: LIVE_MODEL,
    protocolId: request.protocol?.id ?? null,
    protocolVersion: request.protocol?.version ?? null,
    evidenceFingerprint: fingerprint,
    simulated: false,
    limitations:
      'AI-generated documentation draft. Not a diagnosis and not clinically validated. A qualified physician must review the evidence and sign the decision.',
  };
};

export const buildServerFallbackDraft = (
  request: ScrubbedDraftRequest,
  reason: string,
): AiDraft => {
  const fauxEncounter = {
    equipmentMode: request.encounter.equipmentMode,
    observations: request.encounter.observations,
    consent: request.encounter.consent,
  } as Encounter;
  const fauxPatient = {
    name: 'the infant',
    ageLabel: request.patient.ageLabel,
    caregiverName: 'the caregiver',
    caregiverRelationship: 'caregiver',
  } as Patient;
  const fauxProtocol = request.protocol
    ? ({
        id: request.protocol.id,
        title: request.protocol.title,
        version: request.protocol.version,
        clinicalApproval: request.protocol.clinicalApproval,
      } as ProtocolRecord)
    : null;
  return buildLocalDraft(
    fauxEncounter,
    fauxPatient,
    fauxProtocol,
    request.language,
    `The live model call failed server-side (${reason}). A deterministic local template was used instead.`,
  );
};
