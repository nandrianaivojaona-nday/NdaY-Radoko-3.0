import React, { useState } from 'react';
import { Facility, UserAccount } from '../types';
import { BrandPartners, EnterpriseLogo } from './Brand';
import { PrototypeBanner, RoleBadge } from './Badges';

interface SignInPageProps {
  users: UserAccount[];
  facilities: Facility[];
  onSignIn: (user: UserAccount) => void;
}

const facilityName = (facilities: Facility[], id: string | null): string =>
  id ? facilities.find((f) => f.id === id)?.name ?? 'Unassigned facility' : 'No facility (programme role)';

const SignInPage: React.FC<SignInPageProps> = ({ users, facilities, onSignIn }) => {
  const [selectedId, setSelectedId] = useState<string>(users[0]?.id ?? '');
  const selected = users.find((u) => u.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-brand-background bg-grid">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10">
        <section>
          <BrandPartners orientation="row" />
          <p className="eyebrow mt-10">FemTech Ventures readiness prototype</p>
          <h1 className="mt-3 max-w-2xl text-balance text-4xl font-bold leading-tight text-brand-text-primary md:text-5xl">
            Bringing physician-supervised young-infant care closer to remote mothers and families.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-brand-text-secondary">
            NdaY'Radoko is developing a locally designed, AI-assisted and drone-enabled outreach service. A trained
            field assistant helps a caregiver collect structured observations; a physician at a participating
            facility reviews the evidence and signs every clinical decision.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ['Evidence first', '“Not assessed” is never treated as normal.'],
              ['Physician authority', 'AI prepares a draft; only a physician signs.'],
              ['Urgent care first', 'Danger signs bypass the AI and the drone.'],
            ].map(([title, detail]) => (
              <div key={title} className="surface-muted p-4">
                <p className="text-sm font-semibold text-brand-text-primary">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-brand-text-secondary">{detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 max-w-2xl">
            <PrototypeBanner />
          </div>

          <div className="mt-8 flex items-center gap-3 text-xs text-brand-text-secondary">
            <EnterpriseLogo size={28} />
            <span>
              A project of NdaY' Enterprise, Madagascar. Application context: UNICEF Femtech Ventures, up to
              US$100,000 and 12 months of mentorship.
            </span>
          </div>
        </section>

        <section className="surface-card p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Demonstration access</p>
              <h2 className="mt-2 text-2xl font-bold text-brand-text-primary">Choose a demo account</h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-text-secondary">
                Roles and facilities are bound to accounts. The physician role can sign decisions; the programme role
                cannot. This gate is a local demonstration, not production authentication.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {users.map((user) => {
              const active = user.id === selectedId;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedId(user.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    active
                      ? 'border-brand-primary bg-brand-primary/10'
                      : 'border-brand-secondary/30 bg-brand-background/40 hover:border-brand-secondary/60'
                  }`}
                  aria-pressed={active}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-brand-text-primary">{user.name}</p>
                    <RoleBadge role={user.role} />
                  </div>
                  <p className="mt-1 text-xs text-brand-text-secondary">{user.title}</p>
                  <p className="mt-1 text-[11px] text-brand-text-secondary/80">
                    {facilityName(facilities, user.facilityId)} · credential: {user.demoCredential}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => selected && onSignIn(selected)}
            disabled={!selected}
            className="btn-primary mt-6 w-full"
          >
            Continue as {selected ? selected.name.split(' ')[0] : 'demo user'}
          </button>

          <p className="mt-4 text-[11px] leading-relaxed text-brand-text-secondary/80">
            No password is requested because no authentication backend exists in this prototype. Do not enter real
            patient information. All records are synthetic and stored only in this browser. A production deployment
            requires authenticated accounts, facility-scoped access, encryption, audit logging, and a data-processing
            agreement.
          </p>
        </section>
      </div>
    </div>
  );
};

export default SignInPage;
