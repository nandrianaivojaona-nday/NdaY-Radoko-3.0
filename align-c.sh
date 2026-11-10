#!/usr/bin/env bash
# align-c.sh — Phase 2 replacements + Phase 3 appends
set -euo pipefail

P="$PWD"
PY="${PYTHON:-python3}"

ok()  { printf '\033[1;32m[ok]\033[0m %s\n' "$*"; }
fail(){ printf '\033[1;31m[fail]\033[0m %s\n' "$*" >&2; exit 1; }

# Preconditions: Chunks A and B must have run
[ -f package.json ] || fail "run from project root"
[ -f services/apiClient.ts ] || fail "Chunk A not done — services/apiClient.ts missing"
[ -f fixtures/fixtureHelper.ts ] || fail "Chunk B not done — fixtures/fixtureHelper.ts missing"

write_file() { local f="$1"; mkdir -p "$(dirname "$f")"; cat > "$f"; ok "wrote ${f#$P/}"; }

# ===========================================================================
# Phase 2 — full replacements
# ===========================================================================

write_file "$P/services/aiDraft.ts" <<'TSEOF'
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
TSEOF

write_file "$P/vite.config.ts" <<'TSEOF'
// vite.config.ts
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  base: '/NdaY-Radoko-3.0/',
  server: {
    port: 4000,
    host: '0.0.0.0',
    proxy: {
      '/api': { target: 'http://localhost:4001', changeOrigin: true },
    },
  },
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(''),
    'process.env.GEMINI_API_KEY': JSON.stringify(''),
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
}));
TSEOF

write_file "$P/package.json" <<'JSONEOF'
{
  "name": "nday-radoko",
  "private": true,
  "version": "0.3.0",
  "license": "Apache-2.0",
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "vite",
    "server": "tsx server.ts",
    "dev:all": "concurrently -n web,api -c blue,magenta \"npm:dev\" \"npm:server\"",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "preview": "vite preview",
    "fixtures:self-check": "tsx scripts/fixtureSelfCheck.ts",
    "fixtures:list": "tsx scripts/listScenarios.ts",
    "verify": "npm run typecheck && npm run build && npm run fixtures:self-check"
  },
  "dependencies": {
    "@google/genai": "^1.26.0",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "recharts": "^3.3.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "autoprefixer": "^10.4.21",
    "concurrently": "^9.1.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.2",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}
JSONEOF

# ===========================================================================
# Phase 3 — idempotent appends
# ===========================================================================

if ! grep -q "CriteriaOperator" "$P/types.ts"; then
  cat >> "$P/types.ts" <<'TSEOF'

// ---------------------------------------------------------------------------
// Structured criteria for classification evaluation
// ---------------------------------------------------------------------------
export type CriteriaOperator =
  | 'equals' | 'notEquals' | 'greaterOrEqual' | 'lessOrEqual' | 'greater'
  | 'less' | 'in' | 'notIn' | 'contains';
export interface CriteriaCheck {
  observationId: string;
  description: string;
  operator: CriteriaOperator;
  value: string | number | string[];
  negate?: boolean;
}
export interface CriteriaGroup {
  match: 'any' | 'all' | 'count';
  countThreshold?: number;
  checks: CriteriaCheck[];
}
export interface ProtocolClassificationRule {
  criteria?: CriteriaGroup;
}
TSEOF
  ok "appended types.ts"
else
  ok "types.ts already has criteria — skipped"
fi

if ! grep -q "evaluateClassificationRules" "$P/services/clinicalWorkflow.ts"; then
  cat >> "$P/services/clinicalWorkflow.ts" <<'TSEOF'

// ---------------------------------------------------------------------------
// Structured classification evaluation
// ---------------------------------------------------------------------------
import type {
  CriteriaCheck, CriteriaGroup, CriteriaOperator, ProtocolClassificationRule,
} from '../types';

export type CriteriaMatch = 'matched' | 'not-matched' | 'indeterminate';

export interface RuleEvaluation {
  ruleId: string;
  label: string;
  result: CriteriaMatch;
  matchedCriteria: string[];
  unmatchedCriteria: string[];
  unresolvedCriteria: string[];
}

const parseNumber = (v: string): number | null => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const evaluateOperator = (
  raw: string, op: CriteriaOperator, expected: string | number | string[],
): boolean => {
  const expectedStr = Array.isArray(expected)
    ? expected.map((v) => String(v).toLowerCase())
    : String(expected).toLowerCase();
  const rawLower = raw.toLowerCase();
  const rawNum = parseNumber(raw);
  const expectedNum = typeof expected === 'number'
    ? expected
    : typeof expected === 'string' ? parseNumber(expected) : null;
  switch (op) {
    case 'equals': return rawLower === expectedStr;
    case 'notEquals': return rawLower !== expectedStr;
    case 'greaterOrEqual': return rawNum !== null && expectedNum !== null && rawNum >= expectedNum;
    case 'lessOrEqual': return rawNum !== null && expectedNum !== null && rawNum <= expectedNum;
    case 'greater': return rawNum !== null && expectedNum !== null && rawNum > expectedNum;
    case 'less': return rawNum !== null && expectedNum !== null && rawNum < expectedNum;
    case 'in':
      return Array.isArray(expected)
        ? (expected as string[]).map((v) => String(v).toLowerCase()).includes(rawLower)
        : rawLower === expectedStr;
    case 'notIn':
      return Array.isArray(expected)
        ? !(expected as string[]).map((v) => String(v).toLowerCase()).includes(rawLower)
        : rawLower !== expectedStr;
    case 'contains': return rawLower.includes(expectedStr);
    default: return false;
  }
};

export const evaluateCheck = (
  check: CriteriaCheck, observations: Observation[],
): CriteriaMatch => {
  const o = observations.find((x) => x.definitionId === check.observationId);
  if (!o || !o.value.trim()
    || o.quality === 'Not assessed'
    || o.quality === 'Unavailable'
    || o.quality === 'Unusable') return 'indeterminate';
  const m = evaluateOperator(o.value, check.operator, check.value);
  const f = check.negate ? !m : m;
  return f ? 'matched' : 'not-matched';
};

export const evaluateCriteriaGroup = (
  g: CriteriaGroup, observations: Observation[],
): { result: CriteriaMatch; matched: string[]; unmatched: string[]; unresolved: string[] } => {
  const matches = g.checks.map((c) => ({
    description: c.description,
    result: evaluateCheck(c, observations),
  }));
  const matched = matches.filter((m) => m.result === 'matched').map((m) => m.description);
  const unmatched = matches.filter((m) => m.result === 'not-matched').map((m) => m.description);
  const unresolved = matches.filter((m) => m.result === 'indeterminate').map((m) => m.description);
  let result: CriteriaMatch;
  if (g.match === 'any') {
    if (matched.length > 0) result = 'matched';
    else if (unresolved.length > 0) result = 'indeterminate';
    else result = 'not-matched';
  } else if (g.match === 'all') {
    if (unmatched.length > 0) result = 'not-matched';
    else if (unresolved.length > 0) result = 'indeterminate';
    else result = 'matched';
  } else {
    const t = g.countThreshold ?? 1;
    if (matched.length >= t) result = 'matched';
    else if (matched.length + unresolved.length < t) result = 'not-matched';
    else result = 'indeterminate';
  }
  return { result, matched, unmatched, unresolved };
};

export const evaluateClassificationRules = (
  rules: ProtocolClassificationRule[], observations: Observation[],
): RuleEvaluation[] =>
  rules.map((rule) => {
    if (!rule.criteria) return {
      ruleId: rule.id, label: rule.label, result: 'indeterminate',
      matchedCriteria: [], unmatchedCriteria: [],
      unresolvedCriteria: ['No structured criteria mapped.'],
    };
    const { result, matched, unmatched, unresolved } = evaluateCriteriaGroup(
      rule.criteria, observations,
    );
    return {
      ruleId: rule.id, label: rule.label, result,
      matchedCriteria: matched, unmatchedCriteria: unmatched, unresolvedCriteria: unresolved,
    };
  });
TSEOF
  ok "appended clinicalWorkflow.ts"
else
  ok "clinicalWorkflow.ts already has evaluation helpers — skipped"
fi

if ! grep -qE '^\.env$' "$P/.gitignore" 2>/dev/null; then
  printf '\n# full-alignment\n.env\n.env.local\n.env.*.local\n' >> "$P/.gitignore"
  ok "appended .gitignore"
else
  ok ".gitignore already ignores .env — skipped"
fi

if ! grep -q "Prepared scenarios and helper self-check" "$P/docs/DEMO_FEATURE_STATUS.md" 2>/dev/null; then
  cat >> "$P/docs/DEMO_FEATURE_STATUS.md" <<'MDEOF'

## Prepared scenarios and helper self-check (10 November 2026)

The repository now ships 12 synthetic input fixtures under `fixtures/`, a
standalone fixture-generation helper whose 16 isolated checks pass using a
mock store, and a generated artifact at `docs/module-self-check-results.json`.

**What this proves.** The helper builds shape-valid, synthetic-only scenario
records that satisfy the safety boundaries enforced in this build: no AI
draft, no physician decision, no drone equipment mode.

**What this does not prove.** Application behaviour, UI behaviour, the
physician sign gate, clinical accuracy, AI behaviour, or drone flight.

Regenerate with `npm run fixtures:self-check`.
MDEOF
  ok "appended DEMO_FEATURE_STATUS.md"
else
  ok "DEMO_FEATURE_STATUS.md already has scenarios section — skipped"
fi

if ! grep -q "Prepared scenarios and helper self-check" "$P/README.md" 2>/dev/null; then
  cat >> "$P/README.md" <<'MDEOF'

## Prepared scenarios and helper self-check

12 synthetic input fixtures + a fixture-generation helper with 16 isolated
checks. Run:

```sh
npm run fixtures:list        # 12-scenario catalogue
npm run fixtures:self-check  # 16 helper checks + JSON output
Scope: standalone helper + mock store — not application tests, not clinical
tests, no AI model called, no physician decision recorded, no drone operation.
MDEOF
ok "appended README.md"
else
ok "README.md already has scenarios section — skipped"
fi

echo
ok "Chunk C complete"
echo
echo "Next: run align-d.sh"