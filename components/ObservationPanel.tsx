import React, { useMemo, useState } from 'react';
import { Observation, ObservationDefinition, ObservationQuality, UserAccount, ProtocolSource } from '../types';
import {
  OBSERVATION_BY_ID,
  OBSERVATION_CATALOGUE,
  OBSERVATION_CATEGORIES,
  isUsableObservation,
  summariseCompleteness,
  getObservationTraceabilityStatus
} from '../data/observations';
import { Notice, QualityBadge } from './Badges';
import {MADAGASCAR_YOUNG_INFANT_SOURCES} from '@/data/protocoleSources';

interface ObservationPanelProps {
  observations: Observation[];
  onChange: (observations: Observation[]) => void;
  onSave: () => void;
  user: UserAccount;
  disabled?: boolean;
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

const defaultQualityFor = (definition: ObservationDefinition): ObservationQuality => {
  switch (definition.method) {
    case 'Caregiver report':
      return 'Reported — unverified';
    case 'Device measurement':
      return 'Measured — device';
    case 'Remote visual observation':
      return 'Observed — remote';
    case 'Trained in-person assessment':
      return 'Observed — in person';
    default:
      return 'Not assessed';
  }
};

const feasibilityStyle = (feasibility: ObservationDefinition['remoteFeasibility']): string => {
  switch (feasibility) {
    case 'Remote':
      return 'bg-brand-mint/10 text-brand-mint';
    case 'Remote with trained assistant':
      return 'bg-brand-primary/10 text-brand-primary';
    default:
      return 'bg-status-red/10 text-status-red';
  }
};

const ObservationRow: React.FC<{
  definition: ObservationDefinition;
  observation: Observation;
  disabled: boolean;
  onUpdate: (next: Observation) => void;
  user: UserAccount;
}> = ({ definition, observation, disabled, onUpdate, user }) => {
  const [showNotes, setShowNotes] = useState(Boolean(observation.notes));

  const setValue = (value: string) => {
    let quality: ObservationQuality;
    if (!value.trim()) quality = 'Not assessed';
    else if (/^unable|not assessed/i.test(value)) quality = 'Unusable';
    else if (/^unavailable|declined/i.test(value)) quality = 'Unavailable';
    else quality = defaultQualityFor(definition);
    onUpdate({
      ...observation,
      value,
      quality,
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
      recordedAt: null,
      recordedBy: null,
      notes: '',
    });

  return (
    <div className="rounded-xl border border-brand-secondary/20 bg-brand-background/30 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-text-primary">
            {definition.label}
            {definition.requiredForReview && <span className="ml-1 text-brand-accent">*</span>}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
  <span className="text-[10px] text-brand-text-secondary/70">
    Working reference label: {definition.protocolReference}
  </span>
  <span className="badge bg-brand-accent/15 text-[10px] text-brand-accent">
    {getObservationTraceabilityStatus(
      definition,
      MADAGASCAR_YOUNG_INFANT_SOURCES,
    )}
  </span>
</div>

{(definition.protocolCitations ?? []).map((citation, index) => (
  <p
    key={`${citation.sourceId}-${index}`}
    className="mt-1 text-[10px] text-brand-text-secondary/70"
  >
    {citation.sourceId} · {citation.section} · p. {citation.page}
    {citation.tableOrStep ? ` · ${citation.tableOrStep}` : ''}
  </p>
))}
        </div>
        <QualityBadge quality={observation.quality} />
        {observation.source && observation.source !== 'Unavailable' && (
          <span className="badge bg-brand-text-secondary/10 text-[10px] text-brand-text-secondary">
            via {observation.source}
          </span>
        )}
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-[1.1fr_1fr_auto]">
        <div>
          {definition.valueType === 'select' ? (
            <select
              className="input-field py-2 text-xs"
              value={observation.value}
              onChange={(e) => setValue(e.target.value)}
              disabled={disabled}
              aria-label={definition.label}
            >
              <option value="">Select…</option>
              {(definition.options ?? []).map((option) => (
                <option key={option} value={option}>{option}</option>
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
            <option key={quality} value={quality}>{quality}</option>
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
          <button type="button" className="btn-ghost px-2 py-1 text-[10px]" onClick={reset} disabled={disabled}>
            Reset
          </button>
        </div>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-brand-text-secondary/80">{definition.guidance}</p>

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

const ObservationPanel: React.FC<ObservationPanelProps> = ({ observations, onChange, onSave, user, disabled = false }) => {
  const [showAll, setShowAll] = useState(false);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const byId = useMemo(() => new Map(observations.map((o) => [o.definitionId, o])), [observations]);
  const summary = useMemo(() => summariseCompleteness(observations), [observations]);

  const updateOne = (next: Observation) => {
    onChange(observations.map((o) => (o.definitionId === next.definitionId ? next : o)));
  };

  const visibleDefinitions = OBSERVATION_CATALOGUE.filter((definition) => {
    if (!showAll && !definition.requiredForReview && !byId.get(definition.id)?.value) return false;
    if (showMissingOnly) {
      const observation = byId.get(definition.id);
      if (observation && isUsableObservation(observation)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-brand-secondary/25 bg-brand-background/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-text-primary">
              Required observations: {summary.requiredAssessed}/{summary.requiredTotal}
            </p>
            <p className="text-xs text-brand-text-secondary">
              {summary.requiredMissing.length === 0
                ? 'All required observations have usable evidence. A physician can still request more information.'
                : `${summary.requiredMissing.length} required observation${summary.requiredMissing.length === 1 ? '' : 's'} lack usable evidence.`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-brand-primary">{summary.percentComplete}%</p>
            <p className="text-[10px] uppercase tracking-wide text-brand-text-secondary">required complete</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-surface">
          <div className="h-full rounded-full bg-brand-primary transition-all" style={{ width: `${summary.percentComplete}%` }} />
        </div>
        {summary.requiredUnreliable > 0 && (
          <p className="mt-2 text-xs text-status-red">
            {summary.requiredUnreliable} required observation(s) are marked unusable. A physician must decide whether
            in-person assessment is needed.
          </p>
        )}

        {summary.requiredUnavailable > 0 && (
          <p className="mt-2 text-xs text-status-red">
            {summary.requiredUnavailable} required observation(s) are unavailable. A physician must decide whether
            they can be obtained safely or require in-person assessment.
          </p>
        )}
      </div>

      {summary.requiredMissing.length > 0 && (
        <Notice tone="warning" title="Missing, unavailable, or unusable is not “normal”">
          Required items without usable evidence: {summary.requiredMissing.map((d) => d.label).join(', ')}.
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setShowAll((s) => !s)}>
          {showAll ? 'Show required only' : `Show all ${OBSERVATION_CATALOGUE.length} observations`}
        </button>
        <button
          type="button"
          className={`btn-ghost px-3 py-1.5 text-xs ${showMissingOnly ? 'text-brand-accent' : ''}`}
          onClick={() => setShowMissingOnly((s) => !s)}
        >
          {showMissingOnly ? 'Showing missing only' : 'Show missing only'}
        </button>
      </div>

      {OBSERVATION_CATEGORIES.map((category) => {
        const definitions = visibleDefinitions.filter((d) => d.category === category);
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
              return (
                <ObservationRow
                  key={definition.id}
                  definition={definition}
                  observation={observation}
                  disabled={disabled}
                  onUpdate={updateOne}
                  user={user}
                />
              );
            })}
          </section>
        );
      })}

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
