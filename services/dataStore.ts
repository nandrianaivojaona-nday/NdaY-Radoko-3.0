import { AppData, Session } from '../types';
import { SEED_DATA } from '../data/seed';

export const DATA_KEY = 'nday-radoko.demo.v3';
export const SESSION_KEY = 'nday-radoko.demo.session.v1';
export const DATA_SCHEMA_VERSION = 3;

const isBrowser = typeof window !== 'undefined';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const loadData = (): AppData => {
  if (!isBrowser) return clone(SEED_DATA);
  try {
    const raw = window.localStorage.getItem(DATA_KEY);
    if (!raw) return clone(SEED_DATA);
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed || parsed.schemaVersion !== DATA_SCHEMA_VERSION) {
      return clone(SEED_DATA);
    }
    const assessmentSessions = Array.isArray(parsed.assessmentSessions) ? parsed.assessmentSessions : [];
    const assessmentEvidence = Array.isArray(parsed.assessmentEvidence) ? parsed.assessmentEvidence : [];
    const encounters = (parsed.encounters || clone(SEED_DATA.encounters)).map((enc) => ({
      ...enc,
      consent: {
        ...enc.consent,
        audioRecordingAllowed: enc.consent?.audioRecordingAllowed ?? true,
        videoRecordingAllowed: enc.consent?.videoRecordingAllowed ?? false,
      },
    }));

    return {
      ...clone(SEED_DATA),
      ...parsed,
      encounters,
      assessmentSessions,
      assessmentEvidence,
      users: parsed.users?.length ? parsed.users : clone(SEED_DATA.users),
      facilities: [...new Map([...(SEED_DATA.facilities ?? []), ...(parsed.facilities ?? [])].map((facility) => [facility.id, facility])).values()],
      administrativeAreas: [...new Map([...(parsed.administrativeAreas ?? []), ...(SEED_DATA.administrativeAreas ?? [])].map((area) => [area.id, area])).values()],
    };
  } catch (error) {
    console.error('Could not read the local demonstration store; using seed data.', error);
    return clone(SEED_DATA);
  }
};

export const saveData = (data: AppData): boolean => {
  if (!isBrowser) return false;
  try {
    window.localStorage.setItem(DATA_KEY, JSON.stringify({ ...data, schemaVersion: DATA_SCHEMA_VERSION }));
    const saved = window.localStorage.getItem(DATA_KEY);
    if (!saved) return false;
    const parsed = JSON.parse(saved) as AppData;
    return parsed.schemaVersion === DATA_SCHEMA_VERSION && parsed.encounters.length === data.encounters.length;
  } catch (error) {
    console.error('Could not persist the local demonstration store.', error);
    return false;
  }
};

export const resetData = (): AppData => {
  if (isBrowser) {
    window.localStorage.removeItem(DATA_KEY);
  }
  return clone(SEED_DATA);
};

export const loadSession = (): Session | null => {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
};

export const saveSession = (session: Session | null): void => {
  if (!isBrowser) return;
  try {
    if (!session) window.localStorage.removeItem(SESSION_KEY);
    else window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Could not persist the demo session.', error);
  }
};

export const exportData = (data: AppData): void => {
  if (!isBrowser) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `nday-radoko-demo-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};
