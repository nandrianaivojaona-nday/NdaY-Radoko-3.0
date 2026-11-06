import React from 'react';
import { DroneStatus, EncounterStatus, EvidenceClass, EVIDENCE_LABELS, ObservationQuality, UserRole } from '../types';

const evidenceStyles: Record<EvidenceClass, string> = {
  working: 'bg-brand-mint/15 text-brand-mint border border-brand-mint/30',
  simulated: 'bg-brand-accent/15 text-brand-accent border border-brand-accent/30',
  planned: 'bg-brand-text-secondary/10 text-brand-text-secondary border border-brand-text-secondary/25',
};

export const EvidenceBadge: React.FC<{ status: EvidenceClass; className?: string; label?: string }> = ({
  status,
  className = '',
  label,
}) => (
  <span
    className={`badge ${evidenceStyles[status]} ${className}`}
    title={EVIDENCE_LABELS[status]}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {label ?? EVIDENCE_LABELS[status]}
  </span>
);

const encounterStyles: Record<EncounterStatus, string> = {
  'Assessment initiated': 'bg-status-gray/15 text-status-gray',
  'Evidence collected': 'bg-status-blue/15 text-status-blue',
  'AI draft ready': 'bg-brand-accent/15 text-brand-accent',
  'Awaiting physician review': 'bg-brand-accent/20 text-brand-accent',
  'More information requested': 'bg-status-yellow/15 text-status-yellow',
  'Decision signed': 'bg-brand-mint/15 text-brand-mint',
  'Follow-up scheduled': 'bg-brand-primary/15 text-brand-primary',
  'Referral in progress': 'bg-status-red/15 text-status-red',
  Closed: 'bg-brand-text-secondary/15 text-brand-text-secondary',
};

export const EncounterStatusBadge: React.FC<{ status: EncounterStatus; className?: string }> = ({
  status,
  className = '',
}) => (
  <span className={`badge ${encounterStyles[status]} ${className}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {status}
  </span>
);

const droneStyles: Record<DroneStatus, string> = {
  [DroneStatus.Registered]: 'bg-status-gray/15 text-status-gray',
  [DroneStatus.Configuring]: 'bg-status-blue/15 text-status-blue',
  [DroneStatus.ReadyForTrial]: 'bg-brand-accent/15 text-brand-accent',
  [DroneStatus.InFieldTrial]: 'bg-brand-primary/15 text-brand-primary',
  [DroneStatus.Maintenance]: 'bg-status-red/15 text-status-red',
  [DroneStatus.Retired]: 'bg-brand-text-secondary/15 text-brand-text-secondary',
};

export const DroneStatusBadge: React.FC<{ status: DroneStatus }> = ({ status }) => (
  <span className={`badge ${droneStyles[status]}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {status}
  </span>
);

export const QualityBadge: React.FC<{ quality: ObservationQuality }> = ({ quality }) => {
  const styles: Record<ObservationQuality, string> = {
    'Not assessed': 'bg-brand-text-secondary/10 text-brand-text-secondary',
    'Reported — unverified': 'bg-status-yellow/15 text-status-yellow',
    'Measured — device': 'bg-brand-mint/15 text-brand-mint',
    'Observed — remote': 'bg-brand-primary/15 text-brand-primary',
    'Observed — in person': 'bg-brand-mint/15 text-brand-mint',
    Unusable: 'bg-status-red/15 text-status-red',
    Unavailable: 'bg-status-yellow/15 text-status-yellow',
  };
  return <span className={`badge ${styles[quality]}`}>{quality}</span>;
};

const roleStyles: Record<UserRole, string> = {
  Physician: 'bg-brand-mint/15 text-brand-mint',
  'Field Officer': 'bg-brand-primary/15 text-brand-primary',
  'Program Admin': 'bg-brand-accent/15 text-brand-accent',
};

export const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => (
  <span className={`badge ${roleStyles[role]}`}>{role}</span>
);

export const Notice: React.FC<{
  tone?: 'info' | 'warning' | 'critical' | 'success';
  title?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'info', title, children, className = '' }) => {
  const tones = {
    info: 'border-brand-primary/30 bg-brand-primary/10 text-brand-text-secondary',
    warning: 'border-brand-accent/40 bg-brand-accent/10 text-brand-text-secondary',
    critical: 'border-status-red/40 bg-status-red/10 text-brand-text-secondary',
    success: 'border-brand-mint/30 bg-brand-mint/10 text-brand-text-secondary',
  };
  const icons = { info: 'i', warning: '!', critical: '!', success: '✓' };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]} ${className}`}>
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[11px] font-bold">
          {icons[tone]}
        </span>
        <div>
          {title && <p className="mb-1 font-semibold text-brand-text-primary">{title}</p>}
          <div className="leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
};

export const PrototypeBanner: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-accent/30 bg-brand-accent/10 px-3 py-2 text-xs text-brand-text-secondary">
    <span className="badge border border-brand-accent/40 bg-brand-accent/15 text-brand-accent">Prototype</span>
    <span>
      Functioning software demonstration with synthetic data. Not clinically validated, not a medical device, and
      not connected to a real drone or health record system.
    </span>
    {!compact && <span className="font-semibold text-brand-text-primary">Simulated parts are labelled throughout.</span>}
  </div>
);
