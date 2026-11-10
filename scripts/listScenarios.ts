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
