import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppData,
  Country,
  Disposition,
  Drone,
  Encounter,
  Facility,
  Mother,
  Observation,
  Patient,
  Session,
  UserAccount,
} from './types';
import { BrandFooter } from './components/Brand';
import Navbar, { Page } from './components/Navbar';
import SignInPage from './components/SignInPage';
import NewEncounterModal from './components/NewEncounterModal';
import EncounterDetail, { EncounterActions } from './components/EncounterDetail';
import HomePage from './pages/HomePage';
import CareQueuePage from './pages/CareQueuePage';
import EquipmentPage from './pages/EquipmentPage';
import WorkflowPage from './pages/WorkflowPage';
import ProgramPage from './pages/ProgramPage';
import GovernancePage from './pages/GovernancePage';
import { exportData, loadData, loadSession, resetData, saveData, saveSession } from './services/dataStore';
import {
  DecisionInput,
  DecisionValidation,
  advanceDeliveryState,
  amendDecision as amendDecisionRecord,
  attachDraft,
  canSignDecision,
  canViewEncounter,
  completeFollowUp as completeFollowUpRecord,
  completeReferral as completeReferralRecord,
  escalateUrgentCare,
  logFailure as logFailureRecord,
  requestMoreInformation,
  reviewDraft,
  saveObservations as saveObservationsRecord,
  signDecision as signDecisionRecord,
  updateLogistics as updateLogisticsRecord,
  validateDecision,
} from './services/clinicalWorkflow';
import { prepareAiDraft, validateDecisionOnServer } from './services/apiClient';
import { formatDateTime } from './utils/format';

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(() => loadData());
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [page, setPage] = useState<Page>('home');
  const [newEncounterOpen, setNewEncounterOpen] = useState(false);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

  useEffect(() => {
    if (!saveData(data)) {
      setSaveWarning('This browser could not confirm saving the local demo records. The encounter may not remain after reload. Check browser storage settings and available space.');
    } else {
      setSaveWarning(null);
    }
  }, [data]);
  useEffect(() => saveSession(session), [session]);

  const pilotCountry = useMemo(
    () => data.countries.find((c) => c.isImplemented) ?? data.countries[0] ?? null,
    [data.countries],
  );

  const visibleEncounters = useMemo(() => {
    if (!session) return [];
    return data.encounters.filter((encounter) => canViewEncounter(session.user, encounter));
  }, [data.encounters, session]);

  const awaitingReviewCount = visibleEncounters.filter((encounter) =>
    ['Awaiting physician review', 'AI draft ready', 'More information requested'].includes(encounter.status),
  ).length;

  const selectedEncounter = data.encounters.find((e) => e.id === selectedEncounterId) ?? null;
  const selectedPatient = selectedEncounter
    ? data.patients.find((p) => p.id === selectedEncounter.patientId) ?? null
    : null;
  const selectedCountry = selectedEncounter
    ? data.countries.find((c) => c.id === selectedEncounter.countryId) ?? null
    : null;
  const selectedDrone = selectedEncounter?.assignedDroneId
    ? data.drones.find((d) => d.id === selectedEncounter.assignedDroneId) ?? null
    : null;

  const updateEncounter = useCallback((next: Encounter) => {
    setData((prev) => ({
      ...prev,
      encounters: prev.encounters.map((e) => (e.id === next.id ? next : e)),
    }));
  }, []);

  const handleSignIn = (user: UserAccount) => {
    setSession({ user, signedInAt: new Date().toISOString(), mode: 'demo-local' });
    setPage('home');
  };

  const handleSignOut = () => {
    setSession(null);
    setSelectedEncounterId(null);
    setPage('home');
  };

  const handleCreateEncounter = (mother: Mother, patient: Patient, encounter: Encounter) => {
    setData((prev) => ({
      ...prev,
      mothers: [mother, ...prev.mothers],
      patients: [patient, ...prev.patients],
      encounters: [encounter, ...prev.encounters],
    }));
    setSelectedEncounterId(encounter.id);
  };

  const actions: EncounterActions = {
    saveObservations: (encounterId, observations: Observation[]) => {
      const encounter = data.encounters.find((e) => e.id === encounterId);
      if (!encounter || !session) return;
      updateEncounter(saveObservationsRecord(encounter, session.user, observations));
    },
    prepareDraft: async (encounterId) => {
      const encounter = data.encounters.find((e) => e.id === encounterId);
      if (!encounter || !session) return;
      const patient = data.patients.find((p) => p.id === encounter.patientId);
      if (!patient) throw new Error('Patient record is missing.');
      const mother = data.mothers.find((m) => m.id === encounter.motherId) ?? null;
      const country = data.countries.find((c) => c.id === encounter.countryId) ?? null;
      const candidate = country?.protocols.find(
        (p) => p.ageProtocol === 'Young Infant',
      );
      
      const protocol =
        candidate?.clinicalApproval === 'Approved by clinical lead' &&
        Boolean(candidate.approvedBy?.trim()) &&
        Boolean(candidate.approvedAt) &&
        !candidate.approvedBy?.includes('demo control')
          ? candidate
          : null;
      const draft = await prepareAiDraft(
        encounter,
        patient,
        mother,
        protocol,
        pilotCountry?.localLanguage ?? 'en',
        session.user,
      );
      updateEncounter(attachDraft(encounter, session.user, draft));
    },
    requestMoreInfo: (encounterId, detail) => {
      const encounter = data.encounters.find((e) => e.id === encounterId);
      if (!encounter || !session) return;
      updateEncounter(requestMoreInformation(encounter, session.user, detail));
    },
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
    amendDecision: (encounterId, disposition: Disposition, reason: string) => {
      const encounter = data.encounters.find((e) => e.id === encounterId);
      if (!encounter || !session) return;
      updateEncounter(amendDecisionRecord(encounter, session.user, disposition, reason));
    },
    escalate: (encounterId, reason, facility) => {
      const encounter = data.encounters.find((e) => e.id === encounterId);
      if (!encounter || !session) return;
      updateEncounter(escalateUrgentCare(encounter, session.user, reason, facility));
    },
    completeFollowUp: (encounterId, outcome) => {
      const encounter = data.encounters.find((e) => e.id === encounterId);
      if (!encounter || !session) return;
      updateEncounter(completeFollowUpRecord(encounter, session.user, outcome));
    },
    completeReferral: (encounterId, outcome) => {
      const encounter = data.encounters.find((e) => e.id === encounterId);
      if (!encounter || !session) return;
      updateEncounter(completeReferralRecord(encounter, session.user, outcome));
    },
    logFailure: (encounterId, type, detail) => {
      const encounter = data.encounters.find((e) => e.id === encounterId);
      if (!encounter || !session) return;
      updateEncounter(logFailureRecord(encounter, session.user, type, detail));
    },
    advanceDeliveryState: (encounterId, next) => {
      const encounter = data.encounters.find((e) => e.id === encounterId);
      if (!encounter || !session) return;
      updateEncounter(advanceDeliveryState(encounter, session.user, next));
    },
    reviewDraft: (encounterId, status, note) => {
      const encounter = data.encounters.find((e) => e.id === encounterId);
      if (!encounter || !session) return;
      updateEncounter(reviewDraft(encounter, session.user, status, note));
    },
    updateLogistics: (encounterId, logistics) => {
      const encounter = data.encounters.find((e) => e.id === encounterId);
      if (!encounter || !session) return;
      updateEncounter(updateLogisticsRecord(encounter, session.user, logistics));
    },
  };

  const handleRecordCheck = (droneId: string, checkId: string) => {
    if (!session) return;
    const now = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      drones: prev.drones.map((drone): Drone => {
        if (drone.id !== droneId) return drone;
        return {
          ...drone,
          readiness: drone.readiness.map((check) =>
            check.id === checkId
              ? {
                  ...check,
                  status: 'Simulated pass',
                  evidence: 'Demonstration check recorded from the UI. Not an airborne test, measurement, or airworthiness review.',
                  checkedAt: now,
                  checkedBy: session.user.name,
                  evidenceClass: 'simulated',
                }
              : check,
          ),
          activityLog: [
            { timestamp: now, event: 'Demonstration readiness check recorded', details: 'Simulated only; no flight evidence.', evidenceClass: 'simulated' },
            ...drone.activityLog,
          ],
        };
      }),
    }));
  };

  const handleApproveProtocol = (protocolId: string) => {
    if (!session) return;
    const now = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      countries: prev.countries.map((country): Country => ({
        ...country,
        protocols: country.protocols.map((protocol) =>
          protocol.id === protocolId
        ? {
          ...protocol,
          demoReview: {
            recordedBy: session.user.name,
            recordedAt: now,
          },
        }
      : protocol
        ),
      })),
    }));
  };

  const handleReset = () => {
    if (!window.confirm('Reset all local demonstration data to the seeded synthetic cases?')) return;
    setData(resetData());
    setSelectedEncounterId(null);
  };

  if (!session) {
    return <SignInPage users={data.users} facilities={data.facilities} onSignIn={handleSignIn} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'care':
        return (
          <CareQueuePage
            encounters={visibleEncounters}
            patients={data.patients}
            countries={data.countries}
            facilities={data.facilities}
            session={session}
            onOpenEncounter={(encounter) => setSelectedEncounterId(encounter.id)}
            onNewEncounter={() => setNewEncounterOpen(true)}
          />
        );
      case 'workflow':
        return <WorkflowPage />;
      case 'equipment':
        return (
          <EquipmentPage
            drones={data.drones}
            countries={data.countries}
            session={session}
            onRecordCheck={handleRecordCheck}
          />
        );
      case 'program':
        return <ProgramPage countries={data.countries} />;
      case 'governance':
        if (session.user.role === 'Field Officer') return <ProgramPage countries={data.countries} />;
        return (
          <GovernancePage
            countries={data.countries}
            facilities={data.facilities}
            users={data.users}
            session={session}
            onApproveProtocol={handleApproveProtocol}
            onResetData={handleReset}
            onExportData={() => exportData(data)}
          />
        );
      case 'home':
      default:
        return (
          <HomePage
            session={session}
            encounters={visibleEncounters}
            patients={data.patients}
            countries={data.countries}
            drones={data.drones}
            facilities={data.facilities}
            onOpenEncounter={(encounter) => setSelectedEncounterId(encounter.id)}
            onNewEncounter={() => setNewEncounterOpen(true)}
            onGoToCare={() => setPage('care')}
            onGoToProgram={() => setPage('program')}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-brand-background">
      <Navbar
        currentPage={page}
        setCurrentPage={setPage}
        session={session}
        facilities={data.facilities}
        awaitingReviewCount={awaitingReviewCount}
        onSignOut={handleSignOut}
      />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          <header className="mb-4 hidden items-center justify-between rounded-xl border border-brand-secondary/20 bg-brand-surface/40 px-4 py-2 text-[11px] text-brand-text-secondary lg:flex">
            <span>
              Demonstration environment · synthetic data · {formatDateTime(session.signedInAt)}
            </span>
            <span className="font-semibold text-brand-accent">Not clinically validated</span>
          </header>
          {saveWarning && <div role="alert" className="mb-4 rounded-lg border border-status-red/40 bg-status-red/10 px-4 py-3 text-sm text-status-red">{saveWarning}</div>}
          {renderPage()}
          <BrandFooter onOpenProgram={() => setPage('program')} onOpenSafety={() => setPage('program')} />
        </div>
      </main>

      {newEncounterOpen && (
        <NewEncounterModal
          isOpen={newEncounterOpen}
          onClose={() => setNewEncounterOpen(false)}
          onCreate={handleCreateEncounter}
          user={session.user}
          facilities={data.facilities}
          administrativeAreas={data.administrativeAreas}
          countries={data.countries}
        />
      )}

      {selectedEncounter && selectedPatient && (
        <EncounterDetail
          encounter={selectedEncounter}
          mother={data.mothers.find((m) => m.id === selectedEncounter.motherId) ?? null}
          patient={selectedPatient}
          country={selectedCountry}
          facilities={data.facilities}
          session={session}
          drone={selectedDrone}
          actions={actions}
          saveStatus={saveWarning ? 'failed' : 'saved locally'}
          sessions={data.assessmentSessions || []}
          evidence={data.assessmentEvidence || []}
          onSaveSession={(sess) => {
            setData((prev) => ({
              ...prev,
              assessmentSessions: [
                sess,
                ...(prev.assessmentSessions || []).filter((s) => s.id !== sess.id),
              ],
            }));
          }}
          onSaveEvidence={(ev) => {
            setData((prev) => ({
              ...prev,
              assessmentEvidence: [
                ev,
                ...(prev.assessmentEvidence || []).filter((e) => e.id !== ev.id),
              ],
            }));
          }}
          onUpdateConsent={(consent) => {
            const updated = { ...selectedEncounter, consent };
            updateEncounter(updated);
          }}
          onClose={() => setSelectedEncounterId(null)}
        />
      )}
    </div>
  );
};

export default App;
