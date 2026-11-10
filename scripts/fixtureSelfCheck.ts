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
