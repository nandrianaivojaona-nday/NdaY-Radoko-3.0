import React, { useState } from 'react';
import { Country, Facility, ProtocolRecord, Session, UserAccount,  } from '../types';
import { EvidenceBadge, Notice, RoleBadge } from '../components/Badges';
import { formatDate, formatDateTime } from '../utils/format';
import {
  MADAGASCAR_DIGITAL_HEALTH_STRATEGY,
  type PolicyAlignmentStatus,
} from '../data/digitalHealthStrategy';
interface GovernancePageProps {
  countries: Country[];
  facilities: Facility[];
  users: UserAccount[];
  session: Session;
  onApproveProtocol: (protocolId: string) => void;
  onResetData: () => void;
  onExportData: () => void;
}

type Tab = 'protocols' | 'strategy' | 'team' | 'data';
const policyStatusClass = (status: PolicyAlignmentStatus): string => {
  switch (status) {
    case 'Evidence documented':
      return 'bg-brand-mint/15 text-brand-mint';
    case 'Requires Ministry confirmation':
      return 'bg-brand-accent/15 text-brand-accent';
    case 'To assess':
    case 'In design':
      return 'bg-brand-text-secondary/10 text-brand-text-secondary';
  }
};

const GovernancePage: React.FC<GovernancePageProps> = ({
  countries,
  facilities,
  users,
  session,
  onApproveProtocol,
  onResetData,
  onExportData,
}) => {
  const [tab, setTab] = useState<Tab>('protocols');
  const protocols = countries.flatMap((c) => c.protocols.map((p) => ({ ...p, countryName: c.name })));
  const canApprove = session.user.role === 'Physician' || session.user.role === 'Program Admin';

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Clinical governance</p>
        <h1 className="mt-1 text-2xl font-bold text-brand-text-primary md:text-3xl">Protocols, team, facilities and data</h1>
        <p className="mt-1 max-w-3xl text-sm text-brand-text-secondary">
          A physician-supervised service needs visible provenance, approval, access rules, and audit. This page shows the
          demonstration controls and their limits.
        </p>
      </div>

      {tab === 'strategy' && (
        <section className="space-y-4">
          <div className="surface-card p-4">
            <p className="eyebrow">National policy reference</p>

            <h2 className="mt-1 text-base font-bold text-brand-text-primary">
              {MADAGASCAR_DIGITAL_HEALTH_STRATEGY.title}
            </h2>

            <p className="mt-1 text-xs text-brand-text-secondary">
              {MADAGASCAR_DIGITAL_HEALTH_STRATEGY.issuingOrganisation}
              {' · '}
              {MADAGASCAR_DIGITAL_HEALTH_STRATEGY.period}
              {' · '}
              {MADAGASCAR_DIGITAL_HEALTH_STRATEGY.publicationDate}
            </p>

            <p className="mt-2 text-xs leading-relaxed text-brand-text-secondary">
              This register tracks design alignment with the national digital health strategy.
              It does not establish clinical approval or Ministry authorization for this application.
            </p>

            <p className="mt-2 text-[10px] text-brand-text-secondary/80">
              {MADAGASCAR_DIGITAL_HEALTH_STRATEGY.sourceType}
            </p>
          </div>

          <div className="grid gap-3">
            {MADAGASCAR_DIGITAL_HEALTH_STRATEGY.requirements.map((item) => (
              <article key={item.id} className="surface-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-brand-text-primary">
                      {item.theme}
                    </h3>
                    <p className="mt-0.5 text-[10px] text-brand-text-secondary">
                      {item.id} · {item.strategyReference}
                    </p>
                  </div>

                  <span className={`badge ${policyStatusClass(item.status)}`}>
  {item.status}
</span>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-text-secondary">
                      Strategy expectation
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-brand-text-secondary">
                      {item.requirement}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-text-secondary">
                      Application implication
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-brand-text-secondary">
                      {item.appImplication}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-1">
        {(
          [
            ['protocols', 'Protocols'],
            ['strategy', 'Strategy alignment'],
            ['team', 'Team & facilities'],
            ['data', 'Data & safety'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === key
              ? 'bg-brand-primary/20 text-brand-primary'
              : 'text-brand-text-secondary hover:bg-brand-raised'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'protocols' && (
        <div className="space-y-4">
          <Notice tone="warning" title="Approval here is a demonstration control">
            Recording an approver in this local prototype does not constitute clinical approval. A real approval requires
            an authenticated clinical governance process, a named reviewer, a signed document, and version control.
          </Notice>
          {countries.map((country) => (
            <div key={country.id} className="surface-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-brand-text-primary">{country.name}</h2>
                  <p className="text-xs text-brand-text-secondary">{country.role} · {country.localLanguage.toUpperCase()}</p>
                </div>
                <span className={`badge ${country.isImplemented ? 'bg-brand-mint/15 text-brand-mint' : 'bg-brand-text-secondary/10 text-brand-text-secondary'}`}>
                  {country.isImplemented ? 'Pilot context' : 'Exploration only'}
                </span>
              </div>
              {country.protocols.length === 0 ? (
                <p className="mt-3 text-xs text-brand-text-secondary">No protocol imported. This context cannot support a clinical pathway.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {country.protocols.map((protocol) => (
                    <ProtocolCard key={protocol.id} protocol={protocol} canApprove={canApprove} onApprove={() => onApproveProtocol(protocol.id)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'team' && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {users.map((user) => (
              <div key={user.id} className="surface-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-brand-text-primary">{user.name}</p>
                    <p className="text-xs text-brand-text-secondary">{user.title}</p>
                  </div>
                  <RoleBadge role={user.role} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-brand-text-secondary">
                  <p>Facility: {facilities.find((f) => f.id === user.facilityId)?.name ?? 'Programme-wide'}</p>
                  <p>Credential: {user.demoCredential}</p>
                  <p>Registration: {user.professionalRegistration ?? 'Not recorded'}</p>
                  <p>Demo account: {user.isDemo ? 'Yes' : 'No'}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {facilities
              .filter((f) => !f.contactNote?.startsWith('Administrative directory'))
              .map((facility) => (
              <div key={facility.id} className="surface-muted p-4">
                <p className="text-sm font-bold text-brand-text-primary">{facility.name}</p>
                <p className="text-xs text-brand-text-secondary">{facility.level} · {facility.district}</p>
                {facility.contactNote && <p className="mt-1 text-[11px] text-brand-text-secondary/80">{facility.contactNote}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'data' && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="surface-card p-4">
              <h2 className="text-sm font-bold text-brand-text-primary">Current data location</h2>
              <p className="mt-2 text-xs leading-relaxed text-brand-text-secondary">
                Browser-local demonstration store. Data stays on this device and is not shared with a facility. This is
                unsuitable for real patient information.
              </p>
              <ul className="mt-2 space-y-1 text-[11px] text-brand-text-secondary">
                <li>• No authentication backend; the sign-in screen is a demo gate.</li>
                <li>• No encryption at rest beyond the browser profile.</li>
                <li>• No backup, retention, or remote-wipe process.</li>
                <li>• No audit log that survives clearing browser storage.</li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-secondary text-xs" onClick={onExportData}>Export demo JSON</button>
                <button type="button" className="btn-danger text-xs" onClick={onResetData}>Reset demo data</button>
              </div>
            </div>
            <div className="surface-card p-4">
              <h2 className="text-sm font-bold text-brand-text-primary">Requirements before real data</h2>
              <ul className="mt-2 space-y-1.5 text-xs text-brand-text-secondary">
                {[
                  'Authorised shared data service with facility-scoped access.',
                  'Authenticated accounts and role-based permissions.',
                  'Encryption in transit and at rest; key management.',
                  'Consent, retention, deletion, and data-subject request process.',
                  'Incident reporting and breach response.',
                  'Data-processing agreement with the clinical partner.',
                  'Offline policy that does not create unmanaged copies.',
                ].map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          </div>
          <div className="surface-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-brand-text-primary">Safety controls in this prototype</h2>
              <EvidenceBadge status="working" />
            </div>
            <ul className="mt-2 grid gap-1.5 text-xs text-brand-text-secondary md:grid-cols-2">
              <li>• Consent must be recorded before evidence collection.</li>
              <li>• Image capture is a separate choice.</li>
              <li>• “Not assessed” and “unusable” are distinct from normal.</li>
              <li>• Physician signature requires incomplete-evidence acknowledgement.</li>
              <li>• Urgent referral bypasses AI and drone.</li>
              <li>• Evidence fingerprint is stored with the draft and signature.</li>
              <li>• Decision amendments are appended with a reason.</li>
              <li>• Role and facility are bound to the demo account.</li>
            </ul>
          </div>
          <p className="text-[11px] text-brand-text-secondary/70">
            Session started {formatDateTime(session.signedInAt)} · {session.mode} · {session.user.name}
          </p>
        </div>
      )}
    </div>
  );
};

const ProtocolCard: React.FC<{ protocol: ProtocolRecord; canApprove: boolean; onApprove: () => void }> = ({ protocol, canApprove, onApprove }) => (
  <div className="rounded-xl border border-brand-secondary/20 bg-brand-background/40 p-3">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <p className="text-xs font-semibold text-brand-text-primary">{protocol.title}</p>
        <p className="text-[10px] text-brand-text-secondary">{protocol.ageProtocol} · v{protocol.version} · {protocol.id}</p>
      </div>
      <span className={`badge ${protocol.clinicalApproval === 'Approved by clinical lead' ? 'bg-brand-mint/15 text-brand-mint' : protocol.clinicalApproval === 'Retired' ? 'bg-brand-text-secondary/10 text-brand-text-secondary' : 'bg-brand-accent/15 text-brand-accent'}`}>
        {protocol.clinicalApproval}
      </span>
    </div>
    <div className="mt-2 grid gap-1 text-[10px] text-brand-text-secondary md:grid-cols-2">
      <p>Source: {protocol.sourceOrganisation}</p>
      <p>Source title: {protocol.sourceTitle}</p>
      <p>Imported: {formatDate(protocol.importedAt)} by {protocol.importedBy}</p>
      <p>Review due: {formatDate(protocol.reviewDueAt)}</p>
      {protocol.validationEvent && (
        <div className="mt-3 rounded-lg border border-brand-secondary/20 p-3">
          <p className="text-[10px] font-semibold text-brand-text-primary">
            National validation record
          </p>
          <p className="mt-1 text-[10px] text-brand-text-secondary">
            {protocol.validationEvent.status} · Lead: {protocol.validationEvent.leadOrganisation}
          </p>
          <p className="text-[10px] text-brand-text-secondary">
            Funder: {protocol.validationEvent.funder} · Venue: {protocol.validationEvent.venue}
          </p>
          <p className="text-[10px] text-brand-text-secondary">
            Date: {protocol.validationEvent.date ?? 'Not documented'}
          </p>
          <p className="mt-1 text-[10px] text-brand-text-secondary">
            {protocol.validationEvent.evidenceDescription}
          </p>
        </div>
      )}

      {protocol.sources?.map((source) => (
        <div key={source.id} className="mt-2 rounded-lg bg-brand-background/40 p-2">
          <p className="text-[10px] font-semibold text-brand-text-primary">
            {source.role}: {source.title}
          </p>
          <p className="text-[10px] text-brand-text-secondary">
            {source.organisation} · {source.version ?? 'Version unknown'} · {source.verification}
          </p>
          {source.url && (
            <a
              className="break-all text-[10px] text-brand-primary/80 underline"
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              Open source
            </a>
          )}
          <p className="text-[10px] text-brand-text-secondary">{source.notes}</p>
        </div>
      ))}
      {protocol.approvedBy && (
        <p>
          Approved by: {protocol.approvedBy} on {formatDate(protocol.approvedAt)}
        </p>
      )}

      {protocol.demoReview && (
        <p>
          Demo review recorded by {protocol.demoReview.recordedBy} on{' '}
          {formatDate(protocol.demoReview.recordedAt)} — not a clinical approval.
        </p>
      )}
    </div>
    {protocol.sourceUrl && <p className="mt-1 break-all text-[10px] text-brand-primary/80">{protocol.sourceUrl}</p>}
    <p className="mt-1 text-[11px] text-brand-text-secondary">{protocol.notes}</p>
    {canApprove &&
      protocol.clinicalApproval === 'Draft — not reviewed' &&
      !protocol.demoReview && (
        <button
          type="button"
          className="btn-secondary mt-2 px-2 py-1 text-[10px]"
          onClick={onApprove}
        >
          Record simulated review
        </button>
      )}
  </div>
);

export default GovernancePage;
