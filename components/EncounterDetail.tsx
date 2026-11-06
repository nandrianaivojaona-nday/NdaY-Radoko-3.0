import React, { useEffect, useMemo, useState } from 'react';
import {
  Country,
  DecisionAmendment,
  DeliveryState,
  Disposition,
  DraftReviewStatus,
  Drone,
  Encounter,
  Facility,
  FollowUp,
  LogisticsMission,
  Observation,
  Patient,
  Referral,
  Session,
  Mother
} from '../types';
import {
  advanceDeliveryState,
  canCompleteFollowUp,
  canCompleteReferral,
  canPrepareDraft,
  canRecordObservations,
  canRequestMoreInformation,
  canSignDecision,
  DecisionInput,
  DecisionValidation,
  DELIVERY_STATES,
  reviewDraft,
  updateLogistics,
  validateDecision,
} from '../services/clinicalWorkflow';
import { summariseCompleteness } from '../data/observations';
import { EncounterStatusBadge, EvidenceBadge, Notice, QualityBadge } from './Badges';
import ObservationPanel from './ObservationPanel';
import { daysFromNow, formatDateTime, toDateTimeLocal } from '../utils/format';

export interface EncounterActions {
  saveObservations: (encounterId: string, observations: Observation[]) => void;
  prepareDraft: (encounterId: string) => Promise<void>;
  requestMoreInfo: (encounterId: string, detail: string) => void;
  signDecision: (encounterId: string, input: DecisionInput) => DecisionValidation;
  amendDecision: (encounterId: string, disposition: Disposition, reason: string) => void;
  escalate: (encounterId: string, reason: string, facility: string) => void;
  completeFollowUp: (encounterId: string, outcome: string) => void;
  completeReferral: (encounterId: string, outcome: string) => void;
  logFailure: (encounterId: string, type: string, detail: string) => void;
  advanceDeliveryState: (encounterId: string, next: DeliveryState) => void;
  reviewDraft: (encounterId: string, status: DraftReviewStatus, note: string) => void;
  updateLogistics: (encounterId: string, logistics: LogisticsMission) => void;
}

interface EncounterDetailProps {
  encounter: Encounter;
  mother: Mother | null;
  patient: Patient;
  country: Country | null;
  facilities: Facility[];
  session: Session;
  drone: Drone | null;
  actions: EncounterActions;
  onClose: () => void;
}

type Tab = 'overview' | 'evidence' | 'draft' | 'decision' | 'outcome' | 'history';

const DEFAULT_SAFETY =
  'Seek care immediately if the baby stops feeding, has convulsions, vomits everything, becomes very sleepy or difficult to wake, breathes fast or with chest indrawing, or develops yellow palms or soles. Do not wait for another call.';

const dispositionTone: Record<Disposition, string> = {
  'Home follow-up': 'border-brand-mint/40 bg-brand-mint/10',
  'In-person assessment': 'border-brand-accent/40 bg-brand-accent/10',
  'Urgent referral': 'border-status-red/40 bg-status-red/10',
};

const EncounterDetail: React.FC<EncounterDetailProps> = ({
  encounter,
  patient,
  mother,
  country,
  facilities,
  session,
  drone,
  actions,
  onClose,
}) => {
  const [tab, setTab] = useState<Tab>('overview');
  const [draftObservations, setDraftObservations] = useState<Observation[]>(encounter.observations);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [decision, setDecision] = useState<DecisionInput>({
    disposition: 'Home follow-up',
    workingAssessment: '',
    instructionsForCaregiver: '',
    safetyNetting: DEFAULT_SAFETY,
    followUpDueAt: daysFromNow(2),
    followUpMethod: 'Phone call',
    referralFacility: facilities.find((f) => f.level !== 'Community outreach team')?.name ?? '',
    referralUrgency: 'Within 24 hours',
    referralReason: '',
    incompleteEvidenceAcknowledged: false,
    incompleteEvidenceReason: '',
  });
  const [decisionErrors, setDecisionErrors] = useState<string[]>([]);

  const [moreInfo, setMoreInfo] = useState('');
  const [urgentReason, setUrgentReason] = useState('Caregiver reported a danger sign.');
  const [urgentFacility, setUrgentFacility] = useState(
    facilities.find((f) => f.level === 'Referral hospital')?.name ?? '',
  );
  const [failureType, setFailureType] = useState('Connectivity loss');
  const [failureDetail, setFailureDetail] = useState('');
  const [followUpOutcome, setFollowUpOutcome] = useState('');
  const [referralOutcome, setReferralOutcome] = useState('');
  const [amendDisposition, setAmendDisposition] = useState<Disposition>(encounter.physicianDecision?.disposition ?? 'Home follow-up');
  const [amendReason, setAmendReason] = useState('');
  const [deliveryNext, setDeliveryNext] = useState<DeliveryState>(encounter.deliveryState);
  const [draftReviewStatus, setDraftReviewStatus] = useState<DraftReviewStatus>('Accepted');
  const [draftReviewNote, setDraftReviewNote] = useState('');
  const [logisticsMode, setLogisticsMode] = useState<LogisticsMission['mode']>(encounter.logistics.mode);
  const [logisticsStatus, setLogisticsStatus] = useState<LogisticsMission['status']>(encounter.logistics.status);
  const [logisticsNote, setLogisticsNote] = useState(encounter.logistics.note);
  const [logisticsOutcome, setLogisticsOutcome] = useState(encounter.logistics.deliveryOutcome);

  useEffect(() => {
    setDraftObservations(encounter.observations);
  }, [encounter.id, encounter.observations]);

  useEffect(() => {
    setMessage(null);
    setError(null);
    setDecisionErrors([]);
  }, [encounter.id]);

  const summary = useMemo(() => summariseCompleteness(encounter.observations), [encounter.observations]);
  const canSign = canSignDecision(session.user, encounter);
  const canRecord = canRecordObservations(session.user, encounter);
  const canDraft = canPrepareDraft(session.user, encounter);
  const canAsk = canRequestMoreInformation(session.user, encounter);
  const facility = facilities.find((f) => f.id === encounter.facilityId);

  const handleSaveObservations = () => {
    setError(null);
    if (!encounter.consent.obtained) {
      setError('Consent must be recorded before observations can be saved.');
      return;
    }
    actions.saveObservations(encounter.id, draftObservations);
    setMessage('Evidence saved. Completeness and quality flags were updated.');
  };

  const handlePrepareDraft = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await actions.prepareDraft(encounter.id);
      setMessage('Documentation draft prepared. It is still awaiting physician review.');
      setTab('draft');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not prepare a draft.');
    } finally {
      setBusy(false);
    }
  };

  const handleSign = () => {
    setError(null);
    const validation = validateDecision(encounter, decision);
    if (!validation.valid) {
      setDecisionErrors(validation.errors);
      return;
    }
    const result = actions.signDecision(encounter.id, decision);
    if (!result.valid) {
      setDecisionErrors(result.errors);
      return;
    }
    setDecisionErrors([]);
    setMessage('Decision signed. The encounter is now in the disposition pathway.');
    setTab('outcome');
  };

  const handleEscalate = () => {
    if (!urgentReason.trim() || !urgentFacility.trim()) {
      setError('Record a reason and a receiving facility for urgent escalation.');
      return;
    }
    actions.escalate(encounter.id, urgentReason.trim(), urgentFacility.trim());
    setMessage('Urgent referral recorded without waiting for the AI draft or a flight.');
    setTab('outcome');
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'evidence', label: `Evidence (${summary.requiredAssessed}/${summary.requiredTotal})` },
    { id: 'draft', label: 'AI draft' },
    { id: 'decision', label: 'Physician decision' },
    { id: 'outcome', label: 'Outcome' },
    { id: 'history', label: `History (${encounter.history.length})` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 backdrop-blur-sm md:p-4">
      <div className="surface-card flex h-full max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden">
        <header className="border-b border-brand-secondary/25 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-brand-primary">{encounter.id}</p>
                <EncounterStatusBadge status={encounter.status} />
                {encounter.safetyEscalation.triggered && (
                  <span className="badge bg-status-red/15 text-status-red">Urgent care triggered</span>
                )}
                {!encounter.consent.obtained && (
                  <span className="badge bg-status-yellow/15 text-status-yellow">Consent incomplete</span>
                )}
              </div>
              <h2 className="mt-1 text-xl font-bold text-brand-text-primary">{patient.name}
                {mother && (
                  <span className="ml-2 text-sm font-normal text-brand-text-secondary">
                    · linked to {mother.name}
                  </span>
                )}</h2>
              <p className="text-sm text-brand-text-secondary">
                {patient.ageLabel} · {patient.sex} · {patient.village}, {patient.district} · caregiver {patient.caregiverName} ({patient.caregiverRelationship})
              </p>
              <p className="mt-1 text-xs text-brand-text-secondary">
                Receiving facility: {facility?.name ?? 'Unknown'} · Mode: {encounter.equipmentMode}
                {drone ? ` · Equipment: ${drone.name} (${drone.status})` : ''}
              </p>
            </div>
            <button type="button" onClick={onClose} className="btn-ghost px-2 py-1 text-xs">
              Close ✕
            </button>
          </div>

          <nav className="mt-4 flex gap-1 overflow-x-auto">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === item.id ? 'bg-brand-primary/20 text-brand-primary' : 'text-brand-text-secondary hover:bg-brand-raised'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
          {message && <Notice tone="success" className="mb-4">{message}</Notice>}
          {error && <Notice tone="critical" className="mb-4">{error}</Notice>}
          {mother && (
            <div className="surface-muted p-4">
              <h3 className="text-sm font-bold text-brand-text-primary">Linked mother record</h3>
              <p className="text-xs text-brand-text-secondary mt-1">
                {mother.name} · {mother.village}, {mother.district}
              </p>
              {mother.reportedNeeds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {mother.reportedNeeds.map((n) => (
                    <span key={n} className="badge bg-brand-accent/10 text-brand-accent text-[10px]">{n}</span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[11px] text-brand-text-secondary/80">
                Maternal observations and needs are recorded separately from the infant’s observations.
              </p>
            </div>
          )}

          {tab === 'overview' && (
            <div className="space-y-5">
              {summary.requiredMissing.length > 0 && (
                <Notice tone="warning" title="Evidence is incomplete">
                  {summary.requiredMissing.length} required observation(s) lack usable evidence. This is recorded as
                  incomplete, not normal. A physician may sign only after acknowledging it and recording a reason.
                </Notice>
              )}

              {encounter.consent.obtained && encounter.consent.obtainedAt && (
                <div className="grid gap-3 md:grid-cols-3">
                  <InfoCard label="Consent recorded" value={formatDateTime(encounter.consent.obtainedAt)} />
                  <InfoCard label="Image capture" value={encounter.consent.imageCaptureAllowed ? 'Allowed' : 'Not allowed'} />
                  <InfoCard label="Data classification" value={patient.dataClassification} />
                </div>
              )}

              {!encounter.consent.obtained && (
                <Notice tone="critical" title="Consent not recorded">
                  Do not collect observations. Record consent with the caregiver first; this prototype does not provide
                  an e-consent workflow.
                </Notice>
              )}

              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="surface-muted p-4">
                  <h3 className="text-sm font-bold text-brand-text-primary">Clinical pathway</h3>
                  <ol className="mt-3 space-y-3">
                    {[
                      ['Assessment initiated', Boolean(encounter.createdAt)],
                      ['Evidence collected', summary.requiredAssessed > 0],
                      ['AI draft prepared', Boolean(encounter.aiDraft)],
                      ['Physician review', Boolean(encounter.physicianDecision)],
                      ['Disposition', Boolean(encounter.physicianDecision)],
                      ['Follow-up or referral outcome', Boolean(encounter.followUp?.completedAt || encounter.referral?.completedAt)],
                    ].map(([label, done], index) => (
                      <li key={String(label)} className="flex items-center gap-3 text-sm">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${done ? 'bg-brand-mint/20 text-brand-mint' : 'bg-brand-surface text-brand-text-secondary'}`}>
                          {done ? '✓' : index + 1}
                        </span>
                        <span className={done ? 'text-brand-text-primary' : 'text-brand-text-secondary'}>{label}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="space-y-3">
                  <div className="surface-muted p-4">
                    <h3 className="text-sm font-bold text-brand-text-primary">What the service can do now</h3>
                    <ul className="mt-2 space-y-1.5 text-xs text-brand-text-secondary">
                      <li>• Record structured observations with source and quality.</li>
                      <li>• Prepare a clearly labelled AI documentation draft.</li>
                      <li>• Route the evidence to a physician for a signed decision.</li>
                      <li>• Record follow-up or referral completion.</li>
                    </ul>
                  </div>
                  <div className="surface-muted p-4">
                    <h3 className="text-sm font-bold text-brand-text-primary">What it does not do</h3>
                    <ul className="mt-2 space-y-1.5 text-xs text-brand-text-secondary">
                      <li>• Diagnose, prescribe, or replace in-person care.</li>
                      <li>• Operate a real drone or connect to a health record.</li>
                      <li>• Prove diagnostic accuracy or mortality impact.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canDraft && (
                  <button type="button" className="btn-primary" onClick={handlePrepareDraft} disabled={busy}>
                    {busy ? 'Preparing…' : encounter.aiDraft ? 'Regenerate documentation draft' : 'Prepare documentation draft'}
                  </button>
                )}
                {canRecord && (
                  <button type="button" className="btn-secondary" onClick={() => setTab('evidence')}>
                    Record evidence
                  </button>
                )}
                {canSign && (
                  <button type="button" className="btn-secondary" onClick={() => setTab('decision')}>
                    Physician review
                  </button>
                )}
                <button type="button" className="btn-danger" onClick={() => setTab('outcome')}>
                  Urgent care pathway
                </button>
              </div>

              <TransmissionCard
                deliveryState={encounter.deliveryState}
                next={deliveryNext}
                onNext={setDeliveryNext}
                onAdvance={() => actions.advanceDeliveryState(encounter.id, deliveryNext)}
              />

              <div className="surface-muted p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-text-secondary">Caregiver-reported concerns</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {patient.reportedConcerns.length > 0 ? (
                    patient.reportedConcerns.map((concern) => (
                      <span key={concern} className="badge bg-status-yellow/10 text-status-yellow">{concern}</span>
                    ))
                  ) : (
                    <span className="text-xs text-brand-text-secondary">None recorded.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'evidence' && (
            <div className="space-y-5">
              {!encounter.consent.obtained && (
                <Notice tone="critical" title="Consent required">
                  Evidence collection is blocked until consent is recorded. This is a demonstration of the intended
                  control, not a complete consent workflow.
                </Notice>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-brand-text-primary">Young-infant observations</h3>
                  <p className="text-xs text-brand-text-secondary">
                    Proposed catalogue — the clinical partner must ratify every row before pilot use. Not a clinical protocol.
                  </p>
                </div>
                <EvidenceBadge status="working" label="Structured capture working" />
              </div>
              <ObservationPanel
                observations={draftObservations}
                onChange={setDraftObservations}
                onSave={handleSaveObservations}
                user={session.user}
                disabled={!canRecord || !encounter.consent.obtained}
              />

              <section className="surface-muted p-4">
                <h3 className="text-sm font-bold text-brand-text-primary">Operational failure log</h3>
                <p className="mt-1 text-xs text-brand-text-secondary">
                  A failed flight or unusable measurement must not be silently converted into a normal finding.
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-[0.8fr_1.2fr_auto]">
                  <select className="input-field py-2 text-xs" value={failureType} onChange={(e) => setFailureType(e.target.value)}>
                    <option>Connectivity loss</option>
                    <option>Unusable image</option>
                    <option>Device measurement failure</option>
                    <option>Flight not possible</option>
                    <option>Session interrupted</option>
                    <option>Other</option>
                  </select>
                  <input
                    className="input-field py-2 text-xs"
                    placeholder="What happened and how was it handled?"
                    value={failureDetail}
                    onChange={(e) => setFailureDetail(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => {
                      if (!failureDetail.trim()) return;
                      actions.logFailure(encounter.id, failureType, failureDetail.trim());
                      setFailureDetail('');
                    }}
                  >
                    Log failure
                  </button>
                </div>
                {encounter.failureEvents.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {encounter.failureEvents.map((event, index) => (
                      <li key={`${event.at}-${index}`} className="rounded-lg border border-brand-secondary/20 bg-brand-background/40 p-2 text-xs">
                        <span className="font-semibold text-brand-text-primary">{event.type}</span> · {formatDateTime(event.at)}
                        <p className="text-brand-text-secondary">{event.detail}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {tab === 'draft' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-brand-text-primary">AI documentation draft</h3>
                  <p className="text-xs text-brand-text-secondary">
                    The draft is not a diagnosis and cannot sign. It is retained separately from the physician decision.
                  </p>
                </div>
                {encounter.aiDraft && <EvidenceBadge status={encounter.aiDraft.simulated ? 'simulated' : 'working'} />}
              </div>

              {encounter.aiDraft ? (
                <>
                  <div className="grid gap-3 md:grid-cols-4">
                    <InfoCard label="Model" value={encounter.aiDraft.model} />
                    <InfoCard label="Generated" value={formatDateTime(encounter.aiDraft.generatedAt)} />
                    <InfoCard label="Protocol" value={encounter.aiDraft.protocolVersion ? `v${encounter.aiDraft.protocolVersion}` : 'None attached'} />
                    <InfoCard label="Evidence fingerprint" value={encounter.aiDraft.evidenceFingerprint} />
                  </div>
                  <Notice tone={encounter.aiDraft.simulated ? 'warning' : 'info'} title="Draft status">
                    {encounter.aiDraft.limitations}
                  </Notice>
                  <div className="surface-muted whitespace-pre-wrap p-4 text-sm leading-relaxed text-brand-text-secondary">
                    {encounter.aiDraft.text}
                  </div>
                  {canDraft && (
                    <button type="button" className="btn-secondary" onClick={handlePrepareDraft} disabled={busy}>
                      {busy ? 'Preparing…' : 'Regenerate draft from current evidence'}
                    </button>
                  )}
                </>
              ) : (
                <div className="surface-muted p-6 text-center">
                  <p className="text-sm text-brand-text-secondary">No draft has been prepared for this encounter.</p>
                  {canDraft && (
                    <button type="button" className="btn-primary mt-4" onClick={handlePrepareDraft} disabled={busy}>
                      {busy ? 'Preparing…' : 'Prepare documentation draft'}
                    </button>
                  )}
                </div>
              )}

              {encounter.aiDraft && (
                <div className="surface-muted p-4">
                  <h4 className="text-sm font-bold text-brand-text-primary">Physician review of the AI summary</h4>
                  <p className="mt-1 text-xs text-brand-text-secondary">
                    The physician can accept, reject, or amend the AI summary. This is recorded separately from the
                    signed decision and from the draft itself.
                  </p>
                  {encounter.draftReview ? (
                    <p className="mt-2 rounded-lg bg-brand-background p-2 text-xs text-brand-text-primary">
                      {encounter.draftReview.status} by {encounter.draftReview.byName} · {formatDateTime(encounter.draftReview.at)}
                      {encounter.draftReview.note ? ` — ${encounter.draftReview.note}` : ''}
                    </p>
                  ) : session.user.role === 'Physician' ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="flex gap-1.5">
                        {(['Accepted', 'Rejected', 'Amended'] as DraftReviewStatus[]).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setDraftReviewStatus(status)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${draftReviewStatus === status ? 'bg-brand-primary text-white' : 'bg-brand-background text-brand-text-secondary hover:bg-brand-raised'}`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                      <input
                        className="input-field text-xs"
                        placeholder="Note (required for reject/amend)"
                        value={draftReviewNote}
                        onChange={(e) => setDraftReviewNote(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        disabled={(draftReviewStatus !== 'Accepted' && !draftReviewNote.trim())}
                        onClick={() => {
                          actions.reviewDraft(encounter.id, draftReviewStatus, draftReviewNote);
                          setDraftReviewNote('');
                        }}
                      >
                        Record summary review
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-brand-text-secondary">Awaiting physician review of the summary.</p>
                  )}
                </div>
              )}

              {canAsk && (
                <div className="surface-muted p-4">
                  <h4 className="text-sm font-bold text-brand-text-primary">Request more information</h4>
                  <p className="mt-1 text-xs text-brand-text-secondary">
                    The physician can return the encounter to the field team without signing a disposition.
                  </p>
                  <textarea
                    className="input-field mt-3 text-xs"
                    rows={2}
                    value={moreInfo}
                    onChange={(e) => setMoreInfo(e.target.value)}
                    placeholder="What is missing or unclear?"
                  />
                  <button
                    type="button"
                    className="btn-secondary mt-2 text-xs"
                    onClick={() => {
                      if (!moreInfo.trim()) return;
                      actions.requestMoreInfo(encounter.id, moreInfo.trim());
                      setMoreInfo('');
                      setMessage('More information requested. The encounter returned to the field team.');
                    }}
                  >
                    Send request
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'decision' && (
            <div className="space-y-5">
              {encounter.physicianDecision ? (
                <SignedDecision encounter={encounter} />
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-brand-text-primary">Physician decision</h3>
                      <p className="text-xs text-brand-text-secondary">
                        Only a physician account assigned to this facility can sign. The signature records identity,
                        facility, time, evidence fingerprint, and any acknowledgement of incomplete evidence.
                      </p>
                    </div>
                    <EvidenceBadge status="working" label="Signature gate working" />
                  </div>

                  {!canSign && (
                    <Notice tone="warning" title="Signing not available to this account">
                      {session.user.role !== 'Physician'
                        ? 'You are signed in with a non-physician role. A physician must sign the decision.'
                        : 'This encounter is not assigned to your facility or is not in a reviewable state.'}
                    </Notice>
                  )}

                  {!['Under review', 'Received by facility', 'Assigned to physician'].includes(encounter.deliveryState) && (
                    <Notice tone="warning" title="Transmission state">
                      This encounter is still “{encounter.deliveryState}”. A local draft must not be presented as
                      received by the physician. Advance the transmission state before signing.
                    </Notice>
                  )}

                  {decisionErrors.length > 0 && (
                    <Notice tone="critical" title="Decision cannot be signed yet">
                      <ul className="list-disc pl-4">
                        {decisionErrors.map((e) => <li key={e}>{e}</li>)}
                      </ul>
                    </Notice>
                  )}

                  <div className="grid gap-2 md:grid-cols-3">
                    {(['Home follow-up', 'In-person assessment', 'Urgent referral'] as Disposition[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDecision((prev) => ({ ...prev, disposition: d }))}
                        disabled={!canSign}
                        className={`rounded-xl border p-3 text-left text-sm transition ${decision.disposition === d ? dispositionTone[d] : 'border-brand-secondary/25 bg-brand-background/30 hover:border-brand-secondary/50'}`}
                      >
                        <p className="font-semibold text-brand-text-primary">{d}</p>
                        <p className="mt-1 text-[11px] text-brand-text-secondary">
                          {d === 'Home follow-up' && 'Caregiver instructions, safety netting, and a scheduled review.'}
                          {d === 'In-person assessment' && 'Non-emergency but requires examination at a facility.'}
                          {d === 'Urgent referral' && 'Same-day care. Must not wait for AI or a flight.'}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="label-field">Working assessment (physician-authored)</label>
                      <textarea
                        className="input-field"
                        rows={3}
                        value={decision.workingAssessment}
                        onChange={(e) => setDecision((prev) => ({ ...prev, workingAssessment: e.target.value }))}
                        disabled={!canSign}
                        placeholder="Summarise the clinical reasoning; do not copy the AI draft blindly."
                      />
                    </div>
                    <div>
                      <label className="label-field">Instructions for the caregiver</label>
                      <textarea
                        className="input-field"
                        rows={3}
                        value={decision.instructionsForCaregiver}
                        onChange={(e) => setDecision((prev) => ({ ...prev, instructionsForCaregiver: e.target.value }))}
                        disabled={!canSign}
                        placeholder="Plain-language instructions, in the caregiver’s language where possible."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label-field">Safety-netting advice</label>
                      <textarea
                        className="input-field"
                        rows={2}
                        value={decision.safetyNetting}
                        onChange={(e) => setDecision((prev) => ({ ...prev, safetyNetting: e.target.value }))}
                        disabled={!canSign}
                      />
                    </div>
                  </div>

                  {decision.disposition === 'Home follow-up' ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="label-field">Follow-up due</label>
                        <input
                          type="datetime-local"
                          className="input-field"
                          value={toDateTimeLocal(decision.followUpDueAt)}
                          onChange={(e) => setDecision((prev) => ({ ...prev, followUpDueAt: new Date(e.target.value).toISOString() }))}
                          disabled={!canSign}
                        />
                      </div>
                      <div>
                        <label className="label-field">Follow-up method</label>
                        <select
                          className="input-field"
                          value={decision.followUpMethod}
                          onChange={(e) => setDecision((prev) => ({ ...prev, followUpMethod: e.target.value as FollowUp['method'] }))}
                          disabled={!canSign}
                        >
                          <option>Phone call</option>
                          <option>Community health worker visit</option>
                          <option>Facility visit</option>
                          <option>Drone-assisted check-in</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="label-field">Receiving facility</label>
                        <select
                          className="input-field"
                          value={decision.referralFacility}
                          onChange={(e) => setDecision((prev) => ({ ...prev, referralFacility: e.target.value }))}
                          disabled={!canSign}
                        >
                          {facilities
                            .filter((f) => f.level !== 'Community outreach team')
                            .map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-field">Urgency</label>
                        <select
                          className="input-field"
                          value={decision.referralUrgency}
                          onChange={(e) => setDecision((prev) => ({ ...prev, referralUrgency: e.target.value as Referral['urgency'] }))}
                          disabled={!canSign}
                        >
                          <option>Same day</option>
                          <option>Within 24 hours</option>
                          <option>Routine</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-field">Referral reason</label>
                        <input
                          className="input-field"
                          value={decision.referralReason}
                          onChange={(e) => setDecision((prev) => ({ ...prev, referralReason: e.target.value }))}
                          disabled={!canSign}
                          placeholder="e.g. require in-person chest examination"
                        />
                      </div>
                    </div>
                  )}

                  {summary.requiredMissing.length > 0 && (
                    <div className="rounded-xl border border-brand-accent/40 bg-brand-accent/10 p-4">
                      <p className="text-sm font-semibold text-brand-text-primary">Incomplete evidence acknowledgement</p>
                      <p className="mt-1 text-xs text-brand-text-secondary">
                      {summary.requiredMissing.length} required observation(s) lack usable evidence:
                      {' '}{summary.requiredMissing.map((d) => d.label).join(', ')}.
                      </p>
                      <label className="mt-3 flex items-start gap-2 text-xs text-brand-text-secondary">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={decision.incompleteEvidenceAcknowledged}
                          onChange={(e) => setDecision((prev) => ({ ...prev, incompleteEvidenceAcknowledged: e.target.checked }))}
                          disabled={!canSign}
                        />
                        I confirm that the decision is being signed with incomplete evidence.
                      </label>
                      <textarea
                        className="input-field mt-2 text-xs"
                        rows={2}
                        value={decision.incompleteEvidenceReason}
                        onChange={(e) => setDecision((prev) => ({ ...prev, incompleteEvidenceReason: e.target.value }))}
                        disabled={!canSign || !decision.incompleteEvidenceAcknowledged}
                        placeholder="Why is it safe to proceed, and what in-person follow-up is required?"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-secondary/20 pt-4">
                    <p className="text-[11px] text-brand-text-secondary">
                      Signature: {session.user.name} · {session.user.professionalRegistration ?? 'no registration recorded'} ·{' '}
                      {session.user.facilityId === encounter.facilityId ? 'facility matches' : 'facility mismatch'}
                    </p>
                    <button type="button" className="btn-primary" onClick={handleSign} disabled={!canSign}>
                      Sign physician decision
                    </button>
                  </div>
                </>
              )}

              {encounter.physicianDecision && (
                <div className="surface-muted p-4">
                  <h4 className="text-sm font-bold text-brand-text-primary">Amend signed decision</h4>
                  <p className="mt-1 text-xs text-brand-text-secondary">
                    Amendments are appended; the original signature and reason remain visible.
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-[0.8fr_1.2fr_auto]">
                    <select className="input-field py-2 text-xs" value={amendDisposition} onChange={(e) => setAmendDisposition(e.target.value as Disposition)}>
                      <option>Home follow-up</option>
                      <option>In-person assessment</option>
                      <option>Urgent referral</option>
                    </select>
                    <input className="input-field py-2 text-xs" placeholder="Reason for amendment" value={amendReason} onChange={(e) => setAmendReason(e.target.value)} />
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      disabled={session.user.role !== 'Physician' || !amendReason.trim()}
                      onClick={() => {
                        actions.amendDecision(encounter.id, amendDisposition, amendReason.trim());
                        setAmendReason('');
                      }}
                    >
                      Amend
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'outcome' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-status-red/40 bg-status-red/10 p-4">
                <h3 className="text-sm font-bold text-status-red">Urgent care pathway — independent of AI and drone</h3>
                <p className="mt-1 text-xs text-brand-text-secondary">
                  If a danger sign is present, arrange same-day in-person care now. This action does not require an AI
                  draft, a physician signature, or a flight. Record the reason and receiving facility for audit.
                </p>
                {encounter.safetyEscalation.triggered ? (
                  <div className="mt-3 rounded-lg border border-status-red/30 bg-brand-background/40 p-3 text-xs">
                    <p className="font-semibold text-brand-text-primary">Urgent escalation recorded</p>
                    <p className="mt-1 text-brand-text-secondary">{encounter.safetyEscalation.reason}</p>
                    <p className="mt-1 text-brand-text-secondary">
                      Triggered {formatDateTime(encounter.safetyEscalation.triggeredAt)} by{' '}
                      {encounter.safetyEscalation.triggeredBy}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2 md:grid-cols-[1.2fr_0.8fr_auto]">
                    <input className="input-field py-2 text-xs" value={urgentReason} onChange={(e) => setUrgentReason(e.target.value)} placeholder="Reason (danger sign)" />
                    <input className="input-field py-2 text-xs" value={urgentFacility} onChange={(e) => setUrgentFacility(e.target.value)} placeholder="Receiving facility" />
                    <button type="button" className="btn-danger text-xs" onClick={handleEscalate}>
                      Escalate now
                    </button>
                  </div>
                )}
              </div>

              {encounter.referral && (
                <section className="surface-muted p-4">
                  <h3 className="text-sm font-bold text-brand-text-primary">Referral</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    <InfoCard label="Facility" value={encounter.referral.facility} />
                    <InfoCard label="Urgency" value={encounter.referral.urgency} />
                    <InfoCard label="Initiated" value={formatDateTime(encounter.referral.initiatedAt)} />
                    <InfoCard label="Completed" value={formatDateTime(encounter.referral.completedAt)} />
                  </div>
                  <p className="mt-2 text-xs text-brand-text-secondary">{encounter.referral.reason}</p>
                  {encounter.referral.completedAt ? (
                    <p className="mt-2 rounded-lg bg-brand-background/50 p-2 text-xs text-brand-text-primary">
                      Outcome: {encounter.referral.outcome}
                    </p>
                  ) : canCompleteReferral(session.user, encounter) ? (
                    <div className="mt-3 flex flex-col gap-2 md:flex-row">
                      <input className="input-field text-xs" value={referralOutcome} onChange={(e) => setReferralOutcome(e.target.value)} placeholder="Referral outcome (attended, treated, admitted, lost to follow-up)" />
                      <button
                        type="button"
                        className="btn-primary text-xs"
                        disabled={!referralOutcome.trim()}
                        onClick={() => actions.completeReferral(encounter.id, referralOutcome.trim())}
                      >
                        Record outcome
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-brand-text-secondary">
                      Only a field officer or physician can record the referral outcome.
                    </p>
                  )}
                </section>
              )}

              {encounter.followUp && (
                <section className="surface-muted p-4">
                  <h3 className="text-sm font-bold text-brand-text-primary">Follow-up</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <InfoCard label="Due" value={formatDateTime(encounter.followUp.dueAt)} />
                    <InfoCard label="Method" value={encounter.followUp.method} />
                    <InfoCard label="Completed" value={formatDateTime(encounter.followUp.completedAt)} />
                  </div>
                  {encounter.followUp.completedAt ? (
                    <p className="mt-2 rounded-lg bg-brand-background/50 p-2 text-xs text-brand-text-primary">
                      Outcome: {encounter.followUp.outcome}
                    </p>
                  ) : canCompleteFollowUp(session.user, encounter) ? (
                    <div className="mt-3 flex flex-col gap-2 md:flex-row">
                      <input className="input-field text-xs" value={followUpOutcome} onChange={(e) => setFollowUpOutcome(e.target.value)} placeholder="Follow-up outcome (improved, referred, lost to follow-up)" />
                      <button
                        type="button"
                        className="btn-primary text-xs"
                        disabled={!followUpOutcome.trim()}
                        onClick={() => actions.completeFollowUp(encounter.id, followUpOutcome.trim())}
                      >
                        Record outcome
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-brand-text-secondary">
                      Only a field officer or physician can record the follow-up outcome.
                    </p>
                  )}
                </section>
              )}

              <section className="surface-muted p-4">
                <h3 className="text-sm font-bold text-brand-text-primary">Logistics mission (separate from the clinical encounter)</h3>
                <p className="mt-1 text-xs text-brand-text-secondary">
                  A successful delivery means equipment arrived — it does not mean the infant was assessed or the
                  physician reviewed the case. Flight feasibility must not determine access to care.
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <div>
                    <label className="label-field">Required</label>
                    <select className="input-field py-2 text-xs" value={encounter.logistics.required ? 'yes' : 'no'} onChange={(e) => setLogisticsMode(e.target.value === 'yes' ? 'Drone delivery' : 'Local resources')}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Mode</label>
                    <select className="input-field py-2 text-xs" value={logisticsMode} onChange={(e) => setLogisticsMode(e.target.value as LogisticsMission['mode'])}>
                      <option>Local resources</option>
                      <option>Drone delivery</option>
                      <option>Other approved transport</option>
                      <option>None</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Status</label>
                    <select className="input-field py-2 text-xs" value={logisticsStatus} onChange={(e) => setLogisticsStatus(e.target.value as LogisticsMission['status'])}>
                      <option>Not required</option>
                      <option>Requested</option>
                      <option>In transit</option>
                      <option>Delivered</option>
                      <option>Failed</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Delivery outcome</label>
                    <input className="input-field py-2 text-xs" value={logisticsOutcome} onChange={(e) => setLogisticsOutcome(e.target.value)} placeholder="e.g. delivered, not assessed" />
                  </div>
                </div>
                <input className="input-field mt-2 text-xs" value={logisticsNote} onChange={(e) => setLogisticsNote(e.target.value)} placeholder="Note" />
                <button
                  type="button"
                  className="btn-secondary mt-2 text-xs"
                  onClick={() => actions.updateLogistics(encounter.id, { required: logisticsMode === 'Drone delivery', mode: logisticsMode, status: logisticsStatus, note: logisticsNote, deliveryOutcome: logisticsOutcome })}
                >
                  Save logistics mission
                </button>
              </section>

              {!encounter.referral && !encounter.followUp && (
                <Notice tone="info">
                  No disposition has been recorded yet. A physician decision will create either a follow-up schedule or a
                  referral.
                </Notice>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-brand-text-primary">Audit history</h3>
              <p className="text-xs text-brand-text-secondary">
                Append-only demonstration log. A production audit log would be server-side, access-controlled, and
                tamper-evident.
              </p>
              <ol className="space-y-3">
                {encounter.history.map((event, index) => (
                  <li key={`${event.at}-${index}`} className="rounded-xl border border-brand-secondary/25 bg-brand-background/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-brand-text-primary">{event.action}</p>
                      <EvidenceBadge status={event.evidenceClass} />
                    </div>
                    <p className="mt-1 text-xs text-brand-text-secondary">{event.actorName} · {formatDateTime(event.at)}</p>
                    {event.detail && <p className="mt-1 text-xs text-brand-text-secondary/90">{event.detail}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TransmissionCard: React.FC<{
  deliveryState: DeliveryState;
  next: DeliveryState;
  onNext: (next: DeliveryState) => void;
  onAdvance: () => void;
}> = ({ deliveryState, next, onNext, onAdvance }) => (
  <div className="surface-muted p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-brand-text-primary">Transmission state</h3>
      <span className="text-[10px] uppercase tracking-wide text-brand-text-secondary">
        “Saved locally” ≠ “received by physician”
      </span>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {DELIVERY_STATES.map((state, index) => (
        <React.Fragment key={state}>
          {index > 0 && <span className="text-brand-text-secondary/50">→</span>}
          <span className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${deliveryState === state ? 'bg-brand-primary text-white' : 'bg-brand-background text-brand-text-secondary'}`}>
            {state}
          </span>
        </React.Fragment>
      ))}
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <select className="input-field max-w-xs py-2 text-xs" value={next} onChange={(e) => onNext(e.target.value as DeliveryState)}>
        {DELIVERY_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
      </select>
      <button type="button" className="btn-secondary text-xs" onClick={onAdvance} disabled={next === deliveryState}>
        Update transmission
      </button>
    </div>
  </div>
);

const InfoCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-brand-secondary/20 bg-brand-background/40 p-3">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-text-secondary">{label}</p>
    <p className="mt-1 break-words text-sm text-brand-text-primary">{value}</p>
  </div>
);

const SignedDecision: React.FC<{ encounter: Encounter }> = ({ encounter }) => {
  const decision = encounter.physicianDecision;
  if (!decision) return null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-brand-text-primary">Signed physician decision</h3>
          <p className="text-xs text-brand-text-secondary">
            The signature is the clinical decision. The AI draft above is not.
          </p>
        </div>
        <EvidenceBadge status="working" label="Signed decision" />
      </div>

      <div className={`rounded-xl border p-4 ${dispositionTone[decision.disposition]}`}>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-text-secondary">Disposition</p>
        <p className="mt-1 text-xl font-bold text-brand-text-primary">{decision.disposition}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <InfoCard label="Physician" value={decision.physicianName} />
        <InfoCard label="Facility" value={decision.facilityName} />
        <InfoCard label="Signed" value={formatDateTime(decision.signedAt)} />
        <InfoCard label="Evidence fingerprint" value={decision.evidenceFingerprint} />
      </div>

      <InfoBlock label="Working assessment" value={decision.workingAssessment} />
      <InfoBlock label="Instructions for the caregiver" value={decision.instructionsForCaregiver} />
      <InfoBlock label="Safety netting" value={decision.safetyNetting} />

      {decision.incompleteEvidenceAcknowledged && (
        <Notice tone="warning" title="Signed with incomplete evidence">
          {decision.incompleteEvidenceReason || 'No reason recorded.'}
        </Notice>
      )}

      {decision.amendments.length > 0 && (
        <div className="surface-muted p-4">
          <h4 className="text-sm font-bold text-brand-text-primary">Amendments</h4>
          <ul className="mt-2 space-y-2">
            {decision.amendments.map((amendment: DecisionAmendment, index: number) => (
              <li key={`${amendment.at}-${index}`} className="rounded-lg bg-brand-background/50 p-2 text-xs">
                <p className="text-brand-text-primary">
                  {amendment.previousDisposition} → {amendment.newDisposition} · {formatDateTime(amendment.at)}
                </p>
                <p className="text-brand-text-secondary">{amendment.byName}: {amendment.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {encounter.followUp && (
          <InfoCard label="Follow-up due" value={`${formatDateTime(encounter.followUp.dueAt)} · ${encounter.followUp.method}`} />
        )}
        {encounter.referral && (
          <InfoCard label="Referral" value={`${encounter.referral.facility} · ${encounter.referral.urgency}`} />
        )}
      </div>
    </div>
  );
};

const InfoBlock: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-brand-secondary/20 bg-brand-background/40 p-3">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-text-secondary">{label}</p>
    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-brand-text-primary">{value}</p>
  </div>
);

export default EncounterDetail;
