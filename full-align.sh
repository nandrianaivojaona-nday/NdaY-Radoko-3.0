#!/usr/bin/env bash
#
# full-align.sh
# Applies the "Full Alignment Implementation" and
# "Building the Artifacts the Kit References" changes to NdaY'Radoko 3.0.
#
# Usage:
#   chmod +x full-align.sh
#   ./full-align.sh /path/to/NdaY-Radoko-3.0     # or run inside the project dir
#
# Behaviour:
#   - Verifies this is the NdaY'Radoko project
#   - Backs up the project to .backup-YYYYMMDD-HHMMSS/
#   - Applies all file creations, replacements and surgical edits
#   - Runs `npm run typecheck` at the end
#   - Prints rollback instructions if typecheck fails
#
# Requirements on MacBook Air:
#   - macOS bash 3.2+ (system default)
#   - python3 (Xcode Command Line Tools provides it; check with `python3 -V`)
#   - Node 20+, npm
#
# If typecheck fails, restore from backup with:
#   rsync -a --delete "$PROJECT/.backup-XXXX/" "$PROJECT/" --exclude=.backup-*
#
set -euo pipefail

PROJECT_DIR="${1:-$PWD}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$PROJECT_DIR/.backup-$TIMESTAMP"
PYTHON="${PYTHON:-python3}"

log()  { printf '\033[1;34m[align]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[ ok ]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[fail]\033[0m %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------
[ -d "$PROJECT_DIR" ] || fail "Project dir not found: $PROJECT_DIR"
cd "$PROJECT_DIR"

[ -f package.json ]          || fail "package.json missing — is this the project root?"
[ -f types.ts ]              || fail "types.ts missing — is this the project root?"
[ -f App.tsx ]               || fail "App.tsx missing"
[ -f services/aiDraft.ts ]   || fail "services/aiDraft.ts missing"
[ -f services/clinicalWorkflow.ts ] || fail "services/clinicalWorkflow.ts missing"
[ -f components/EncounterDetail.tsx ] || fail "components/EncounterDetail.tsx missing"
[ -f data/whoYoungInfantClassificationRules.ts ] || fail "data/whoYoungInfantClassificationRules.ts missing"

command -v node >/dev/null || fail "node is not installed"
command -v npm  >/dev/null || fail "npm is not installed"
command -v "$PYTHON" >/dev/null || fail "$PYTHON is not installed (Xcode CLI Tools)"

log "Project root: $PROJECT_DIR"
log "Backup:       $BACKUP_DIR"
log "Python:       $($PYTHON -V 2>&1)"

# ---------------------------------------------------------------------------
# Backup (excluding node_modules/.git so it's fast)
# ---------------------------------------------------------------------------
mkdir -p "$BACKUP_DIR"
tar --exclude='./node_modules' --exclude='./.git' --exclude='./.backup-*' \
    --exclude='./dist' --exclude='./.npm-cache' -czf "$BACKUP_DIR/snapshot.tgz" .
ok "Backup written to $BACKUP_DIR/snapshot.tgz"

# ---------------------------------------------------------------------------
# Helper: write a file (dirs auto-created)
# ---------------------------------------------------------------------------
write_file() {
  local path="$1"
  mkdir -p "$(dirname "$path")"
  cat > "$path"
  ok "Wrote $path"
}

# ---------------------------------------------------------------------------
# Helper: patch a file with a find/replace, failing loudly if not matched
# ---------------------------------------------------------------------------
patch_py() {
  local label="$1"
  local script="$2"
  "$PYTHON" - "$PROJECT_DIR" <<PYEOF
import sys, os
project = sys.argv[1]
$script
PYEOF
  ok "Patched: $label"
}

# ===========================================================================
# PHASE 1 — NEW FILES
# ===========================================================================
log "Phase 1: creating new files…"

# --- services/apiClient.ts ---
write_file "$PROJECT_DIR/services/apiClient.ts" <<'TSEOF'
// services/apiClient.ts
import {
  AiDraft,
  DecisionValidation,
  Encounter,
  Language,
  Mother,
  Patient,
  ProtocolRecord,
  UserAccount,
} from '../types';
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
TSEOF

# --- server/aiDraftServer.ts ---
write_file "$PROJECT_DIR/server/aiDraftServer.ts" <<'TSEOF'
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
TSEOF

# --- server.ts ---
write_file "$PROJECT_DIR/server.ts" <<'TSEOF'
// server.ts
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import {
  AiNotConfiguredError,
  AiProviderError,
  buildServerFallbackDraft,
  buildServerLiveDraft,
  isServerAiConfigured,
  type ScrubbedDraftRequest,
} from './server/aiDraftServer';
import { DecisionInput, validateDecision } from './services/clinicalWorkflow';
import { DecisionValidation, Encounter, UserAccount, UserRole } from './types';

const PORT = Number(process.env.PORT ?? 4001);

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

interface ServerSession {
  userId: string;
  role: UserRole;
  facilityId: string | null;
}

const parseSession = (req: Request): ServerSession | null => {
  const userId = req.header('X-User-Id');
  const role = req.header('X-User-Role');
  const facilityHeader = req.header('X-Facility-Id');
  if (!userId || !role) return null;
  if (!['Physician', 'Field Officer', 'Program Admin'].includes(role)) return null;
  return {
    userId,
    role: role as UserRole,
    facilityId: facilityHeader && facilityHeader !== 'none' ? facilityHeader : null,
  };
};

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: isServerAiConfigured(),
    model: isServerAiConfigured() ? 'gemini-2.5-flash' : null,
    time: new Date().toISOString(),
  });
});

app.post('/api/clinical/ai-draft', async (req: Request, res: Response) => {
  const session = parseSession(req);
  if (!session) return res.status(401).json({ error: 'Missing or invalid user claims.' });

  const payload = req.body as ScrubbedDraftRequest;
  if (!payload?.encounter || !payload?.patient || !payload?.language) {
    return res.status(400).json({ error: 'Invalid draft request payload.' });
  }

  try {
    const draft = await buildServerLiveDraft(payload);
    return res.json({ draft, simulated: false, model: draft.model, source: 'server-live' });
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return res.status(503).json({
        error: 'AI provider not configured on server',
        fallbackRecommended: true,
      });
    }
    if (error instanceof AiProviderError) {
      const fallback = buildServerFallbackDraft(payload, error.message);
      return res.status(503).json({
        error: error.message,
        fallbackRecommended: true,
        draft: fallback,
        simulated: true,
        model: fallback.model,
        source: 'server-fallback',
      });
    }
    // eslint-disable-next-line no-console
    console.error('[server] Unexpected AI draft error', error);
    return res.status(500).json({ error: 'Internal error preparing draft.' });
  }
});

app.post('/api/clinical/sign-decision', (req: Request, res: Response) => {
  const session = parseSession(req);
  if (!session) {
    return res.status(401).json({
      valid: false,
      errors: ['Missing or invalid user claims.'],
      incompleteRequired: [],
    } satisfies DecisionValidation);
  }
  if (session.role !== 'Physician') {
    return res.status(403).json({
      valid: false,
      errors: ['Only a physician account can sign a decision.'],
      incompleteRequired: [],
    } satisfies DecisionValidation);
  }

  const { encounter, decision } = req.body as {
    encounter: Pick<Encounter, 'id' | 'facilityId' | 'status' | 'deliveryState' | 'observations'>;
    decision: DecisionInput;
  };

  if (!encounter || !decision) {
    return res.status(400).json({
      valid: false,
      errors: ['Invalid signing request.'],
      incompleteRequired: [],
    } satisfies DecisionValidation);
  }

  if (session.facilityId !== encounter.facilityId) {
    return res.status(403).json({
      valid: false,
      errors: ['The signing physician must belong to the encounter facility.'],
      incompleteRequired: [],
    } satisfies DecisionValidation);
  }

  const fauxEncounter = {
    ...encounter,
    observations: encounter.observations.map((o) => ({
      definitionId: o.definitionId,
      value: o.value,
      quality: o.quality,
      recordedAt: null,
      recordedBy: null,
    })),
  } as unknown as Encounter;

  const validation = validateDecision(fauxEncounter, decision);
  return res.status(validation.valid ? 200 : 422).json(validation);
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('[server] Unhandled error', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[server] NdaY'Radoko backend listening on http://localhost:${PORT} (AI: ${isServerAiConfigured() ? 'configured' : 'fallback only'})`,
  );
});

export type { UserAccount };
TSEOF

# --- .env.example ---
write_file "$PROJECT_DIR/.env.example" <<'ENVEOF'
# Copy to `.env` and fill in before running `npm run server`.
# The key is only read by server.ts; never bundled into the browser.
GEMINI_API_KEY=
PORT=4001
ENVEOF

# --- fixtures/types.ts ---
write_file "$PROJECT_DIR/fixtures/types.ts" <<'TSEOF'
// fixtures/types.ts
import { Encounter, Mother, Patient } from '../types';

export type ScenarioCategory =
  | 'complete-evidence'
  | 'incomplete-evidence'
  | 'danger-sign'
  | 'consent-blocked'
  | 'no-observations'
  | 'unusable-quality'
  | 'maternal-focus'
  | 'multi-concern'
  | 'elderly-caregiver'
  | 'very-young-infant'
  | 'older-infant-within-band'
  | 'age-outside-band';

export interface SyntheticScenario {
  synthetic: true;
  id: string;
  name: string;
  category: ScenarioCategory;
  description: string;
  clinicalCaveat: string;
  mother: Mother;
  patient: Patient;
  encounter: Encounter;
  expectedBehaviour: string;
}

export interface FixtureStore {
  put(id: string, record: SyntheticScenario): Promise<void>;
  get(id: string): Promise<SyntheticScenario | null>;
  list(): Promise<string[]>;
  clear(): Promise<void>;
}
TSEOF

# --- fixtures/scenarioCatalog.ts ---
write_file "$PROJECT_DIR/fixtures/scenarioCatalog.ts" <<'TSEOF'
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
TSEOF

# --- fixtures/fixtureHelper.ts ---
write_file "$PROJECT_DIR/fixtures/fixtureHelper.ts" <<'TSEOF'
// fixtures/fixtureHelper.ts
import { ConsentRecord, Encounter, Mother, Observation, Patient } from '../types';
import {
  createEmptyMaternalObservations,
  createEmptyObservations,
  fingerprintObservations,
} from '../data/observations';
import { ScenarioDefinition, SCENARIO_DEFINITIONS } from './scenarioCatalog';
import { SyntheticScenario } from './types';

const RECORDED_BY = 'U-FIXTURE-BUILDER';
const RECORDED_AT = '2026-01-01T00:00:00.000Z';

const buildObservations = (definition: ScenarioDefinition): Observation[] => {
  const empty = createEmptyObservations();
  return empty.map((observation) => {
    const entry = definition.observations[observation.definitionId];
    if (!entry) return observation;
    return {
      ...observation,
      value: entry.value,
      quality: entry.quality,
      recordedAt: RECORDED_AT,
      recordedBy: RECORDED_BY,
      notes: entry.notes,
    };
  });
};

const buildMother = (definition: ScenarioDefinition): Mother => ({
  id: `MO-${definition.id}`,
  name: `Mother of ${definition.id}`,
  ageYears: definition.category === 'elderly-caregiver' ? null : 25,
  village: 'Synthetic Village',
  district: 'Synthetic District',
  countryId: 'madagascar',
  observations: createEmptyMaternalObservations(),
  reportedNeeds:
    definition.category === 'maternal-focus'
      ? ['breastfeeding support', 'low mood (informal report)']
      : [],
  createdAt: RECORDED_AT,
  createdBy: RECORDED_BY,
  dataClassification: 'Demo — synthetic',
  isPrimaryCaregiver: definition.caregiverRelationship === 'Mother',
});

const buildPatient = (definition: ScenarioDefinition, mother: Mother): Patient => ({
  id: `PT-${definition.id}`,
  motherId: mother.id,
  name: `Infant ${definition.id}`,
  ageDays: definition.ageDays,
  ageLabel:
    definition.ageDays < 1 ? 'Newborn (day 0)' : `${definition.ageDays} day${definition.ageDays === 1 ? '' : 's'}`,
  sex: definition.sex,
  caregiverName: definition.caregiverName,
  caregiverRelationship: definition.caregiverRelationship,
  village: 'Synthetic Village',
  district: 'Synthetic District',
  countryId: 'madagascar',
  reportedConcerns: definition.reportedConcerns,
  createdAt: RECORDED_AT,
  createdBy: RECORDED_BY,
  dataClassification: 'Demo — synthetic',
});

const buildConsent = (definition: ScenarioDefinition): ConsentRecord => ({
  obtained: definition.consentObtained,
  obtainedBy: definition.consentObtained ? RECORDED_BY : null,
  obtainedAt: definition.consentObtained ? RECORDED_AT : null,
  scope: definition.consentObtained ? 'Synthetic fixture consent (not a real consent record).' : '',
  imageCaptureAllowed: definition.consentObtained && definition.imageCaptureAllowed,
});

const buildEncounter = (
  definition: ScenarioDefinition,
  mother: Mother,
  patient: Patient,
  observations: Observation[],
): Encounter => {
  const dangerSign = definition.category === 'danger-sign';
  return {
    id: `ENC-${definition.id}`,
    motherId: mother.id,
    patientId: patient.id,
    countryId: 'madagascar',
    facilityId: 'FAC-SYNTHETIC',
    createdBy: RECORDED_BY,
    createdAt: RECORDED_AT,
    status: dangerSign
      ? 'Referral in progress'
      : definition.category === 'no-observations'
      ? 'Assessment initiated'
      : definition.category === 'complete-evidence'
      ? 'Awaiting physician review'
      : 'Evidence collected',
    equipmentMode: definition.equipmentMode,
    assignedDroneId: null,
    consent: buildConsent(definition),
    observations,
    aiDraft: null,
    physicianDecision: null,
    followUp: null,
    referral: dangerSign
      ? {
          facility: 'Synthetic receiving facility (placeholder)',
          urgency: 'Same day',
          reason: 'Caregiver reported convulsions. Same-day referral recorded locally by the field officer.',
          initiatedAt: RECORDED_AT,
          initiatedBy: RECORDED_BY,
          completedAt: null,
          outcome: '',
        }
      : null,
    safetyEscalation: dangerSign
      ? {
          triggered: true,
          reason: 'Convulsions reported by caregiver.',
          triggeredAt: RECORDED_AT,
          triggeredBy: RECORDED_BY,
        }
      : { triggered: false, reason: '', triggeredAt: null, triggeredBy: null },
    failureEvents: [],
    deliveryState: dangerSign ? 'Received by facility' : 'Saved locally',
    draftReview: null,
    logistics: {
      required: false,
      mode: 'None',
      status: 'Not required',
      note: 'No logistics mission is requested by fixtures.',
      deliveryOutcome: '',
    },
    history: [
      {
        at: RECORDED_AT,
        actorId: RECORDED_BY,
        actorName: 'Fixture builder',
        action: 'Fixture prepared',
        detail: 'Synthetic input fixture. No physician decision recorded.',
        evidenceClass: 'simulated',
      },
    ],
    notes: definition.signatureNote ?? '',
  };
};

export const buildScenario = (definition: ScenarioDefinition): SyntheticScenario => {
  const observations = buildObservations(definition);
  const mother = buildMother(definition);
  const patient = buildPatient(definition, mother);
  const encounter = buildEncounter(definition, mother, patient, observations);

  return {
    synthetic: true,
    id: definition.id,
    name: definition.name,
    category: definition.category,
    description: definition.description,
    clinicalCaveat: definition.clinicalCaveat,
    mother,
    patient,
    encounter,
    expectedBehaviour: definition.expectedBehaviour,
  };
};

export const buildAllScenarios = (): SyntheticScenario[] =>
  SCENARIO_DEFINITIONS.map(buildScenario);

export const fingerprintScenario = (scenario: SyntheticScenario): string => {
  const canonical = [
    scenario.id,
    scenario.category,
    scenario.encounter.equipmentMode,
    String(scenario.encounter.consent.obtained),
    String(scenario.encounter.consent.imageCaptureAllowed),
    fingerprintObservations(scenario.encounter.observations),
  ].join('|');
  let hash = 2166136261;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `sc-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

export const assertScenarioShape = (scenario: SyntheticScenario): void => {
  if (scenario.synthetic !== true) throw new Error(`${scenario.id}: synthetic flag must be true.`);
  if (!/^SC-\d{2}$/.test(scenario.id)) throw new Error(`${scenario.id}: invalid id format.`);
  if (!scenario.clinicalCaveat?.trim()) throw new Error(`${scenario.id}: clinical caveat missing.`);
  if (scenario.patient.motherId !== scenario.mother.id)
    throw new Error(`${scenario.id}: patient.motherId does not match mother.id.`);
  if (scenario.encounter.patientId !== scenario.patient.id)
    throw new Error(`${scenario.id}: encounter.patientId does not match patient.id.`);
  if (scenario.encounter.motherId !== scenario.mother.id)
    throw new Error(`${scenario.id}: encounter.motherId does not match mother.id.`);
  if (scenario.encounter.aiDraft !== null)
    throw new Error(`${scenario.id}: fixtures must not carry an AI draft.`);
  if (scenario.encounter.physicianDecision !== null)
    throw new Error(`${scenario.id}: fixtures must not carry a physician decision.`);
  if (scenario.encounter.equipmentMode === 'Drone-assisted outreach')
    throw new Error(`${scenario.id}: fixtures must not reference drone-assisted outreach.`);
  if (scenario.mother.dataClassification !== 'Demo — synthetic')
    throw new Error(`${scenario.id}: mother classification must be Demo — synthetic.`);
  if (scenario.patient.dataClassification !== 'Demo — synthetic')
    throw new Error(`${scenario.id}: patient classification must be Demo — synthetic.`);
};
TSEOF

# --- fixtures/inMemoryFixtureStore.ts ---
write_file "$PROJECT_DIR/fixtures/inMemoryFixtureStore.ts" <<'TSEOF'
// fixtures/inMemoryFixtureStore.ts
import { FixtureStore, SyntheticScenario } from './types';

/**
 * Mock fixture store used only by scripts/fixtureSelfCheck.ts.
 * This is NOT a browser storage implementation, NOT application state, and
 * NOT connected to services/dataStore.ts.
 */
export class InMemoryFixtureStore implements FixtureStore {
  private readonly map = new Map<string, SyntheticScenario>();

  async put(id: string, record: SyntheticScenario): Promise<void> {
    this.map.set(id, JSON.parse(JSON.stringify(record)) as SyntheticScenario);
  }

  async get(id: string): Promise<SyntheticScenario | null> {
    const value = this.map.get(id);
    return value ? (JSON.parse(JSON.stringify(value)) as SyntheticScenario) : null;
  }

  async list(): Promise<string[]> {
    return [...this.map.keys()].sort();
  }

  async clear(): Promise<void> {
    this.map.clear();
  }
}
TSEOF

# --- fixtures/index.ts ---
write_file "$PROJECT_DIR/fixtures/index.ts" <<'TSEOF'
// fixtures/index.ts
export type { FixtureStore, ScenarioCategory, SyntheticScenario } from './types';
export type { ScenarioDefinition, ScenarioObservationValue } from './scenarioCatalog';
export { SCENARIO_DEFINITIONS } from './scenarioCatalog';
export {
  assertScenarioShape,
  buildAllScenarios,
  buildScenario,
  fingerprintScenario,
} from './fixtureHelper';
export { InMemoryFixtureStore } from './inMemoryFixtureStore';
TSEOF

# --- scripts/fixtureSelfCheck.ts ---
write_file "$PROJECT_DIR/scripts/fixtureSelfCheck.ts" <<'TSEOF'
// scripts/fixtureSelfCheck.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertScenarioShape,
  buildAllScenarios,
  fingerprintScenario,
  InMemoryFixtureStore,
  SCENARIO_DEFINITIONS,
} from '../fixtures';
import { summariseCompleteness } from '../data/observations';

type CheckStatus = 'passed' | 'failed';
interface CheckResult { id: string; name: string; status: CheckStatus; detail: string; }

const results: CheckResult[] = [];

const run = async (id: string, name: string, fn: () => Promise<string> | string): Promise<void> => {
  try {
    const detail = await fn();
    results.push({ id, name, status: 'passed', detail });
  } catch (error) {
    results.push({
      id,
      name,
      status: 'failed',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
};

const main = async (): Promise<void> => {
  await run('scenarios-build', 'All 12 scenarios build without throwing', () => {
    const scenarios = buildAllScenarios();
    if (scenarios.length !== 12) throw new Error(`Expected 12 scenarios, got ${scenarios.length}.`);
    return `Built ${scenarios.length} scenarios.`;
  });

  const scenarios = buildAllScenarios();

  await run('scenario-ids-unique', 'Scenario IDs match /^SC-\\d{2}$/ and are unique', () => {
    const ids = scenarios.map((s) => s.id);
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate scenario IDs detected.');
    for (const id of ids) if (!/^SC-\d{2}$/.test(id)) throw new Error(`Invalid scenario ID: ${id}`);
    return `${ids.length} unique IDs.`;
  });

  await run('scenario-synthetic-flag', 'Every scenario declares synthetic: true', () => {
    for (const s of scenarios) if (s.synthetic !== true) throw new Error(`${s.id}: synthetic flag missing.`);
    return 'All scenarios flagged synthetic.';
  });

  await run('scenario-shape-valid', 'Every scenario passes assertScenarioShape', () => {
    for (const s of scenarios) assertScenarioShape(s);
    return `${scenarios.length} scenarios shape-valid.`;
  });

  await run('scenario-clinical-caveat', 'Every scenario has a non-empty clinical caveat', () => {
    for (const s of scenarios) if (!s.clinicalCaveat.trim()) throw new Error(`${s.id}: clinical caveat missing.`);
    return 'All scenarios carry a clinical caveat.';
  });

  await run('mother-patient-link', 'Every patient.motherId equals its scenario mother.id', () => {
    for (const s of scenarios) if (s.patient.motherId !== s.mother.id) throw new Error(`${s.id}: link mismatch.`);
    return 'All mother-patient links match.';
  });

  await run('encounter-patient-link', 'Every encounter.patientId equals its scenario patient.id', () => {
    for (const s of scenarios) if (s.encounter.patientId !== s.patient.id) throw new Error(`${s.id}: link mismatch.`);
    return 'All encounter-patient links match.';
  });

  await run('no-ai-draft', 'No scenario carries an AI draft', () => {
    for (const s of scenarios) if (s.encounter.aiDraft !== null) throw new Error(`${s.id}: aiDraft present.`);
    return 'No AI drafts present in fixtures.';
  });

  await run('no-physician-decision', 'No scenario carries a physician decision', () => {
    for (const s of scenarios) if (s.encounter.physicianDecision !== null) throw new Error(`${s.id}: physicianDecision present.`);
    return 'No physician decisions present in fixtures.';
  });

  await run('no-drone-equipment-mode', 'No scenario uses drone-assisted outreach', () => {
    for (const s of scenarios) if (s.encounter.equipmentMode === 'Drone-assisted outreach') throw new Error(`${s.id}: drone-assisted mode present.`);
    return 'No drone-assisted mode referenced in fixtures.';
  });

  await run('fingerprint-deterministic', 'Fingerprint is deterministic across rebuilds', () => {
    const rebuilt = buildAllScenarios();
    for (let i = 0; i < scenarios.length; i += 1) {
      if (fingerprintScenario(scenarios[i]) !== fingerprintScenario(rebuilt[i])) {
        throw new Error(`${scenarios[i].id}: fingerprint not deterministic.`);
      }
    }
    return 'Fingerprints stable across two builds.';
  });

  await run('fingerprint-unique', 'Fingerprints are unique across all scenarios', () => {
    const fps = scenarios.map(fingerprintScenario);
    if (new Set(fps).size !== fps.length) throw new Error('Duplicate fingerprints detected.');
    return `${fps.length} unique fingerprints.`;
  });

  await run('store-put-get', 'Mock store put/get returns an equal record', async () => {
    const store = new InMemoryFixtureStore();
    const s = scenarios[0];
    await store.put(s.id, s);
    const fetched = await store.get(s.id);
    if (!fetched) throw new Error('get returned null.');
    if (JSON.stringify(fetched) !== JSON.stringify(s)) throw new Error('Round-trip mismatch.');
    return 'Round-trip equality confirmed.';
  });

  await run('store-list', 'Mock store list returns all 12 IDs after insertion', async () => {
    const store = new InMemoryFixtureStore();
    for (const s of scenarios) await store.put(s.id, s);
    const ids = await store.list();
    if (ids.length !== 12) throw new Error(`Expected 12, got ${ids.length}.`);
    return '12 IDs listed after insertion.';
  });

  await run('store-clear', 'Mock store clear empties the store', async () => {
    const store = new InMemoryFixtureStore();
    for (const s of scenarios) await store.put(s.id, s);
    await store.clear();
    const ids = await store.list();
    if (ids.length !== 0) throw new Error(`Expected 0, got ${ids.length}.`);
    return 'Store emptied.';
  });

  await run('safety-boundary-cases', 'Safety-boundary fixtures are present and labelled', () => {
    const byId = new Map(scenarios.map((s) => [s.id, s]));
    const sc02 = byId.get('SC-02');
    const sc03 = byId.get('SC-03');
    const sc04 = byId.get('SC-04');
    if (!sc02 || !sc03 || !sc04) throw new Error('Expected SC-02, SC-03, SC-04 to exist.');
    if (summariseCompleteness(sc02.encounter.observations).requiredMissing.length === 0) {
      throw new Error('SC-02 should contain at least one missing required observation.');
    }
    if (!sc03.encounter.safetyEscalation.triggered) throw new Error('SC-03 should have safetyEscalation.triggered = true.');
    if (sc04.encounter.consent.obtained !== false) throw new Error('SC-04 should have consent.obtained = false.');
    return 'SC-02 missing evidence; SC-03 urgent-care triggered; SC-04 consent blocked.';
  });

  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  const output = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    scope:
      'Standalone fixture-generation helper with a mock in-memory store. These are not application tests, not clinical tests, and not performance measurements.',
    summary: { total: results.length, passed, failed },
    checks: results,
    disclaimers: [
      'These checks exercise fixtures/fixtureHelper.ts and fixtures/inMemoryFixtureStore.ts only.',
      'No React component was rendered.',
      'No physician signature gate was exercised.',
      'No clinical classification rule was evaluated against real patient data.',
      'No AI model was called.',
      'No aircraft was operated.',
      'No real patient data is present; all fixtures are synthetic.',
    ],
    scenarioCatalogue: SCENARIO_DEFINITIONS.map((d) => ({ id: d.id, name: d.name, category: d.category })),
  };

  const outPath = join('docs', 'module-self-check-results.json');
  mkdirSync('docs', { recursive: true });
  writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');

  // eslint-disable-next-line no-console
  console.log(`\nFixture helper self-check: ${passed}/${results.length} passed.\n`);
  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`  [${r.status.toUpperCase()}] ${r.id} — ${r.name}`);
  }
  // eslint-disable-next-line no-console
  console.log(`\nWrote ${outPath}\n`);
  if (failed > 0) process.exitCode = 1;
};

void main();
TSEOF

# --- scripts/listScenarios.ts ---
write_file "$PROJECT_DIR/scripts/listScenarios.ts" <<'TSEOF'
// scripts/listScenarios.ts
import { SCENARIO_DEFINITIONS } from '../fixtures';

// eslint-disable-next-line no-console
console.log('Prepared synthetic scenarios (input fixtures only — not tests, not results):\n');
for (const def of SCENARIO_DEFINITIONS) {
  // eslint-disable-next-line no-console
  console.log(`  ${def.id}  [${def.category.padEnd(24)}]  ${def.name}`);
}
// eslint-disable-next-line no-console
console.log('\nNo application behaviour is asserted here. Use `npm run fixtures:self-check` for helper checks.');
TSEOF

# --- docs/SCENARIOS.md ---
write_file "$PROJECT_DIR/docs/SCENARIOS.md" <<'MDEOF'
# Prepared synthetic scenarios

12 synthetic input fixtures — prepared, not tested.

## What these are

- Synthetic `Mother`, `Patient`, and `Encounter` records designed to exercise
  the application's display and completeness logic during a demo.
- Each fixture carries a `clinicalCaveat` and a `synthetic: true` marker.
- Regenerate and validate the fixtures with:

  ```sh
  npm run fixtures:self-check
  npm run fixtures:list