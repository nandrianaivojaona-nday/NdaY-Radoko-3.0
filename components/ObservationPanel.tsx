import React, { useEffect, useMemo, useState } from 'react';
import {
  AssessmentEvidence,
  AssessmentSession,
  Encounter,
  Observation,
  ObservationDefinition,
  ObservationMethod,
  ObservationQuality,
  ObservationSource,
  UserAccount,
} from '../types';
import {
  OBSERVATION_BY_ID,
  OBSERVATION_CATALOGUE,
  OBSERVATION_CATEGORIES,
  getObservationTraceabilityStatus,
  isUsableObservation,
  summariseCompleteness,
} from '../data/observations';
import { Notice, QualityBadge } from './Badges';
import { MADAGASCAR_YOUNG_INFANT_SOURCES } from '@/data/protocoleSources';
import { getConcernRecommendations } from '../data/reportedConcerns';
import { DroneFeed } from './DroneFeed';
import { AcquisitionWorkspace } from './AcquisitionWorkspace';

export type AssessmentSequenceStep = 'ALL' | 'ASK' | 'LOOK' | 'FEEL' | 'MEASURE';

interface ObservationPanelProps {
  observations: Observation[];
  onChange: (observations: Observation[]) => void;
  onSave: () => void;
  user: UserAccount;
  reportedConcerns: string[];
  onUrgentPathway: () => void;
  disabled?: boolean;
  onOpenAssessment?: (definitionId: string) => void;
  focusedObservationId?: string | null;
  encounter?: Encounter;
  sessions?: AssessmentSession[];
  evidence?: AssessmentEvidence[];
  onSaveSession?: (session: AssessmentSession) => void;
  onSaveEvidence?: (evidence: AssessmentEvidence) => void;
}

const qualityOptions: ObservationQuality[] = [
  'Not assessed',
  'Unavailable',
  'Reported — unverified',
  'Measured — device',
  'Observed — remote',
  'Observed — in person',
  'Unusable',
];

export const getStepForDefinition = (
  definition: ObservationDefinition,
): 'ASK' | 'LOOK' | 'FEEL' | 'MEASURE' => {
  if (['grunting', 'stridor'].includes(definition.id)) return 'LOOK';
  switch (definition.method) {
    case 'Caregiver report':
      return 'ASK';
    case 'Remote visual observation':
      return 'LOOK';
    case 'Trained in-person assessment':
      return 'FEEL';
    case 'Device measurement':
      return 'MEASURE';
    default:
      return 'LOOK';
  }
};

const assessmentActionLabel = (definition: ObservationDefinition): string => {
  if (definition.method === 'Caregiver report') return 'ASK · caregiver report';
  if (definition.method === 'Device measurement') return 'MEASURE · trained assistant/device';
  if (definition.method === 'Trained in-person assessment') return 'FEEL / TOUCH · trained in person';
  if (['grunting', 'stridor'].includes(definition.id)) return 'LOOK / LISTEN · trained audio observation';
  return 'LOOK · trained visual observation';
};

const ObservationRow: React.FC<{
  definition: ObservationDefinition;
  observation: Observation;
  disabled: boolean;
  onUpdate: (next: Observation) => void;
  user: UserAccount;
  isFocused: boolean;
  onOpenWorkspace: () => void;
  isWorkspaceOpen: boolean;
  showDroneView?: boolean;
}> = ({
  definition,
  observation,
  disabled,
  onUpdate,
  user,
  isFocused,
  onOpenWorkspace,
  isWorkspaceOpen,
  showDroneView = false,
}) => {
  const [showNotes, setShowNotes] = useState(Boolean(observation.notes));

  // Value change WITHOUT automatically claiming that an examination occurred
  const setValue = (value: string) => {
    let quality: ObservationQuality = observation.quality;
    let source: ObservationSource | undefined = observation.source;

    if (!value.trim()) {
      quality = 'Not assessed';
      source = undefined;
    } else if (/^unable|not assessed/i.test(value)) {
      quality = 'Unusable';
    } else if (/^unavailable|declined/i.test(value)) {
      quality = 'Unavailable';
      source = 'Unavailable';
    } else {
      // Retain existing quality or set unverified report for ASK. Never auto-claim 'Observed — remote'
      if (definition.method === 'Caregiver report') {
        quality = 'Reported — unverified';
        source = 'Caregiver report';
      } else if (definition.method === 'Remote visual observation') {
        // Leave unassessed or keep previous until clinician confirms via camera workspace
        if (quality === 'Not assessed') {
          quality = 'Not assessed';
        }
      } else if (definition.method === 'Device measurement') {
        quality = 'Measured — device';
        source = 'Device measurement';
      } else if (definition.method === 'Trained in-person assessment') {
        quality = 'Observed — in person';
        source = 'In-person observation';
      }
    }

    onUpdate({
      ...observation,
      value,
      quality,
      source,
      recordedAt: new Date().toISOString(),
      recordedBy: user.id,
    });
  };

  const setQuality = (quality: ObservationQuality) =>
    onUpdate({
      ...observation,
      quality,
      recordedAt: new Date().toISOString(),
      recordedBy: user.id,
    });

  const reset = () =>
    onUpdate({
      ...observation,
      value: '',
      quality: 'Not assessed',
      source: undefined,
      recordedAt: null,
      recordedBy: null,
      confirmedBy: null,
      confirmedByName: null,
      confirmedAt: null,
      isClinicianConfirmed: false,
      acquisitionSessionId: null,
      evidenceIds: [],
      notes: '',
      evidenceRef: undefined,
    });

  const actionIcon =
    definition.method === 'Caregiver report'
      ? '🎙️ ASK'
      : definition.method === 'Device measurement'
      ? '⏱️ MEASURE'
      : definition.method === 'Trained in-person assessment'
      ? '🩺 FEEL'
      : '📷 LOOK';

  return (
    <div
      id={`observation-${definition.id}`}
      className={`rounded-xl border p-3.5 transition-all ${
        isFocused
          ? 'border-brand-primary ring-2 ring-brand-primary/20 bg-brand-surface'
          : 'border-brand-secondary/20 bg-brand-background/40 hover:border-brand-secondary/40'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-brand-text-primary">
              {definition.label}
              {definition.requiredForReview && <span className="ml-1 text-brand-accent">*</span>}
            </p>
            {isFocused && (
              <span className="badge bg-brand-primary text-white text-[9px]">Selected</span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="badge bg-brand-primary/10 text-[10px] text-brand-primary">
              {assessmentActionLabel(definition)}
            </span>
            <span className="text-[10px] text-brand-text-secondary/70">
              Ref: {definition.protocolReference}
            </span>
            <span className="badge bg-brand-accent/15 text-[10px] text-brand-accent">
              {getObservationTraceabilityStatus(definition, MADAGASCAR_YOUNG_INFANT_SOURCES)}
            </span>
          </div>

          {(definition.protocolCitations ?? []).map((citation, index) => (
            <p key={`${citation.sourceId}-${index}`} className="mt-1 text-[10px] text-brand-text-secondary/70">
              {citation.sourceId} · {citation.section} · p. {citation.page}
              {citation.tableOrStep ? ` · ${citation.tableOrStep}` : ''}
            </p>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <QualityBadge quality={observation.quality} />
          {observation.source && observation.source !== 'Unavailable' && (
            <span className="badge bg-brand-text-secondary/10 text-[10px] text-brand-text-secondary">
              via {observation.source}
            </span>
          )}
          {/* Acquisition Workspace Trigger */}
          <button
            type="button"
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold shadow-sm transition-all ${
              isWorkspaceOpen
                ? 'bg-brand-primary text-white ring-2 ring-brand-primary/30'
                : 'border border-brand-primary/40 bg-brand-surface text-brand-primary hover:bg-brand-primary/10'
            }`}
            onClick={onOpenWorkspace}
            disabled={disabled}
            title="Open camera, audio intercom, or measurement workspace"
          >
            {isWorkspaceOpen ? 'Hide Workspace' : `${actionIcon} Workspace`}
          </button>
        </div>
      </div>

      {/* Clinician confirmation indicator */}
      {observation.isClinicianConfirmed && observation.confirmedByName && (
        <div className="mt-2.5 flex items-center justify-between rounded-lg border border-brand-mint/30 bg-brand-mint/5 px-2.5 py-1.5 text-xs text-brand-mint">
          <span>
            ✓ Clinician confirmed by <strong>{observation.confirmedByName}</strong> at{' '}
            {new Date(observation.confirmedAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {observation.evidenceIds && observation.evidenceIds.length > 0 && (
            <span className="badge bg-brand-mint/20 text-[10px] text-brand-mint">
              📎 {observation.evidenceIds.length} media attached
            </span>
          )}
        </div>
      )}

      {/* Visual observation warning when value is entered without camera confirmation */}
      {definition.method === 'Remote visual observation' &&
        observation.value &&
        !observation.isClinicianConfirmed &&
        observation.quality === 'Not assessed' && (
          <div className="mt-2 rounded bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
            ⚠ Value entered without camera examination. Click <strong>LOOK Workspace</strong> to inspect view and confirm
            finding as clinician.
          </div>
        )}

      {/* Inputs row */}
      <div className="mt-3 grid gap-2 md:grid-cols-[1.2fr_1fr_auto]">
        <div>
          {definition.valueType === 'select' ? (
            <select
              className="input-field py-2 text-xs"
              value={observation.value}
              onChange={(e) => setValue(e.target.value)}
              disabled={disabled}
              aria-label={definition.label}
            >
              <option value="">Select finding…</option>
              {(definition.options ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <div className="relative">
              <input
                className="input-field py-2 pr-16 text-xs"
                type={definition.valueType === 'number' ? 'number' : 'text'}
                step="any"
                value={observation.value}
                onChange={(e) => setValue(e.target.value)}
                disabled={disabled}
                placeholder={definition.valueType === 'number' ? 'Record value' : 'Describe'}
                aria-label={definition.label}
              />
              {definition.unit && (
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-brand-text-secondary">
                  {definition.unit}
                </span>
              )}
            </div>
          )}
        </div>

        <select
          className="input-field py-2 text-xs"
          value={observation.quality}
          onChange={(e) => setQuality(e.target.value as ObservationQuality)}
          disabled={disabled}
          aria-label={`${definition.label} evidence quality`}
        >
          {qualityOptions.map((quality) => (
            <option key={quality} value={quality}>
              {quality}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-[10px]"
            onClick={() => setShowNotes((s) => !s)}
            disabled={disabled}
          >
            {showNotes ? 'Hide note' : 'Note'}
          </button>
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-[10px]"
            onClick={reset}
            disabled={disabled}
          >
            Reset
          </button>
        </div>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-brand-text-secondary/80">{definition.guidance}</p>
      {showDroneView && definition.droneCaptureRequirements?.feasible && (
        <div className="mt-2 rounded-lg border border-brand-primary/25 bg-brand-primary/5 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-primary">
            Drone capture requirements · Proposed for bench validation
          </p>
          <ul className="mt-1 space-y-0.5 text-[10px] text-brand-text-secondary">
            <li>Standoff: {definition.droneCaptureRequirements.minimumStandoffMetres}–{definition.droneCaptureRequirements.maximumStandoffMetres} m</li>
            <li>Resolution: ≥ {definition.droneCaptureRequirements.minimumResolution} at ≥ {definition.droneCaptureRequirements.minimumFrameRate} fps</li>
            <li>Lighting: {definition.droneCaptureRequirements.lightingRequirement}</li>
            {definition.droneCaptureRequirements.requiresAudio && <li>Audio capture required</li>}
            {definition.droneCaptureRequirements.requiresColourCalibration && <li>Colour calibration required (reference card in frame)</li>}
            <li>Minimum duration: {definition.droneCaptureRequirements.minimumObservationSeconds} s</li>
          </ul>
          {definition.droneCaptureRequirements.validityConditions.length > 0 && (
            <>
              <p className="mt-1.5 text-[10px] font-semibold text-brand-text-primary">Valid only when:</p>
              <ul className="mt-0.5 list-disc pl-4 text-[10px] text-brand-text-secondary">
                {definition.droneCaptureRequirements.validityConditions.map((v) => <li key={v}>{v}</li>)}
              </ul>
            </>
          )}
          {definition.droneCaptureRequirements.invalidityConditions.length > 0 && (
            <>
              <p className="mt-1.5 text-[10px] font-semibold text-status-red">Unusable when:</p>
              <ul className="mt-0.5 list-disc pl-4 text-[10px] text-brand-text-secondary">
                {definition.droneCaptureRequirements.invalidityConditions.map((v) => <li key={v}>{v}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      {definition.proposedSubstitute && (
        <div className="mt-2 rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-accent">
            Proposed substitute · {definition.proposedSubstitute.status}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-brand-text-secondary">
            <span className="font-semibold text-brand-text-primary">
              {definition.proposedSubstitute.pathway}:
            </span>{' '}
            {definition.proposedSubstitute.description}
          </p>
          <p className="mt-1 text-[10px] italic text-brand-text-secondary/70">
            Research question, not a current capability. The 12-month programme tests whether the substitute works.
          </p>
        </div>
      )}

      {showNotes && (
        <div className="mt-2 space-y-2">
          <input
            className="input-field text-xs"
            value={observation.evidenceRef ?? ''}
            onChange={(e) => onUpdate({ ...observation, evidenceRef: e.target.value })}
            disabled={disabled}
            placeholder="Evidence reference (image, file, device log) — if appropriate and consented"
          />
          <textarea
            className="input-field text-xs"
            rows={2}
            value={observation.notes ?? ''}
            onChange={(e) => onUpdate({ ...observation, notes: e.target.value })}
            disabled={disabled}
            placeholder="Optional note: device, technique, image quality, or why the observation is unusable."
          />
        </div>
      )}
    </div>
  );
};

const ObservationPanel: React.FC<ObservationPanelProps> = ({
  observations,
  onChange,
  onSave,
  user,
  reportedConcerns,
  onUrgentPathway,
  disabled = false,
  onOpenAssessment,
  focusedObservationId,
  encounter,
  sessions = [],
  evidence = [],
  onSaveSession = () => {},
  onSaveEvidence = () => {},
}) => {
  const [step, setStep] = useState<AssessmentSequenceStep>('ALL');
  const [showAll, setShowAll] = useState(false);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [showDroneView, setShowDroneView] = useState(false);
  const [activeWorkspaceDefId, setActiveWorkspaceDefId] = useState<string | null>(null);
  const [internalFocusedId, setInternalFocusedId] = useState<string | null>(focusedObservationId ?? null);

  const byId = useMemo(() => new Map(observations.map((o) => [o.definitionId, o])), [observations]);
  const summary = useMemo(() => summariseCompleteness(observations), [observations]);
  const concernRecommendations = useMemo(
    () => getConcernRecommendations(reportedConcerns),
    [reportedConcerns],
  );
  const priorityRank = useMemo(
    () => new Map(concernRecommendations.prioritizedObservationIds.map((id, index) => [id, index])),
    [concernRecommendations.prioritizedObservationIds],
  );

  // Sync external focusedObservationId
  useEffect(() => {
    if (focusedObservationId) {
      setInternalFocusedId(focusedObservationId);
      const def = OBSERVATION_BY_ID.get(focusedObservationId);
      if (def) {
        setStep(getStepForDefinition(def));
        setActiveWorkspaceDefId(focusedObservationId);
      }
    }
  }, [focusedObservationId]);

  // Handle assessment shortcut navigation
  const handleOpenAssessment = (definitionId: string) => {
    const definition = OBSERVATION_BY_ID.get(definitionId);
    if (!definition) return;

    const targetStep = getStepForDefinition(definition);
    setStep(targetStep);
    setInternalFocusedId(definitionId);
    setActiveWorkspaceDefId(definitionId);
    onOpenAssessment?.(definitionId);
  };

  // Scroll to focused element after view rendering
  useEffect(() => {
    if (internalFocusedId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`observation-${internalFocusedId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [internalFocusedId, step]);

  const updateOne = (next: Observation) => {
    onChange(observations.map((o) => (o.definitionId === next.definitionId ? next : o)));
  };

  // Filter definitions while ensuring focused / active observation is NEVER hidden
  const visibleDefinitions = OBSERVATION_CATALOGUE.filter((definition) => {
    if (showDroneView) {
      return definition.droneCaptureRequirements?.feasible === true;
    }
    // If explicitly requested/focused or active workspace, ALWAYS show it!
    if (internalFocusedId === definition.id || activeWorkspaceDefId === definition.id) {
      return true;
    }

    // Sequence Step Filter
    if (step !== 'ALL' && getStepForDefinition(definition) !== step) {
      return false;
    }

    // Always show in-person-only observations. These mark the boundary of
    // what a remote encounter can and cannot capture. The FEEL / TOUCH step
    // in the assessment sequence above is meaningless if its corresponding
    // rows are hidden by default.
    if (definition.remoteFeasibility === 'In person only') return true;
    if (!showAll && !definition.requiredForReview && !byId.get(definition.id)?.value) return false;
    if (showMissingOnly) {
      const observation = byId.get(definition.id);
      if (observation && isUsableObservation(observation)) return false;
    }
    return true;
  });

  const orderedCategories = [...OBSERVATION_CATEGORIES].sort((a, b) => {
    const firstA = Math.min(
      ...visibleDefinitions
        .filter((definition) => definition.category === a)
        .map((definition) => priorityRank.get(definition.id) ?? Number.MAX_SAFE_INTEGER),
    );
    const firstB = Math.min(
      ...visibleDefinitions
        .filter((definition) => definition.category === b)
        .map((definition) => priorityRank.get(definition.id) ?? Number.MAX_SAFE_INTEGER),
    );
    return firstA - firstB;
  });

  // Calculate step counts
  const stepStats = useMemo(() => {
    const counts = {
      ALL: { total: OBSERVATION_CATALOGUE.length, missing: summary.requiredMissing.length },
      ASK: { total: 0, missing: 0 },
      LOOK: { total: 0, missing: 0 },
      FEEL: { total: 0, missing: 0 },
      MEASURE: { total: 0, missing: 0 },
    };
    OBSERVATION_CATALOGUE.forEach((d) => {
      const s = getStepForDefinition(d);
      counts[s].total += 1;
      const obs = byId.get(d.id);
      if (d.requiredForReview && (!obs || !isUsableObservation(obs))) {
        counts[s].missing += 1;
      }
    });
    return counts;
  }, [byId, summary]);

  return (
    <div className="space-y-4">
      {/* Sequence Header & View Step Navigation */}
      <section className="rounded-xl border border-brand-secondary/25 bg-brand-background/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-brand-text-primary">Young-infant assessment sequence</h3>
          <span className="text-xs text-brand-text-secondary">Click any step to filter view</span>
        </div>

        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <li
            className={`cursor-pointer rounded-lg p-3 text-xs transition-all border ${
              step === 'ASK'
                ? 'border-brand-primary bg-brand-surface shadow-sm ring-2 ring-brand-primary/20'
                : 'border-brand-secondary/20 bg-brand-surface/60 hover:bg-brand-surface'
            }`}
            onClick={() => setStep('ASK')}
          >
            <div className="flex items-center justify-between">
              <strong>1 · ASK</strong>
              {stepStats.ASK.missing > 0 ? (
                <span className="badge bg-amber-500/15 text-[10px] text-amber-600">
                  {stepStats.ASK.missing} missing
                </span>
              ) : (
                <span className="badge bg-brand-mint/15 text-[10px] text-brand-mint">✓ Complete</span>
              )}
            </div>
            <p className="mt-1 text-brand-text-secondary">Two-way intercom for caregiver concerns & history.</p>
          </li>

          <li
            className={`cursor-pointer rounded-lg p-3 text-xs transition-all border ${
              step === 'LOOK'
                ? 'border-brand-primary bg-brand-surface shadow-sm ring-2 ring-brand-primary/20'
                : 'border-brand-secondary/20 bg-brand-surface/60 hover:bg-brand-surface'
            }`}
            onClick={() => setStep('LOOK')}
          >
            <div className="flex items-center justify-between">
              <strong>2 · LOOK / LISTEN</strong>
              {stepStats.LOOK.missing > 0 ? (
                <span className="badge bg-amber-500/15 text-[10px] text-amber-600">
                  {stepStats.LOOK.missing} missing
                </span>
              ) : (
                <span className="badge bg-brand-mint/15 text-[10px] text-brand-mint">✓ Complete</span>
              )}
            </div>
            <p className="mt-1 text-brand-text-secondary">Remote camera inspection & audio breath sounds.</p>
          </li>

          <li
            className={`cursor-pointer rounded-lg p-3 text-xs transition-all border ${
              step === 'FEEL'
                ? 'border-brand-primary bg-brand-surface shadow-sm ring-2 ring-brand-primary/20'
                : 'border-brand-secondary/20 bg-brand-surface/60 hover:bg-brand-surface'
            }`}
            onClick={() => setStep('FEEL')}
          >
            <div className="flex items-center justify-between">
              <strong>3 · FEEL / TOUCH</strong>
              {stepStats.FEEL.missing > 0 ? (
                <span className="badge bg-amber-500/15 text-[10px] text-amber-600">
                  {stepStats.FEEL.missing} missing
                </span>
              ) : (
                <span className="badge bg-brand-mint/15 text-[10px] text-brand-mint">✓ Complete</span>
              )}
            </div>
            <p className="mt-1 text-brand-text-secondary">Trained in-person checks only by health worker.</p>
          </li>

          <li
            className={`cursor-pointer rounded-lg p-3 text-xs transition-all border ${
              step === 'MEASURE'
                ? 'border-brand-primary bg-brand-surface shadow-sm ring-2 ring-brand-primary/20'
                : 'border-brand-secondary/20 bg-brand-surface/60 hover:bg-brand-surface'
            }`}
            onClick={() => setStep('MEASURE')}
          >
            <div className="flex items-center justify-between">
              <strong>4 · MEASURE</strong>
              {stepStats.MEASURE.missing > 0 ? (
                <span className="badge bg-amber-500/15 text-[10px] text-amber-600">
                  {stepStats.MEASURE.missing} missing
                </span>
              ) : (
                <span className="badge bg-brand-mint/15 text-[10px] text-brand-mint">✓ Complete</span>
              )}
            </div>
            <p className="mt-1 text-brand-text-secondary">Calibrated timer & certified device entries.</p>
          </li>
        </ol>

        <p className="mt-2 text-[10px] text-brand-text-secondary">
          Note: This prototype demonstrates physician-supervised structured acquisition. Automatic comparison engine
          runs synthetic demo packs only; it is not a clinical diagnostic device.
        </p>
      </section>

      {/* Prioritized Observations from Reported Concerns */}
      <section className="rounded-xl border border-brand-primary/25 bg-brand-primary/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-brand-text-primary">Next steps from reported concerns</h3>
            <p className="mt-1 text-xs text-brand-text-secondary">
              Click any prioritized shortcut below: it will automatically switch to the matching view (ASK, LOOK, FEEL,
              or MEASURE), reveal the observation row, and open its acquisition workspace.
            </p>
          </div>
          {concernRecommendations.urgentCareCue && (
            <button type="button" className="btn-danger text-xs" onClick={onUrgentPathway}>
              Open urgent-care pathway
            </button>
          )}
        </div>

        {concernRecommendations.urgentCareCue && (
          <Notice tone="critical" title="Potential danger sign reported">
            Arrange same-day in-person care now. Do not wait for this checklist, an AI draft, or a drone. Use the
            urgent-care pathway to record the intended action; it does not contact a facility.
          </Notice>
        )}

        <div className="mt-3">
          <p className="text-xs font-semibold text-brand-text-primary">Prioritized observation shortcuts</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {concernRecommendations.prioritizedObservationIds.map((id) => {
              const definition = OBSERVATION_BY_ID.get(id);
              if (!definition) return null;
              const observation = byId.get(id);
              const done = Boolean(observation && isUsableObservation(observation));
              const itemStep = getStepForDefinition(definition);
              const isSelected = internalFocusedId === id;

              return (
                <button
                  key={id}
                  type="button"
                  className={`badge border transition-all ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary text-white shadow-sm ring-2 ring-brand-primary/30'
                      : done
                      ? 'border-brand-mint/30 bg-brand-mint/10 text-brand-mint'
                      : 'border-brand-primary/30 bg-brand-background text-brand-primary hover:bg-brand-primary/10'
                  }`}
                  onClick={() => handleOpenAssessment(id)}
                  title={`Open ${definition.label} in ${itemStep} view`}
                >
                  <span className="opacity-70 font-mono text-[9px] mr-1">[{itemStep}]</span>
                  {done ? '✓ ' : ''}
                  {definition.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Active Acquisition Workspace (when an observation is active) */}
      {activeWorkspaceDefId && encounter && (
        <div className="my-4">
          {(() => {
            const activeDef = OBSERVATION_BY_ID.get(activeWorkspaceDefId);
            const activeObs = byId.get(activeWorkspaceDefId);
            if (!activeDef || !activeObs) return null;
            return (
              <AcquisitionWorkspace
                key={activeDef.id}
                definition={activeDef}
                observation={activeObs}
                encounter={encounter}
                user={user}
                sessions={sessions}
                evidence={evidence}
                onUpdateObservation={updateOne}
                onSaveSession={onSaveSession}
                onSaveEvidence={onSaveEvidence}
                onClose={() => setActiveWorkspaceDefId(null)}
              />
            );
          })()}
        </div>
      )}

      {/* Completeness Summary Banner */}
      <div className="rounded-xl border border-brand-secondary/25 bg-brand-background/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-text-primary">
              Required observations: {summary.requiredAssessed}/{summary.requiredTotal}
            </p>
            <p className="text-xs text-brand-text-secondary">
              {summary.requiredMissing.length === 0
                ? 'All required observations have usable evidence. A physician can still request more information.'
                : `${summary.requiredMissing.length} required observation${
                    summary.requiredMissing.length === 1 ? '' : 's'
                  } lack usable evidence.`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-brand-primary">{summary.percentComplete}%</p>
            <p className="text-[10px] uppercase tracking-wide text-brand-text-secondary">required complete</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-surface">
          <div
            className="h-full rounded-full bg-brand-primary transition-all"
            style={{ width: `${summary.percentComplete}%` }}
          />
        </div>
      </div>

      {summary.requiredMissing.length > 0 && (
        <Notice tone="warning" title="Missing, unavailable, or unusable is not “normal”">
          Required items without usable evidence: {summary.requiredMissing.map((d) => d.label).join(', ')}.
        </Notice>
      )}

      {/* View Filter Bar (Step tabs + missing filter) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-secondary/20 pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'ASK', 'LOOK', 'FEEL', 'MEASURE'] as AssessmentSequenceStep[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                step === tab
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'bg-brand-surface text-brand-text-secondary hover:text-brand-text-primary'
              }`}
              onClick={() => setStep(tab)}
            >
              {tab === 'ALL' ? 'All Steps' : tab}
              <span className="ml-1 text-[10px] opacity-75">({stepStats[tab].total})</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-xs"
            onClick={() => setShowAll((s) => !s)}
          >
            {showAll ? 'Show required only' : `Show all ${OBSERVATION_CATALOGUE.length}`}
          </button>
          <button
            type="button"
            className={`btn-ghost px-3 py-1.5 text-xs ${showMissingOnly ? 'text-brand-accent' : ''}`}
            onClick={() => setShowMissingOnly((s) => !s)}
          >
            {showMissingOnly ? 'Showing missing only' : 'Show missing only'}
          </button>
        <button
          type="button"
          className={`btn-ghost px-3 py-1.5 text-xs ${showDroneView ? 'text-brand-primary font-semibold' : ''}`}
          onClick={() => setShowDroneView((s) => !s)}
        >
          {showDroneView ? '← Standard view' : 'Drone capture view'}
        </button>
        </div>
      </div>

      {/* Observation Rows Grouped by Category */}
      {orderedCategories.map((category) => {
        const definitions = visibleDefinitions
          .filter((d) => d.category === category)
          .sort(
            (a, b) =>
              (priorityRank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
              (priorityRank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
          );
        if (definitions.length === 0) return null;
        const missingInCategory = definitions.filter((d) => {
          const obs = byId.get(d.id);
          return d.requiredForReview && (!obs || !isUsableObservation(obs));
        }).length;

        return (
          <section key={category} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-brand-text-primary">{category}</h4>
              <span className="text-[10px] text-brand-text-secondary">
                {missingInCategory > 0 ? `${missingInCategory} required missing` : 'required complete'}
              </span>
            </div>
            {definitions.map((definition) => {
              const observation = byId.get(definition.id);
              if (!observation) return null;
              const isFocused = internalFocusedId === definition.id;
              const isWorkspaceOpen = activeWorkspaceDefId === definition.id;

              return (
                <ObservationRow
                  key={definition.id}
                  definition={definition}
                  observation={observation}
                  disabled={disabled}
                  onUpdate={updateOne}
                  user={user}
                  isFocused={isFocused}
                  isWorkspaceOpen={isWorkspaceOpen}
                  onOpenWorkspace={() => {
                    if (isWorkspaceOpen) {
                      setActiveWorkspaceDefId(null);
                    } else {
                      setActiveWorkspaceDefId(definition.id);
                      setInternalFocusedId(definition.id);
                    }
                  }}
                  showDroneView={showDroneView}
                />
              );
            })}
          </section>
        );
      })}

      {showDroneView && (
        <div className="mb-4"><DroneFeed /></div>
      )}

      {showDroneView && (
        <section className="rounded-xl border border-status-red/30 bg-status-red/5 p-4">
          <h4 className="text-sm font-bold text-brand-text-primary">Not feasible via drone</h4>
          <p className="mt-1 text-xs text-brand-text-secondary">
            These observations require contact, physical examination, or a dedicated sensor.
            The drone camera alone cannot produce them. The 12-month programme does not
            attempt to substitute the drone for these.
          </p>
          <ul className="mt-3 space-y-2">
            {OBSERVATION_CATALOGUE.filter((d) => d.droneCaptureRequirements?.feasible === false).map((d) => (
              <li key={d.id} className="rounded-lg border border-brand-secondary/20 bg-brand-surface/40 p-2.5">
                <p className="text-xs font-semibold text-brand-text-primary">{d.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-brand-text-secondary">
                  {d.droneCaptureRequirements?.notFeasibleReason ?? 'Not feasible via drone.'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!disabled && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-secondary/20 pt-4">
          <p className="text-[11px] text-brand-text-secondary">
            Recorded by {user.name}. Each saved item stores a time and quality flag; the physician signs a fingerprint
            of this evidence set.
          </p>
          <button type="button" onClick={onSave} className="btn-primary">
            Save evidence
          </button>
        </div>
      )}
    </div>
  );
};

export { OBSERVATION_BY_ID };
export default ObservationPanel;
