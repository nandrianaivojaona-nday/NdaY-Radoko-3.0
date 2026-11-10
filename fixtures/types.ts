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
