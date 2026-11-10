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
