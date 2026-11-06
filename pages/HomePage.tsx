import React from 'react';
import { Country, Drone, Encounter, Facility, Patient, Session } from '../types';
import { BrandPartners } from '../components/Brand';
import { EncounterStatusBadge, EvidenceBadge, Notice, PrototypeBanner } from '../components/Badges';
import { CarePathway } from '../components/CarePathway';
import { CALL_FACTS, EVIDENCE_REGISTER, INTENDED_USE, POSITIONING_STATEMENT, WORK_PLAN } from '../data/program';
import { formatDateTime } from '../utils/format';

interface HomePageProps {
  session: Session;
  encounters: Encounter[];
  patients: Patient[];
  countries: Country[];
  drones: Drone[];
  facilities: Facility[];
  onOpenEncounter: (encounter: Encounter) => void;
  onNewEncounter: () => void;
  onGoToCare: () => void;
  onGoToProgram: () => void;
}

const HomePage: React.FC<HomePageProps> = ({
  session,
  encounters,
  patients,
  countries,
  drones,
  facilities,
  onOpenEncounter,
  onNewEncounter,
  onGoToCare,
  onGoToProgram,
}) => {
  const patientById = new Map<string, Patient>(patients.map((p) => [p.id, p]));
  const awaiting = encounters.filter((e) =>
    ['Awaiting physician review', 'AI draft ready', 'More information requested'].includes(e.status),
  ).length;
  const urgentOpen = encounters.filter((e) => e.safetyEscalation.triggered && e.status !== 'Closed').length;
  const signed = encounters.filter((e) => Boolean(e.physicianDecision)).length;
  const pilot = countries.find((c) => c.isImplemented);
  const evidenceCounts = EVIDENCE_REGISTER.reduce(
    (acc, item) => ({ ...acc, [item.status]: acc[item.status] + 1 }),
    { working: 0, simulated: 0, planned: 0 } as Record<'working' | 'simulated' | 'planned', number>,
  );
  const recent = [...encounters]
    .sort((a, b) => new Date(b.history[0]?.at ?? b.createdAt).getTime() - new Date(a.history[0]?.at ?? a.createdAt).getTime())
    .slice(0, 4);
  const canCreate = session.user.role !== 'Program Admin';

  return (
    <div className="space-y-8">
      <section className="surface-card relative overflow-hidden bg-radial-brand p-6 md:p-8">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <BrandPartners orientation="row" />
            <h1 className="mt-6 max-w-2xl text-balance text-3xl font-bold leading-tight text-brand-text-primary md:text-4xl">
              Bringing physician-supervised young-infant care closer to remote mothers and families.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-brand-text-secondary">{POSITIONING_STATEMENT}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={onGoToCare}>
                Open care queue
              </button>
              {canCreate && (
                <button type="button" className="btn-secondary" onClick={onNewEncounter}>
                  Register an encounter
                </button>
              )}
              <button type="button" className="btn-ghost" onClick={onGoToProgram}>
                Programme &amp; evidence →
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-secondary/25 bg-brand-background/50 p-4">
            <p className="eyebrow">Pilot context</p>
            <p className="mt-2 text-lg font-bold text-brand-text-primary">{pilot?.name ?? 'No pilot configured'}</p>
            <p className="mt-1 text-xs leading-relaxed text-brand-text-secondary">
              {INTENDED_USE.population}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <Metric label="Awaiting review" value={awaiting} />
              <Metric label="Open urgent" value={urgentOpen} tone="red" />
              <Metric label="Physician-signed" value={signed} />
              <Metric label="Synthetic encounters" value={encounters.length} />
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-brand-text-secondary/70">
              Synthetic demonstration data. No real patients, flights, or clinical outcomes are represented.
            </p>
          </div>
        </div>
      </section>

      <PrototypeBanner />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="surface-card p-5">
          <p className="eyebrow">What the service is</p>
          <ul className="mt-3 space-y-2 text-sm text-brand-text-secondary">
            <li>• A structured, consent-based assessment support pathway.</li>
            <li>• A trained field assistant working beside the caregiver, not replacing them.</li>
            <li>• An AI documentation draft that a physician reviews and signs.</li>
            <li>• A defined referral route when in-person care is necessary.</li>
            <li>• A drone-enabled option whose added value must be demonstrated.</li>
          </ul>
        </div>
        <div className="surface-card p-5">
          <p className="eyebrow">What it is not</p>
          <ul className="mt-3 space-y-2 text-sm text-brand-text-secondary">
            <li>• Not an AI doctor and not an autonomous diagnostic device.</li>
            <li>• Not a replacement for health workers or in-person examination.</li>
            <li>• Not clinically validated and not measuring mortality impact.</li>
            <li>• Not connected to a real drone, health record, or emergency service.</li>
            <li>• Not approved for real patient data in this repository.</li>
          </ul>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow">Service model</p>
            <h2 className="mt-1 text-xl font-bold text-brand-text-primary">A defined care pathway, not a technology demonstration</h2>
          </div>
          <button type="button" className="btn-ghost text-xs" onClick={onGoToProgram}>See intended use</button>
        </div>
        <CarePathway />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">Evidence register</p>
              <h2 className="mt-1 text-xl font-bold text-brand-text-primary">What is working, simulated, and planned</h2>
            </div>
            <button type="button" className="btn-ghost text-xs" onClick={onGoToProgram}>Open register</button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <EvidenceCount label="Working" value={evidenceCounts.working} status="working" />
            <EvidenceCount label="Simulated" value={evidenceCounts.simulated} status="simulated" />
            <EvidenceCount label="Planned" value={evidenceCounts.planned} status="planned" />
          </div>
          <ul className="mt-4 space-y-2">
            {EVIDENCE_REGISTER.filter((item) => item.status === 'working').slice(0, 4).map((item) => (
              <li key={item.id} className="rounded-lg border border-brand-secondary/20 bg-brand-background/40 p-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-brand-text-primary">{item.claim}</p>
                  <EvidenceBadge status={item.status} />
                </div>
                <p className="mt-1 text-brand-text-secondary">{item.area} · {item.source}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-brand-text-secondary">
            No accuracy figure is claimed. The prototype has no measured sensitivity or specificity.
          </p>
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <p className="eyebrow">FemTech fit</p>
            <h2 className="mt-1 text-xl font-bold text-brand-text-primary">Mother–infant care journey</h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-text-secondary">
              The proposal supports postnatal care, newborn health, and primary/community care. The woman’s experience is
              a design input, not an afterthought: privacy, burden, travel, and confidence in instructions are explicit
              measures.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-brand-text-secondary">
              <li>• Consent, image capture choice, and private communication are recorded.</li>
              <li>• Avoidable travel is a measured outcome, not an assumed benefit.</li>
              <li>• Caregiver instructions and safety netting are part of the signed decision.</li>
            </ul>
          </div>

          <div className="surface-card p-5">
            <p className="eyebrow">12-month structure</p>
            <ol className="mt-3 space-y-2">
              {WORK_PLAN.slice(0, 4).map((phase) => (
                <li key={phase.id} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 rounded bg-brand-surface px-1.5 py-0.5 font-semibold text-brand-primary">{phase.months}</span>
                  <span className="text-brand-text-secondary">{phase.title}</span>
                </li>
              ))}
            </ol>
            <button type="button" className="btn-ghost mt-3 px-0 text-xs" onClick={onGoToProgram}>
              View full work plan and budget →
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-text-primary">Recent encounters</h2>
            <button type="button" className="btn-ghost text-xs" onClick={onGoToCare}>View all</button>
          </div>
          <ul className="mt-3 space-y-2">
            {recent.map((encounter) => {
              const patient = patientById.get(encounter.patientId);
              return (
                <li key={encounter.id}>
                  <button
                    type="button"
                    onClick={() => onOpenEncounter(encounter)}
                    className="w-full rounded-xl border border-brand-secondary/20 bg-brand-background/40 p-3 text-left hover:border-brand-primary/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-brand-text-primary">{patient?.name}</p>
                      <EncounterStatusBadge status={encounter.status} />
                    </div>
                    <p className="mt-1 text-xs text-brand-text-secondary">
                      {patient?.ageLabel} · {patient?.village} · {encounter.equipmentMode}
                    </p>
                    <p className="mt-1 text-[10px] text-brand-text-secondary/70">
                      {encounter.id} · updated {formatDateTime(encounter.history[0]?.at ?? encounter.createdAt)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <p className="eyebrow">Call context</p>
            <h2 className="mt-1 text-lg font-bold text-brand-text-primary">UNICEF Femtech Ventures</h2>
            <ul className="mt-3 space-y-2 text-xs text-brand-text-secondary">
              {CALL_FACTS.map((fact) => (
                <li key={fact} className="flex gap-2">
                  <span className="text-brand-primary">•</span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>
          <Notice tone="warning" title="Do not fill application gaps with invented evidence">
            Pilot users, partner commitments, accuracy, travel savings, and clinical outcomes must be documented, not
            fabricated. This repository labels every unproven area as simulated or planned.
          </Notice>
        </div>
      </section>

      <section className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Equipment status</p>
            <p className="mt-1 text-sm text-brand-text-primary">
              {drones.length} demonstration equipment record(s). No flight has been conducted; readiness checks are labelled.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {drones.map((drone) => (
              <span key={drone.id} className="rounded-lg border border-brand-secondary/25 bg-brand-background/40 px-2.5 py-1 text-[11px] text-brand-text-secondary">
                {drone.name} · {drone.status}
              </span>
            ))}
          </div>
        </div>
      </section>

      <p className="text-center text-[11px] text-brand-text-secondary/70">
        Facilities in this demo: {facilities.map((f) => f.name).join(' · ')}
      </p>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number; tone?: 'red' }> = ({ label, value, tone }) => (
  <div className={`rounded-lg border p-2 ${tone === 'red' ? 'border-status-red/30 bg-status-red/10' : 'border-brand-secondary/20 bg-brand-surface/50'}`}>
    <p className={`text-2xl font-bold ${tone === 'red' ? 'text-status-red' : 'text-brand-text-primary'}`}>{value}</p>
    <p className="text-[10px] text-brand-text-secondary">{label}</p>
  </div>
);

const EvidenceCount: React.FC<{ label: string; value: number; status: 'working' | 'simulated' | 'planned' }> = ({ label, value, status }) => (
  <div className="rounded-lg border border-brand-secondary/20 bg-brand-background/40 p-2 text-center">
    <p className="text-xl font-bold text-brand-text-primary">{value}</p>
    <div className="mt-1 flex justify-center"><EvidenceBadge status={status} label={label} /></div>
  </div>
);

export default HomePage;
