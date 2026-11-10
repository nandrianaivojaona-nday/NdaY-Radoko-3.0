// services/apiClient.ts
import {
  AiDraft,
  Encounter,
  Language,
  Mother,
  Patient,
  ProtocolRecord,
  UserAccount,
} from '../types';
import type { DecisionValidation } from './clinicalWorkflow';
import { buildLocalDraft, LIVE_MODEL, FALLBACK_MODEL } from './aiDraft';
import { DecisionInput, validateDecision } from './clinicalWorkflow';

const REQUEST_TIMEOUT_MS = 25_000;

const authHeaders = (user: UserAccount): Record<string, string> => ({
  'Content-Type': 'application/json',
  'X-User-Id': user.id,
  'X-User-Role': user.role,
  'X-Facility-Id': user.facilityId ?? 'none',
});

/** Strip identifiers before the payload ever leaves the browser. */
const scrubForAi = (
  encounter: Encounter,
  patient: Patient,
  mother: Mother | null,
  protocol: ProtocolRecord | null,
) => ({
  encounter: {
    equipmentMode: encounter.equipmentMode,
    observations: encounter.observations.map((o) => ({
      definitionId: o.definitionId,
      value: o.value,
      quality: o.quality,
    })),
    consent: {
      obtained: encounter.consent.obtained,
      imageCaptureAllowed: encounter.consent.imageCaptureAllowed,
    },
  },
  patient: {
    ageDays: patient.ageDays,
    ageLabel: patient.ageLabel,
    sex: patient.sex,
    reportedConcerns: patient.reportedConcerns,
  },
  mother: mother
    ? { ageYears: mother.ageYears, reportedNeeds: mother.reportedNeeds }
    : null,
  protocol: protocol
    ? {
        id: protocol.id,
        title: protocol.title,
        version: protocol.version,
        clinicalApproval: protocol.clinicalApproval,
        sourceOrganisation: protocol.sourceOrganisation,
      }
    : null,
});

interface ServerDraftResponse {
  draft: AiDraft;
  simulated: boolean;
  model: string;
  source: 'server-live' | 'server-fallback';
}

export const prepareAiDraft = async (
  encounter: Encounter,
  patient: Patient,
  mother: Mother | null,
  protocol: ProtocolRecord | null,
  language: Language,
  user: UserAccount,
): Promise<AiDraft> => {
  try {
    const response = await fetch('/api/clinical/ai-draft', {
      method: 'POST',
      headers: authHeaders(user),
      body: JSON.stringify({
        ...scrubForAi(encounter, patient, mother, protocol),
        language,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const data = (await response.json()) as ServerDraftResponse;
    return data.draft;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      '[apiClient] AI draft server unavailable or not configured; using local fallback.',
      error,
    );
    return buildLocalDraft(
      encounter,
      patient,
      protocol,
      language,
      'Server unavailable in this session; a deterministic local template was used instead. No live model call occurred.',
    );
  }
};

export const validateDecisionOnServer = async (
  encounter: Encounter,
  decision: DecisionInput,
  user: UserAccount,
): Promise<DecisionValidation | null> => {
  try {
    const response = await fetch('/api/clinical/sign-decision', {
      method: 'POST',
      headers: authHeaders(user),
      body: JSON.stringify({
        encounter: {
          id: encounter.id,
          facilityId: encounter.facilityId,
          status: encounter.status,
          deliveryState: encounter.deliveryState,
          observations: encounter.observations.map((o) => ({
            definitionId: o.definitionId,
            value: o.value,
            quality: o.quality,
          })),
        },
        decision,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    return (await response.json()) as DecisionValidation;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      '[apiClient] Server-side decision validation unavailable; relying on local validation.',
      error,
    );
    return null;
  }
};

export { LIVE_MODEL, FALLBACK_MODEL };
