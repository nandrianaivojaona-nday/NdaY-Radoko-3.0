import React, { useMemo, useState } from 'react';
import { isUsableObservation } from '../data/observations';
import { Country, Encounter, Facility, Patient, Session } from '../types';
import { EncounterStatusBadge } from '../components/Badges';
import { formatDateTime } from '../utils/format';

interface CareQueuePageProps {
  encounters: Encounter[];
  patients: Patient[];
  countries: Country[];
  facilities: Facility[];
  session: Session;
  onOpenEncounter: (encounter: Encounter) => void;
  onNewEncounter: () => void;
}

type Filter = 'all' | 'review' | 'active' | 'urgent' | 'closed';

const CareQueuePage: React.FC<CareQueuePageProps> = ({
  encounters,
  patients,
  countries,
  facilities,
  session,
  onOpenEncounter,
  onNewEncounter,
}) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const patientById = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const facilityById = useMemo(() => new Map(facilities.map((f) => [f.id, f])), [facilities]);
  const countryById = useMemo(() => new Map(countries.map((c) => [c.id, c])), [countries]);

  const counts = useMemo(
    () => ({
      all: encounters.length,
      review: encounters.filter((e) => e.status === 'Awaiting physician review' || e.status === 'AI draft ready' || e.status === 'More information requested').length,
      active: encounters.filter((e) => !['Closed'].includes(e.status) && e.status !== 'Awaiting physician review').length,
      urgent: encounters.filter((e) => e.safetyEscalation.triggered && e.status !== 'Closed').length,
      closed: encounters.filter((e) => e.status === 'Closed').length,
    }),
    [encounters],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return encounters
      .filter((encounter) => {
        if (filter === 'review') {
          if (!['Awaiting physician review', 'AI draft ready', 'More information requested'].includes(encounter.status)) return false;
        }
        if (filter === 'active') {
          if (encounter.status === 'Closed' || encounter.status === 'Awaiting physician review') return false;
        }
        if (filter === 'urgent' && !(encounter.safetyEscalation.triggered && encounter.status !== 'Closed')) return false;
        if (filter === 'closed' && encounter.status !== 'Closed') return false;
        if (!term) return true;
        const patient = patientById.get(encounter.patientId);
        return [encounter.id, patient?.name, patient?.village, patient?.caregiverName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .sort((a, b) => {
        const aUrgent = a.safetyEscalation.triggered ? 1 : 0;
        const bUrgent = b.safetyEscalation.triggered ? 1 : 0;
        if (aUrgent !== bUrgent) return bUrgent - aUrgent;
        return new Date(b.history[0]?.at ?? b.createdAt).getTime() - new Date(a.history[0]?.at ?? a.createdAt).getTime();
      });
  }, [encounters, filter, search, patientById]);

  const canCreate = session.user.role !== 'Program Admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Clinical operations</p>
          <h1 className="mt-1 text-2xl font-bold text-brand-text-primary md:text-3xl">Care queue</h1>
          <p className="mt-1 max-w-2xl text-sm text-brand-text-secondary">
            Encounters are separate from patient records. The queue shows where each infant is in the pathway, who
            holds the next action, and whether evidence is waiting for a physician.
          </p>
        </div>
        {canCreate && (
          <button type="button" className="btn-primary" onClick={onNewEncounter}>
            + New encounter
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Awaiting physician review" value={counts.review} tone="accent" />
        <StatCard label="Active encounters" value={counts.active} tone="primary" />
        <StatCard label="Urgent escalations open" value={counts.urgent} tone="red" />
        <StatCard label="Closed" value={counts.closed} tone="muted" />
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-secondary/25 p-4">
          <div className="flex flex-wrap gap-1">
            {([
              ['all', `All (${counts.all})`],
              ['review', `Review (${counts.review})`],
              ['active', `Active (${counts.active})`],
              ['urgent', `Urgent (${counts.urgent})`],
              ['closed', `Closed (${counts.closed})`],
            ] as [Filter, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  filter === key ? 'bg-brand-primary/20 text-brand-primary' : 'text-brand-text-secondary hover:bg-brand-raised'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            className="input-field max-w-xs py-2 text-xs"
            placeholder="Search infant, caregiver, village, encounter…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-brand-text-secondary">No encounters match this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-brand-background/50 text-[10px] uppercase tracking-wide text-brand-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Infant</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Facility</th>
                  <th className="px-4 py-3 font-semibold">Evidence</th>
                  <th className="px-4 py-3 font-semibold">AI draft</th>
                  <th className="px-4 py-3 font-semibold">Last activity</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-secondary/15">
                {filtered.map((encounter) => {
                  const patient = patientById.get(encounter.patientId);
                  const facility = facilityById.get(encounter.facilityId);
                  const assessed = encounter.observations.filter(isUsableObservation).length;
                  const total = encounter.observations.length;
                  return (
                    <tr key={encounter.id} className="align-top hover:bg-brand-raised/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-brand-text-primary">{patient?.name ?? 'Unknown patient'}</p>
                        <p className="text-xs text-brand-text-secondary">
                          {patient?.ageLabel} · {patient?.village} · caregiver {patient?.caregiverName}
                        </p>
                        <p className="mt-1 text-[10px] text-brand-text-secondary/70">
                          {encounter.id} · {countryById.get(encounter.countryId)?.name}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <EncounterStatusBadge status={encounter.status} />
                        {encounter.safetyEscalation.triggered && (
                          <p className="mt-1 text-[10px] font-semibold text-status-red">Urgent pathway</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-brand-text-secondary">
                        {facility?.name ?? 'Unknown'}
                        <p className="text-[10px]">{encounter.equipmentMode}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-brand-text-secondary">
                        {assessed}/{total} recorded
                        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-brand-surface">
                          <div className="h-full bg-brand-primary" style={{ width: `${Math.round((assessed / total) * 100)}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {encounter.aiDraft ? (
                          <span className={encounter.aiDraft.simulated ? 'text-brand-accent' : 'text-brand-mint'}>
                            {encounter.aiDraft.simulated ? 'Simulated draft' : 'AI draft'}
                          </span>
                        ) : (
                          <span className="text-brand-text-secondary">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-brand-text-secondary">
                        {formatDateTime(encounter.history[0]?.at ?? encounter.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => onOpenEncounter(encounter)}>
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <RuleCard title="“Not assessed” is not normal" text="The completeness bar counts required observations with a value and a quality flag. Unusable evidence is flagged separately." />
        <RuleCard title="Physician authority" text="The AI draft cannot sign. Only a physician account assigned to the encounter facility can create a disposition." />
        <RuleCard title="Urgent care bypass" text="Danger signs create a same-day referral without waiting for a draft, model response, or flight." />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; tone: 'accent' | 'primary' | 'red' | 'muted' }> = ({ label, value, tone }) => {
  const tones = {
    accent: 'border-brand-accent/30 bg-brand-accent/10 text-brand-accent',
    primary: 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary',
    red: 'border-status-red/30 bg-status-red/10 text-status-red',
    muted: 'border-brand-secondary/30 bg-brand-surface/40 text-brand-text-primary',
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-semibold text-brand-text-secondary">{label}</p>
    </div>
  );
};

const RuleCard: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <div className="surface-muted p-4">
    <p className="text-sm font-semibold text-brand-text-primary">{title}</p>
    <p className="mt-1 text-xs leading-relaxed text-brand-text-secondary">{text}</p>
  </div>
);

export default CareQueuePage;
