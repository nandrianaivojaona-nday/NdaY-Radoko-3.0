import React, { useState } from 'react';
import { EvidenceBadge, Notice } from '../components/Badges';
import {
  CLOSING_PROPOSITION,
  CODE_MAPPING,
  ENCOUNTER_STEPS,
  OPERATING_ARRANGEMENT,
  SERVICE_MAP,
  WORKFLOW_DISCLAIMER,
  WORKFLOW_DIVISION,
  WORKSHOP_OUTPUT,
  WORKSHOP_QUESTIONS,
} from '../data/workflow';

const WorkflowPage: React.FC = () => {
  const [openStep, setOpenStep] = useState<number | null>(1);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Madagascar · adaptable local workflow</p>
        <h1 className="mt-1 text-2xl font-bold text-brand-text-primary md:text-3xl">
          Proposed maternal and young-infant care workflow
        </h1>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-brand-text-secondary">
          NdaY’Radoko is being designed for adaptation to eligible localities across Madagascar.
          The first pilot locality has not been selected. The proposed model would support an
          existing care network: authorized workers collect approved information, Radoko organizes
          it, and a Health Worker makes any clinical decision.
        </p>
      </div>

      <Notice tone="warning" title="For discussion — not an agreement or an approved protocol">
        {WORKFLOW_DISCLAIMER}
      </Notice>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="surface-card p-5">
          <p className="eyebrow">Generic service pathway — locality to be confirmed</p>
          <ol className="mt-3 space-y-1">
            {SERVICE_MAP.map((node) => (
              <li key={node.step} className="flex gap-2 text-sm">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${node.urgent ? 'bg-status-red' : 'bg-brand-primary'}`} />
                <div>
                  <p className={node.urgent ? 'font-semibold text-status-red' : 'font-medium text-brand-text-primary'}>{node.step}</p>
                  {node.note && <p className="text-xs text-brand-text-secondary">{node.note}</p>}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] leading-relaxed text-brand-text-secondary">
            The care network, contacts, referral destinations, and operating procedures must be
            confirmed for the locality selected with the Ministry of Health, Health Workers,
            Community Health Agents, and community members. No locality or service authorization
            is currently confirmed.
          </p>
        </div>

        <div className="surface-card p-5">
          <p className="eyebrow">Before the first encounter — agree the operating arrangement</p>
          <div className="mt-3 space-y-2">
            {OPERATING_ARRANGEMENT.map((row) => (
              <div key={row.decision} className="rounded-lg border border-brand-secondary/20 bg-brand-background p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-brand-text-primary">{row.decision}</p>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-primary">{row.lead}</span>
                </div>
                <p className="mt-1 text-brand-text-secondary">{row.toAgree}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <p className="eyebrow">Encounter workflow, step by step</p>
        <div className="mt-3 space-y-2">
          {ENCOUNTER_STEPS.map((step) => (
            <div key={step.id} className="surface-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenStep(openStep === step.id ? null : step.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/15 text-xs font-bold text-brand-primary">
                    {step.id}
                  </span>
                  <p className="text-sm font-bold text-brand-text-primary">{step.title}</p>
                </div>
                <span className="text-brand-text-secondary">{openStep === step.id ? '−' : '+'}</span>
              </button>
              {openStep === step.id && (
                <div className="border-t border-brand-secondary/15 p-4">
                  <p className="text-sm leading-relaxed text-brand-text-secondary">{step.detail}</p>
                  {step.bullets && step.bullets.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-brand-text-secondary">
                      {step.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2"><span className="text-brand-primary">•</span><span>{bullet}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <p className="eyebrow">Division of responsibilities</p>
          <div className="mt-3 space-y-2">
            {WORKFLOW_DIVISION.map((row) => (
              <div key={row.actor} className="rounded-lg border border-brand-secondary/20 bg-brand-background p-3 text-xs">
                <p className="font-semibold text-brand-text-primary">{row.actor}</p>
                <p className="mt-1 text-brand-text-secondary">{row.responsibility}</p>
                <p className="mt-1 text-[11px] text-brand-text-secondary/80"><span className="font-semibold">Boundary:</span> {row.boundary}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <p className="eyebrow">How this maps to the current Radoko code</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-brand-background text-[10px] uppercase tracking-wide text-brand-text-secondary">
                <tr><th className="p-2">Existing element</th><th className="p-2">Required evolution</th><th className="p-2">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-brand-secondary/15">
                {CODE_MAPPING.map((row) => (
                  <tr key={row.element} className="align-top">
                    <td className="p-2 font-semibold text-brand-text-primary">{row.element}</td>
                    <td className="p-2 text-brand-text-secondary">{row.evolution}</td>
                    <td className="p-2"><EvidenceBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="surface-card p-5">
        <p className="eyebrow">Local design and authorization discussions</p>
        <p className="mt-1 text-sm text-brand-text-secondary">
          Discussions should document community priorities, the applicable service workflow,
          required approvals, and evidence needed before any pilot use.
        </p>
        <ol className="mt-3 grid gap-2 md:grid-cols-2">
          {WORKSHOP_QUESTIONS.map((question, index) => (
            <li key={question} className="flex gap-2 rounded-lg border border-brand-secondary/20 bg-brand-background p-3 text-xs">
              <span className="font-bold text-brand-primary">{index + 1}.</span>
              <span className="text-brand-text-secondary">{question}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-brand-text-secondary"><span className="font-semibold text-brand-text-primary">Resulting package:</span> {WORKSHOP_OUTPUT}</p>
      </section>

      <Notice tone="success" title="The compelling proposition">
        {CLOSING_PROPOSITION}
      </Notice>
    </div>
  );
};

export default WorkflowPage;
