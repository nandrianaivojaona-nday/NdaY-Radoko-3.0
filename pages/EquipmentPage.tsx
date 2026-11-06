import React, { useState } from 'react';
import { Country, Drone, DroneStatus, ReadinessCheck, Session } from '../types';
import { DroneStatusBadge, EvidenceBadge, Notice } from '../components/Badges';
import { formatDateTime } from '../utils/format';

interface EquipmentPageProps {
  drones: Drone[];
  countries: Country[];
  session: Session;
  onRecordCheck: (droneId: string, checkId: string) => void;
}

const statusTone = (status: ReadinessCheck['status']): string => {
  switch (status) {
    case 'Passed':
      return 'bg-brand-mint/15 text-brand-mint';
    case 'Simulated pass':
      return 'bg-brand-accent/15 text-brand-accent';
    case 'Failed':
      return 'bg-status-red/15 text-status-red';
    default:
      return 'bg-brand-text-secondary/10 text-brand-text-secondary';
  }
};

const EquipmentPage: React.FC<EquipmentPageProps> = ({ drones, countries, session, onRecordCheck }) => {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const canRecord = session.user.role !== 'Physician';

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Equipment and operations</p>
        <h1 className="mt-1 text-2xl font-bold text-brand-text-primary md:text-3xl">Outreach equipment readiness</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-brand-text-secondary">
          The drone is one possible component of the service, not the proof of innovation. No aircraft is operated by
          this repository. Readiness records show what has been checked, what is only a bench demonstration, and what
          remains untested.
        </p>
      </div>

      <Notice tone="critical" title="No flight has been conducted">
        These are demonstration records. The readiness table does not establish airworthiness, flight safety, payload
        performance, or clinical suitability. Those require an actual aircraft, qualified operators, measured tests,
        and civil-aviation approval.
      </Notice>

      <div className="grid gap-4 lg:grid-cols-3">
        {drones.map((drone) => {
          const tested = drone.readiness.filter((r) => r.status === 'Passed').length;
          const simulated = drone.readiness.filter((r) => r.status === 'Simulated pass').length;
          return (
            <div key={drone.id} className="surface-card overflow-hidden">
              <div className="border-b border-brand-secondary/25 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-brand-primary">{drone.id}</p>
                    <h2 className="text-lg font-bold text-brand-text-primary">{drone.name}</h2>
                    <p className="text-xs text-brand-text-secondary">{drone.role}</p>
                  </div>
                  <DroneStatusBadge status={drone.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-brand-text-secondary">
                  <p>Model: {drone.model}</p>
                  <p>Serial: {drone.serialNumber}</p>
                  <p>Last flight: {drone.lastFlightAt ? formatDateTime(drone.lastFlightAt) : 'None recorded'}</p>
                  <p>Flight hours: {drone.flightHours ?? 'Not measured'}</p>
                </div>
              </div>

              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-brand-text-secondary">Real evidence</span>
                  <span className="font-semibold text-brand-text-primary">{tested}/{drone.readiness.length}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-brand-text-secondary">Simulated checks</span>
                  <span className="font-semibold text-brand-accent">{simulated}</span>
                </div>

                <ul className="mt-2 space-y-2">
                  {drone.readiness.map((check) => (
                    <li key={check.id} className="rounded-lg border border-brand-secondary/20 bg-brand-background/40 p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-brand-text-primary">{check.label}</p>
                        <span className={`badge text-[10px] ${statusTone(check.status)}`}>{check.status}</span>
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-brand-text-secondary">{check.evidence}</p>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-1">
                        <span className="text-[10px] text-brand-text-secondary/70">
                          {check.checkedAt ? `${formatDateTime(check.checkedAt)} · ${check.checkedBy}` : 'Not checked'}
                        </span>
                        <EvidenceBadge status={check.evidenceClass} className="text-[9px]" />
                      </div>
                      {canRecord && check.status === 'Not tested' && (
                        <button
                          type="button"
                          className="btn-ghost mt-1 px-0 py-0 text-[10px] text-brand-primary"
                          onClick={() => onRecordCheck(drone.id, check.id)}
                        >
                          Record demonstration check →
                        </button>
                      )}
                    </li>
                  ))}
                </ul>

                {drone.notes && <p className="mt-2 text-[10px] leading-relaxed text-brand-text-secondary/80">{drone.notes}</p>}

                <button
                  type="button"
                  className="btn-ghost w-full px-0 text-[11px]"
                  onClick={() => setExpandedLog(expandedLog === drone.id ? null : drone.id)}
                >
                  {expandedLog === drone.id ? 'Hide activity log' : `Activity log (${drone.activityLog.length})`}
                </button>
                {expandedLog === drone.id && (
                  <ul className="space-y-1.5">
                    {drone.activityLog.map((entry, index) => (
                      <li key={`${entry.timestamp}-${index}`} className="rounded bg-brand-background/50 p-2 text-[10px]">
                        <p className="font-semibold text-brand-text-primary">{entry.event}</p>
                        <p className="text-brand-text-secondary">{formatDateTime(entry.timestamp)}</p>
                        {entry.details && <p className="text-brand-text-secondary/80">{entry.details}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <p className="eyebrow">Decision gate</p>
          <h2 className="mt-1 text-lg font-bold text-brand-text-primary">What must be true before a drone is added</h2>
          <ul className="mt-3 space-y-2 text-xs text-brand-text-secondary">
            {[
              'A documented operational problem that community teleconsultation and outreach visits cannot solve as well.',
              'A measured link budget, endurance, and return-to-home behaviour in local conditions.',
              'Independent airworthiness review and civil-aviation approval.',
              'A payload that improves the reliability of a required observation, not just novelty.',
              'A cost per completed encounter that is defensible against the alternatives.',
              'An incident-reporting and maintenance process that operates in practice.',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-0.5 text-brand-primary">□</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] font-semibold text-status-red">Status: not met. The drone remains an unproven component.</p>
        </div>

        <div className="surface-card p-5">
          <p className="eyebrow">Comparator analysis</p>
          <h2 className="mt-1 text-lg font-bold text-brand-text-primary">What the drone would need to change</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-brand-text-secondary">
                <tr>
                  <th className="py-2 pr-2 font-semibold">Alternative</th>
                  <th className="py-2 pr-2 font-semibold">Cost</th>
                  <th className="py-2 pr-2 font-semibold">Reach</th>
                  <th className="py-2 font-semibold">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-secondary/20 text-brand-text-secondary">
                <tr><td className="py-2 pr-2">Community teleconsultation</td><td className="py-2 pr-2">Lower</td><td className="py-2 pr-2">Where connectivity exists</td><td className="py-2">Comparator in pilot</td></tr>
                <tr><td className="py-2 pr-2">Existing outreach visit</td><td className="py-2 pr-2">Moderate</td><td className="py-2 pr-2">Scheduled</td><td className="py-2">Comparator in pilot</td></tr>
                <tr><td className="py-2 pr-2">Household travel</td><td className="py-2 pr-2">High for family</td><td className="py-2 pr-2">Depends on transport</td><td className="py-2">Baseline burden</td></tr>
                <tr><td className="py-2 pr-2">Drone-assisted outreach</td><td className="py-2 pr-2">Unknown</td><td className="py-2 pr-2">Unproven</td><td className="py-2 text-brand-accent">Must be measured</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-brand-text-secondary">
            The clinical pathway must remain usable when a flight is not possible. The prototype already supports
            community teleconsultation and facility-visit modes without a drone.
          </p>
        </div>
      </section>

      <Notice tone="info" title="Country contexts">
        {countries.filter((c) => c.isImplemented).map((c) => c.name).join(', ') || 'No pilot country'} is the only
        configured pilot context. Other countries are exploration contexts and contain no approved protocol.
      </Notice>
    </div>
  );
};

export { DroneStatus };
export default EquipmentPage;
