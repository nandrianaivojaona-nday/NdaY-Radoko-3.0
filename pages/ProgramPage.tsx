import React, { useState } from 'react';
import { Country, EvidenceClass } from '../types';
import { EvidenceBadge, Notice } from '../components/Badges';
import { CarePathway } from '../components/CarePathway';
import {
  APPLICATION_CHECKLIST,
  BUDGET,
  COMMITMENT_PACKAGE,
  CORE_MESSAGE,
  DRONE_MODULAR_CLAIM,
  EVIDENCE_REGISTER,
  INITIAL_CONFIGURATION,
  INTENDED_USE,
  LIVING_LAB_STATEMENT,
  OPEN_SOURCE_COMPONENTS,
  OUTCOME_MEASURES,
  PARTNERS,
  PARTNER_DIVISION,
  PARTNERSHIP_QUESTIONS,
  POSITIONING_STATEMENT,
  REVISED_PARTNERSHIP_TEXT,
  RISKS,
  WORK_PLAN,
} from '../data/program';

interface ProgramPageProps {
  countries: Country[];
}

const tabs = ['Intended use', 'Evidence register', 'Partnership', 'Work plan', 'Outcomes', 'Budget', 'Open source', 'Risks'] as const;
type Tab = (typeof tabs)[number];

const ProgramPage: React.FC<ProgramPageProps> = ({ countries }) => {
  const [tab, setTab] = useState<Tab>('Intended use');
  const configuredCountry = countries.find((country) => country.isImplemented);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">FemTech Ventures readiness</p>
        <h1 className="mt-1 text-2xl font-bold text-brand-text-primary md:text-3xl">Programme, evidence and open release</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-brand-text-secondary">{POSITIONING_STATEMENT}</p>
      </div>

      <div className="surface-card p-5">
        <p className="eyebrow">Core application message</p>
        <p className="mt-2 text-sm leading-relaxed text-brand-text-primary">{CORE_MESSAGE}</p>
        <p className="mt-3 text-xs text-brand-text-secondary">
          Territorial design scope: Madagascar. First pilot locality: to be selected and
          authorized. The configured Madagascar protocol context does not mean a field pilot
          is underway.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === item ? 'bg-brand-primary/20 text-brand-primary' : 'text-brand-text-secondary hover:bg-brand-raised'}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Intended use' && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Target population" body={INTENDED_USE.population} />
            <Card title="Service model" body={INTENDED_USE.service} />
            <Card title="Who operates at the household" body={INTENDED_USE.operator} />
            <Card title="Physician process" body={INTENDED_USE.physicianProcess} />
          </div>
          <Panel title="Supported assessment tasks" items={INTENDED_USE.supportedTasks} />
          <Panel title="Explicitly out of scope" items={INTENDED_USE.excluded} tone="red" />
          <Panel title="Escalation rules" items={INTENDED_USE.escalationRules} tone="accent" />
          <div>
            <h2 className="mb-3 text-lg font-bold text-brand-text-primary">Care pathway</h2>
            <CarePathway />
          </div>
          <Notice tone="warning" title="Clinical ratification required">
            The observation catalogue is a product-team proposal, not an approved clinical protocol. The clinical partner
            must map every required young-infant observation to a reliable collection method before any pilot use.
          </Notice>
        </div>
      )}

      {tab === 'Evidence register' && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {(['working', 'simulated', 'planned'] as EvidenceClass[]).map((status) => (
              <div key={status} className="surface-muted p-3">
                <EvidenceBadge status={status} />
                <p className="mt-2 text-2xl font-bold text-brand-text-primary">
                  {EVIDENCE_REGISTER.filter((i) => i.status === status).length}
                </p>
              </div>
            ))}
          </div>
          {EVIDENCE_REGISTER.map((item) => (
            <div key={item.id} className="surface-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-text-secondary">{item.area} · {item.id}</p>
                  <h3 className="mt-1 text-sm font-bold text-brand-text-primary">{item.claim}</h3>
                </div>
                <EvidenceBadge status={item.status} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-brand-text-secondary">{item.detail}</p>
              <p className="mt-2 text-[10px] text-brand-text-secondary/70">Source: {item.source}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Partnership' && (
        <div className="space-y-4">
          <div className="surface-card p-5">
            <p className="eyebrow">Living-lab geography</p>
            <p className="mt-2 text-sm leading-relaxed text-brand-text-primary">{LIVING_LAB_STATEMENT}</p>
            <p className="mt-3 text-xs text-brand-text-secondary">
              {DRONE_MODULAR_CLAIM}
            </p>
          </div>

          <div className="surface-card p-5">
            <p className="eyebrow">Prospective partners (desk research — none committed)</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-brand-background text-[10px] uppercase tracking-wide text-brand-text-secondary">
                  <tr><th className="p-2.5">Priority</th><th className="p-2.5">Prospective partner</th><th className="p-2.5">Evidence of fit</th><th className="p-2.5">Proposed Radoko role</th></tr>
                </thead>
                <tbody className="divide-y divide-brand-secondary/15">
                  {PARTNERS.map((partner) => (
                    <tr key={partner.name} className="align-top">
                      <td className="p-2.5 font-semibold text-brand-primary">{partner.priority}</td>
                      <td className="p-2.5 font-semibold text-brand-text-primary">{partner.name}</td>
                      <td className="p-2.5 text-brand-text-secondary">{partner.fit}</td>
                      <td className="p-2.5 text-brand-text-secondary">{partner.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="surface-card p-5">
              <p className="eyebrow">Local design and authorization discussions</p>
              <p className="mt-2 text-xs leading-relaxed text-brand-text-secondary">
                The first discussions should identify a suitable locality, document community
                priorities, confirm Health Worker and Community Health Agent roles, and establish
                the approvals required before any pilot.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-brand-text-secondary">
                {PARTNERSHIP_QUESTIONS.map((question) => (
                  <li key={question} className="flex gap-2">
                    <span className="text-brand-primary">•</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="surface-card p-5">
              <p className="eyebrow">Bounded initial configuration</p>
              <ul className="mt-3 space-y-1.5 text-xs text-brand-text-secondary">
                {INITIAL_CONFIGURATION.map((item) => <li key={item} className="flex gap-2"><span className="text-brand-primary">•</span><span>{item}</span></li>)}
              </ul>
            </div>
          </div>

          <div className="surface-card p-5">
            <p className="eyebrow">Proposed division of responsibilities</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {PARTNER_DIVISION.map((row) => (
                <div key={row.partner} className="rounded-lg border border-brand-secondary/20 bg-brand-background p-3 text-xs">
                  <p className="font-semibold text-brand-text-primary">{row.partner}</p>
                  <p className="mt-1 text-brand-text-secondary">{row.contribution}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-5">
            <p className="eyebrow">Commitment package to seek before 11 November</p>
            <div className="mt-3 space-y-2">
              {COMMITMENT_PACKAGE.map((item) => (
                <div key={item.document} className="rounded-lg border border-brand-secondary/20 bg-brand-background p-3 text-xs">
                  <p className="font-semibold text-brand-text-primary">{item.document}</p>
                  <p className="mt-1 text-brand-text-secondary">{item.minimum}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-brand-text-secondary">
              A letter of interest is not research approval, permission to access patient data, or authorisation to fly.
            </p>
          </div>

          <div className="surface-card p-5">
            <p className="eyebrow">Revised application partnership text</p>
            <div className="mt-3 whitespace-pre-wrap rounded-lg bg-brand-background p-4 text-xs leading-relaxed text-brand-text-primary">
              {REVISED_PARTNERSHIP_TEXT}
            </div>
          </div>
        </div>
      )}

      {tab === 'Work plan' && (
        <div className="space-y-3">
          {WORK_PLAN.map((phase) => (
            <div key={phase.id} className="surface-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-primary">{phase.months}</p>
                  <h3 className="text-sm font-bold text-brand-text-primary">{phase.title}</h3>
                </div>
                <span className={`badge ${phase.status === 'In progress' ? 'bg-brand-primary/15 text-brand-primary' : 'bg-brand-text-secondary/10 text-brand-text-secondary'}`}>{phase.status}</span>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-brand-text-secondary">
                {phase.activities.map((activity) => <li key={activity}>• {activity}</li>)}
              </ul>
              <p className="mt-2 rounded bg-brand-background/50 p-2 text-[11px] text-brand-text-primary">Evidence: {phase.evidenceProduced}</p>
            </div>
          ))}
          <Notice tone="info">Progression to clinical use depends on evidence and approvals, not simply on reaching a calendar month.</Notice>
        </div>
      )}

      {tab === 'Outcomes' && (
        <div className="surface-card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-brand-background/50 text-[10px] uppercase tracking-wide text-brand-text-secondary">
              <tr>
                <th className="p-3">Dimension</th><th className="p-3">Measure</th><th className="p-3">Baseline</th><th className="p-3">Target</th><th className="p-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-secondary/20">
              {OUTCOME_MEASURES.map((measure) => (
                <tr key={measure.dimension}>
                  <td className="p-3 font-semibold text-brand-text-primary">{measure.dimension}</td>
                  <td className="p-3 text-brand-text-secondary">{measure.measure}</td>
                  <td className="p-3 text-brand-text-secondary">{measure.baseline}</td>
                  <td className="p-3 text-brand-text-secondary">{measure.target}</td>
                  <td className="p-3 text-brand-text-secondary">{measure.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Budget' && (
        <div className="space-y-3">
          <div className="surface-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-background/50 text-[10px] uppercase tracking-wide text-brand-text-secondary">
                <tr><th className="p-3">Workstream</th><th className="p-3">US$</th><th className="p-3">Note</th></tr>
              </thead>
              <tbody className="divide-y divide-brand-secondary/20">
                {BUDGET.map((line) => (
                  <tr key={line.workstream}>
                    <td className="p-3 font-semibold text-brand-text-primary">{line.workstream}</td>
                    <td className="p-3 text-brand-text-primary">{line.amountUsd.toLocaleString()}</td>
                    <td className="p-3 text-brand-text-secondary">{line.note}</td>
                  </tr>
                ))}
                <tr className="bg-brand-background/40 font-bold">
                  <td className="p-3 text-brand-text-primary">Total</td>
                  <td className="p-3 text-brand-primary">100,000</td>
                  <td className="p-3 text-brand-text-secondary">Illustrative allocation, not confirmed eligible costs.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Notice tone="warning">If a new aircraft and a new clinical device are both required, reduce scope or secure complementary resources. Do not promise an unaffordable end-to-end system.</Notice>
        </div>
      )}

      {tab === 'Open source' && (
        <div className="space-y-3">
          <div className="surface-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-background/50 text-[10px] uppercase tracking-wide text-brand-text-secondary">
                <tr><th className="p-3">Component</th><th className="p-3">Licence plan</th><th className="p-3">Note</th></tr>
              </thead>
              <tbody className="divide-y divide-brand-secondary/20">
                {OPEN_SOURCE_COMPONENTS.map((component) => (
                  <tr key={component.component}>
                    <td className="p-3 font-semibold text-brand-text-primary">{component.component}</td>
                    <td className="p-3 text-brand-text-secondary">{component.licence}</td>
                    <td className="p-3 text-brand-text-secondary">{component.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Notice tone="info" title="Release status">
            The repository contains a release plan and sample synthetic data, but no public release has been made. Brand
            assets and trademarks are excluded from the code licence. Patient data will never be released.
          </Notice>
        </div>
      )}

      {tab === 'Risks' && (
        <div className="space-y-2">
          {RISKS.map((risk) => (
            <div key={risk.risk} className="surface-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-brand-text-primary">{risk.risk}</h3>
                <span className={`badge ${risk.impact === 'Critical' ? 'bg-status-red/15 text-status-red' : 'bg-brand-accent/15 text-brand-accent'}`}>{risk.impact}</span>
              </div>
              <p className="mt-2 text-xs text-brand-text-secondary"><span className="font-semibold text-brand-text-primary">Mitigation:</span> {risk.mitigation}</p>
            </div>
          ))}
          <div className="surface-card p-4">
            <h3 className="text-sm font-bold text-brand-text-primary">Application readiness checklist</h3>
            <ul className="mt-2 space-y-1 text-xs text-brand-text-secondary">
              {APPLICATION_CHECKLIST.map((item) => (
                <li key={item.item} className="flex flex-wrap justify-between gap-2 border-b border-brand-secondary/15 py-1.5 last:border-0">
                  <span>{item.item}</span><span className="font-semibold text-brand-accent">{item.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

const Card: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="surface-card p-4">
    <h3 className="text-sm font-bold text-brand-text-primary">{title}</h3>
    <p className="mt-2 text-xs leading-relaxed text-brand-text-secondary">{body}</p>
  </div>
);

const Panel: React.FC<{ title: string; items: string[]; tone?: 'red' | 'accent' | 'default' }> = ({ title, items, tone = 'default' }) => (
  <div className="surface-card p-4">
    <h3 className={`text-sm font-bold ${tone === 'red' ? 'text-status-red' : tone === 'accent' ? 'text-brand-accent' : 'text-brand-text-primary'}`}>{title}</h3>
    <ul className="mt-2 space-y-1.5 text-xs text-brand-text-secondary">
      {items.map((item) => <li key={item} className="flex gap-2"><span className="text-brand-primary">•</span><span>{item}</span></li>)}
    </ul>
  </div>
);

export default ProgramPage;
