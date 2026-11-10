#!/usr/bin/env bash
# align-d.sh — Phase 4 patches + Phase 5 verify
set -euo pipefail

P="$PWD"
PY="${PYTHON:-python3}"

ok()  { printf '\033[1;32m[ok]\033[0m %s\n' "$*"; }
skip(){ printf '\033[1;33m[skip]\033[0m %s\n' "$*"; }
warn(){ printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
fail(){ printf '\033[1;31m[fail]\033[0m %s\n' "$*" >&2; exit 1; }

[ -f package.json ] || fail "run from project root"
grep -q "fixtures:self-check" package.json || fail "Chunk C not done — run align-c.sh first"
[ -f App.tsx ] || fail "App.tsx missing"
[ -f components/EncounterDetail.tsx ] || fail "EncounterDetail.tsx missing"
[ -f data/whoYoungInfantClassificationRules.ts ] || fail "whoYoungInfantClassificationRules.ts missing"

# ---------------------------------------------------------------------------
# Idempotent text patch. States:
#   - if new content already present  → skip
#   - if old content present          → replace, report OK
#   - if neither present              → fail
# ---------------------------------------------------------------------------
patch_file() {
  local label="$1" path="$2" old="$3" new="$4"
  "$PY" - "$P" "$path" "$old" "$new" "$label" <<'PYEOF'
import sys, os
project, path, old, new, label = sys.argv[1:6]
full = os.path.join(project, path)
if not os.path.exists(full):
    print(f"FAIL[{label}]: {path} not found"); sys.exit(2)
c = open(full).read()
if new in c:
    print(f"SKIP[{label}]: already applied"); sys.exit(0)
if old not in c:
    print(f"FAIL[{label}]: neither old nor new found in {path}"); sys.exit(2)
open(full, "w").write(c.replace(old, new, 1))
print(f"OK[{label}]")
PYEOF
}

# ===========================================================================
# App.tsx — 3 patches
# ===========================================================================

patch_file "App.tsx import" App.tsx \
"import { prepareAiDraft } from './services/aiDraft';" \
"import { prepareAiDraft, validateDecisionOnServer } from './services/apiClient';"

OLD_SIGN=$(cat <<'EOF'
    signDecision: (encounterId, input: DecisionInput): DecisionValidation => {
      const encounter = data.encounters.find((e) => e.id === encounterId);
      if (!encounter || !session) return { valid: false, errors: ['Encounter or session missing.'], incompleteRequired: [] };
      if (!canSignDecision(session.user, encounter)) {
        return { valid: false, errors: ['This account cannot sign this encounter.'], incompleteRequired: [] };
      }
      const validation = validateDecision(encounter, input);
      if (!validation.valid) return validation;
      const facility = data.facilities.find((f) => f.id === encounter.facilityId);
      updateEncounter(signDecisionRecord(encounter, session.user, facility?.name ?? 'Unknown facility', input));
      return { valid: true, errors: [], incompleteRequired: validation.incompleteRequired };
    },
EOF
)
NEW_SIGN=$(cat <<'EOF'
    signDecision: async (encounterId, input: DecisionInput): Promise<DecisionValidation> => {
      const encounter = data.encounters.find((e) => e.id === encounterId);
      if (!encounter || !session) return { valid: false, errors: ['Encounter or session missing.'], incompleteRequired: [] };
      if (!canSignDecision(session.user, encounter)) {
        return { valid: false, errors: ['This account cannot sign this encounter.'], incompleteRequired: [] };
      }
      const serverResult = await validateDecisionOnServer(encounter, input, session.user);
      if (serverResult && !serverResult.valid) {
        return { ...serverResult, incompleteRequired: serverResult.incompleteRequired ?? [] };
      }
      const validation = validateDecision(encounter, input);
      if (!validation.valid) return validation;
      const facility = data.facilities.find((f) => f.id === encounter.facilityId);
      updateEncounter(signDecisionRecord(encounter, session.user, facility?.name ?? 'Unknown facility', input));
      return { valid: true, errors: [], incompleteRequired: validation.incompleteRequired };
    },
EOF
)
patch_file "App.tsx signDecision async" App.tsx "$OLD_SIGN" "$NEW_SIGN"

OLD_PREP=$(cat <<'EOF'
      const draft = await prepareAiDraft(
        encounter,
        patient,
        mother,
        protocol,
        pilotCountry?.localLanguage ?? 'en',
      );
EOF
)
NEW_PREP=$(cat <<'EOF'
      const draft = await prepareAiDraft(
        encounter,
        patient,
        mother,
        protocol,
        pilotCountry?.localLanguage ?? 'en',
        session.user,
      );
EOF
)
patch_file "App.tsx prepareDraft session" App.tsx "$OLD_PREP" "$NEW_PREP"

# ===========================================================================
# EncounterDetail.tsx — 5 patches
# ===========================================================================

patch_file "EncounterDetail import eval" components/EncounterDetail.tsx \
"import ObservationPanel from './ObservationPanel';" \
"import ObservationPanel from './ObservationPanel';
import { evaluateClassificationRules } from '../services/clinicalWorkflow';"

patch_file "EncounterDetail signDecision iface" components/EncounterDetail.tsx \
"  signDecision: (encounterId: string, input: DecisionInput) => DecisionValidation;" \
"  signDecision: (encounterId: string, input: DecisionInput) => Promise<DecisionValidation>;"

OLD_FAC=$(cat <<'EOF'
  const facility = facilities.find((f) => f.id === encounter.facilityId);
EOF
)
NEW_FAC=$(cat <<'EOF'
  const facility = facilities.find((f) => f.id === encounter.facilityId);

  const classificationEvaluations = useMemo(
    () => evaluateClassificationRules(
      assessmentProtocol?.classificationRules ?? [],
      encounter.observations,
    ),
    [assessmentProtocol, encounter.observations],
  );
  const evaluationById = useMemo(
    () => new Map(classificationEvaluations.map((e) => [e.ruleId, e])),
    [classificationEvaluations],
  );
EOF
)
patch_file "EncounterDetail evaluation memo" components/EncounterDetail.tsx "$OLD_FAC" "$NEW_FAC"

OLD_HANDLE=$(cat <<'EOF'
  const handleSign = () => {
    setError(null);
    const validation = validateDecision(encounter, decision);
    if (!validation.valid) {
      setDecisionErrors(validation.errors);
      return;
    }
    const result = actions.signDecision(encounter.id, {
      ...decision,
      protocolId: assessmentProtocol?.id ?? null,
      protocolVersion: assessmentProtocol?.version ?? null,
    });
    if (!result.valid) {
      setDecisionErrors(result.errors);
      return;
    }
    setDecisionErrors([]);
    setMessage('Decision signed. The encounter is now in the disposition pathway.');
    setTab('outcome');
  };
EOF
)
NEW_HANDLE=$(cat <<'EOF'
  const handleSign = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await actions.signDecision(encounter.id, {
        ...decision,
        protocolId: assessmentProtocol?.id ?? null,
        protocolVersion: assessmentProtocol?.version ?? null,
      });
      if (!result.valid) { setDecisionErrors(result.errors); return; }
      setDecisionErrors([]);
      setMessage('Decision signed. The encounter is now in the disposition pathway.');
      setTab('outcome');
    } finally { setBusy(false); }
  };
EOF
)
patch_file "EncounterDetail handleSign async" components/EncounterDetail.tsx "$OLD_HANDLE" "$NEW_HANDLE"

# The sign button patch — uses single quotes on the shell side so the {busy ? ... : ...}
# expression stays intact inside the JSX attribute.
OLD_BTN=$(cat <<'EOF'
<button type="button" className="btn-primary" onClick={handleSign} disabled={!canSign}>
                      Sign physician decision
                    </button>
EOF
)
NEW_BTN=$(cat <<'EOF'
<button type="button" className="btn-primary" onClick={handleSign} disabled={!canSign || busy}>
                      {busy ? 'Validating and signing…' : 'Sign physician decision'}
                    </button>
EOF
)
patch_file "EncounterDetail sign btn busy" components/EncounterDetail.tsx "$OLD_BTN" "$NEW_BTN"

# Evaluation badge injection (two-step; needs internal Python for multi-anchor work)
"$PY" - "$P" <<'PYEOF'
import sys, os
p = os.path.join(sys.argv[1], "components/EncounterDetail.tsx")
c = open(p).read()
if "evaluationById.get(rule.id)" in c:
    print("SKIP[EncounterDetail eval badge]: already applied"); sys.exit(0)
n1 = "  const hasColourSwatch = Boolean(rule.chartColourHex && /^#[0-9A-Fa-f]{6}$/.test(rule.chartColourHex));"
if n1 not in c:
    print("FAIL[EncounterDetail eval badge]: anchor 1 not found"); sys.exit(2)
inj1 = n1 + """
                          const evaluation = evaluationById.get(rule.id);
                          const evaluationBadge = evaluation
                            ? ({
                                matched: { label: 'Observations suggest match', cls: 'bg-brand-mint/15 text-brand-mint' },
                                'not-matched': { label: 'Observations suggest no match', cls: 'bg-brand-text-secondary/10 text-brand-text-secondary' },
                                indeterminate: { label: 'Insufficient evidence', cls: 'bg-brand-accent/15 text-brand-accent' },
                              }[evaluation.result])
                            : null;"""
c = c.replace(n1, inj1, 1)
n2 = "                                    {rule.label}\n                                  </button>"
if n2 not in c:
    print("FAIL[EncounterDetail eval badge]: anchor 2 not found"); sys.exit(2)
inj2 = """                                    {rule.label}
                                  </button>
                                  {evaluationBadge && (
                                    <span className={`badge ml-2 text-[10px] ${evaluationBadge.cls}`}>
                                      {evaluationBadge.label}
                                    </span>
                                  )}"""
open(p, "w").write(c.replace(n2, inj2, 1))
print("OK[EncounterDetail eval badge]")
PYEOF

# ===========================================================================
# whoYoungInfantClassificationRules.ts — criteria injection per rule
# ===========================================================================

"$PY" - "$P" <<'PYEOF'
import sys, os
p = os.path.join(sys.argv[1], "data/whoYoungInfantClassificationRules.ts")
c = open(p).read()

# If the first rule already has criteria, consider the whole file done.
first = c.find("id: 'WHO-SYI-2019-VERY-SEVERE-DISEASE'")
if first != -1:
    nexta = c.find("actions:", first)
    if nexta != -1 and "criteria:" in c[first:nexta]:
        print("SKIP[whoYoungInfant criteria]: already applied"); sys.exit(0)

F  = "['Yes — less than usual', 'Yes — not feeding at all']"
C  = "['Yes — during this illness', 'Yes — now']"
U  = "['Yes — redness', 'Yes — pus']"
PU = "['Yes — few', 'Yes — many or extensive']"

CR = {
  "WHO-SYI-2019-VERY-SEVERE-DISEASE": "  criteria: { match: 'any', checks: [\n    { observationId: 'feeding_poorly', description: 'Not feeding well', operator: 'in', value: %s },\n    { observationId: 'convulsions', description: 'Convulsions', operator: 'in', value: %s },\n    { observationId: 'respiratory_rate', description: 'RR >= 60/min', operator: 'greaterOrEqual', value: 60 },\n    { observationId: 'chest_indrawing', description: 'Chest indrawing', operator: 'equals', value: 'Present' },\n    { observationId: 'axillary_temperature', description: 'Temp >= 37.5 C', operator: 'greaterOrEqual', value: 37.5 },\n    { observationId: 'axillary_temperature', description: 'Temp < 35.5 C', operator: 'less', value: 35.5 },\n    { observationId: 'movement_only_when_stimulated', description: 'Movement only when stimulated', operator: 'equals', value: 'Yes' },\n  ] },\n" % (F, C),
  "WHO-SYI-2019-LOCAL-BACTERIAL-INFECTION": "  criteria: { match: 'any', checks: [\n    { observationId: 'umbilical_infection', description: 'Umbilicus red or pus', operator: 'in', value: %s },\n    { observationId: 'skin_pustules', description: 'Skin pustules', operator: 'in', value: %s },\n  ] },\n" % (U, PU),
  "WHO-SYI-2019-SEVERE-DISEASE-UNLIKELY": "  criteria: { match: 'all', checks: [\n    { observationId: 'feeding_poorly', description: 'Feeding not poor', operator: 'notIn', value: %s },\n    { observationId: 'convulsions', description: 'No convulsions', operator: 'notIn', value: %s },\n    { observationId: 'respiratory_rate', description: 'RR < 60/min', operator: 'less', value: 60 },\n    { observationId: 'chest_indrawing', description: 'No chest indrawing', operator: 'notEquals', value: 'Present' },\n    { observationId: 'axillary_temperature', description: 'Temp < 37.5 C', operator: 'less', value: 37.5 },\n    { observationId: 'axillary_temperature', description: 'Temp >= 35.5 C', operator: 'greaterOrEqual', value: 35.5 },\n    { observationId: 'movement_only_when_stimulated', description: 'Moves spontaneously', operator: 'notEquals', value: 'Yes' },\n    { observationId: 'umbilical_infection', description: 'No umbilical redness', operator: 'notIn', value: %s },\n    { observationId: 'skin_pustules', description: 'No skin pustules', operator: 'notIn', value: %s },\n  ] },\n" % (F, C, U, PU),
  "WHO-SYI-2019-SEVERE-JAUNDICE": "  criteria: { match: 'any', checks: [\n    { observationId: 'jaundice_onset_day', description: 'Jaundice within 24h', operator: 'lessOrEqual', value: 0 },\n    { observationId: 'jaundice_palms_soles', description: 'Yellow palms/soles', operator: 'equals', value: 'Yes' },\n  ] },\n",
  "WHO-SYI-2019-JAUNDICE": "  criteria: { match: 'all', checks: [\n    { observationId: 'jaundice_present', description: 'Jaundice present', operator: 'notEquals', value: 'No' },\n    { observationId: 'jaundice_onset_day', description: 'After 24h', operator: 'greaterOrEqual', value: 1 },\n    { observationId: 'jaundice_palms_soles', description: 'Palms/soles not yellow', operator: 'notEquals', value: 'Yes' },\n  ] },\n",
  "WHO-SYI-2019-NO-JAUNDICE": "  criteria: { match: 'all', checks: [\n    { observationId: 'jaundice_present', description: 'No jaundice', operator: 'equals', value: 'No' },\n  ] },\n",
  "WHO-SYI-2019-SEVERE-DEHYDRATION": "  criteria: { match: 'count', countThreshold: 2, checks: [\n    { observationId: 'movement_only_when_stimulated', description: 'Movement only when stimulated', operator: 'equals', value: 'Yes' },\n    { observationId: 'sunken_eyes', description: 'Sunken eyes', operator: 'equals', value: 'Yes' },\n    { observationId: 'skin_pinch', description: 'Very slow skin pinch', operator: 'equals', value: 'Goes back very slowly' },\n  ] },\n",
  "WHO-SYI-2019-SOME-DEHYDRATION": "  criteria: { match: 'count', countThreshold: 2, checks: [\n    { observationId: 'sunken_eyes', description: 'Sunken eyes', operator: 'equals', value: 'Yes' },\n    { observationId: 'skin_pinch', description: 'Slow skin pinch', operator: 'in', value: ['Goes back slowly', 'Goes back very slowly'] },\n  ] },\n",
  "WHO-SYI-2019-NO-DEHYDRATION": "  criteria: { match: 'all', checks: [\n    { observationId: 'movement_only_when_stimulated', description: 'Moves spontaneously', operator: 'notEquals', value: 'Yes' },\n    { observationId: 'sunken_eyes', description: 'No sunken eyes', operator: 'notEquals', value: 'Yes' },\n    { observationId: 'skin_pinch', description: 'Immediate skin pinch', operator: 'notIn', value: ['Goes back slowly', 'Goes back very slowly'] },\n  ] },\n",
  "WHO-SYI-2019-FEEDING-PROBLEM-LOW-WEIGHT": "  criteria: { match: 'any', checks: [\n    { observationId: 'breastfeeding_status', description: 'Not exclusive BF', operator: 'notEquals', value: 'Exclusively breastfeeding' },\n    { observationId: 'feeding_change', description: 'Feeding reduced', operator: 'in', value: ['Less than usual', 'Much less or stopped'] },\n    { observationId: 'oral_thrush', description: 'Oral thrush', operator: 'equals', value: 'Yes' },\n  ] },\n",
  "WHO-SYI-2019-NO-FEEDING-PROBLEM": "  criteria: { match: 'all', checks: [\n    { observationId: 'breastfeeding_status', description: 'Exclusive BF', operator: 'equals', value: 'Exclusively breastfeeding' },\n    { observationId: 'feeding_change', description: 'No change', operator: 'equals', value: 'No change' },\n    { observationId: 'oral_thrush', description: 'No thrush', operator: 'notEquals', value: 'Yes' },\n  ] },\n",
}

for rid, block in CR.items():
    marker = "id: '%s'," % rid
    if marker not in c:
        print("FAIL[whoYoungInfant]: rule %s not found" % rid); sys.exit(2)
    idx = c.index(marker)
    ai = c.index("actions:", idx)
    if "criteria:" in c[idx:ai]:
        continue
    c = c[:ai] + block + c[ai:]

open(p, "w").write(c)
print("OK[whoYoungInfant criteria]")
PYEOF

# ===========================================================================
# Phase 5 — verify
# ===========================================================================

echo
echo "=== npm install (only if node_modules missing) ==="
[ -d node_modules ] || npm install

echo
echo "=== npm run typecheck ==="
if npm run typecheck; then ok "typecheck passed"; else warn "typecheck FAILED — see above"; fi

echo
echo "=== npm run build ==="
if npm run build; then ok "build passed"; else warn "build FAILED — see above"; fi

echo
echo "=== npm run fixtures:self-check ==="
if npm run fixtures:self-check; then
  ok "fixture self-check passed"
else
  warn "self-check FAILED"
fi

echo
if [ -f docs/module-self-check-results.json ]; then
  ok "docs/module-self-check-results.json exists"
  echo "  verify: grep '\"passed\"' docs/module-self-check-results.json"
fi

echo
echo "======================= CHUNK D DONE ======================="
echo "Full pipeline check: npm run verify"
echo "Start demo:          npm run dev"
echo "============================================================"