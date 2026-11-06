import React from 'react';
import { CARE_PATHWAY, URGENT_BYPASS } from '../data/program';

export const CarePathway: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className="space-y-4">
    <div className="grid gap-3 md:grid-cols-3">
      {CARE_PATHWAY.map((step, index) => (
        <div key={step.id} className="relative rounded-xl border border-brand-secondary/25 bg-brand-background/40 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary/15 text-xs font-bold text-brand-primary">
              {index + 1}
            </span>
            <p className="text-sm font-semibold text-brand-text-primary">{step.title}</p>
          </div>
          {!compact && <p className="mt-2 text-xs leading-relaxed text-brand-text-secondary">{step.detail}</p>}
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-brand-text-secondary/70">
            {step.owner}
          </p>
        </div>
      ))}
    </div>
    <div className="rounded-xl border border-status-red/35 bg-status-red/10 px-4 py-3 text-sm text-brand-text-secondary">
      <span className="font-semibold text-status-red">Urgent care bypass.</span> {URGENT_BYPASS}
    </div>
  </div>
);
