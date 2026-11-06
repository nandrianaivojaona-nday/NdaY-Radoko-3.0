import React from 'react';
import { Facility, Session } from '../types';
import { BrandLockup } from './Brand';
import { RoleBadge } from './Badges';

export type Page = 'home' | 'care' | 'workflow' | 'equipment' | 'program' | 'governance';

interface NavbarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  session: Session;
  facilities: Facility[];
  awaitingReviewCount: number;
  onSignOut: () => void;
}

interface NavDefinition {
  page: Page;
  label: string;
  caption: string;
  icon: React.ReactElement;
  roles?: Session['user']['role'][];
  badge?: number;
}

const NavItem: React.FC<{
  item: NavDefinition;
  active: boolean;
  onClick: () => void;
}> = ({ item, active, onClick }) => (
  <li>
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        active
          ? 'bg-brand-primary/15 text-brand-text-primary ring-1 ring-brand-primary/30'
          : 'text-brand-text-secondary hover:bg-brand-raised hover:text-brand-text-primary'
      }`}
    >
      <span className={`${active ? 'text-brand-primary' : 'text-brand-text-secondary group-hover:text-brand-primary'}`}>
        {React.cloneElement(item.icon, { className: 'h-5 w-5' })}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{item.label}</span>
        <span className="block truncate text-[10px] text-brand-text-secondary/80">{item.caption}</span>
      </span>
      {typeof item.badge === 'number' && item.badge > 0 && (
        <span className="rounded-full bg-brand-accent/20 px-2 py-0.5 text-[10px] font-bold text-brand-accent">
          {item.badge}
        </span>
      )}
    </button>
  </li>
);

const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  setCurrentPage,
  session,
  facilities,
  awaitingReviewCount,
  onSignOut,
}) => {
  const { user } = session;
  const facility = facilities.find((f) => f.id === user.facilityId);

  const items: NavDefinition[] = [
    { page: 'home', label: 'Overview', caption: 'Service and evidence status', icon: <HomeIcon /> },
    {
      page: 'care',
      label: 'Care queue',
      caption: 'Encounters and physician review',
      icon: <CareIcon />,
      badge: awaitingReviewCount,
    },
    {
      page: 'workflow',
      label: 'Proposed care workflow',
      caption: 'Madagascar · locality to be selected',
      icon: <WorkflowIcon />,
    },
    { page: 'equipment', label: 'Equipment', caption: 'Outreach readiness', icon: <EquipmentIcon /> },
    { page: 'program', label: 'Programme', caption: 'FemTech readiness and plan', icon: <ProgramIcon /> },
    {
      page: 'governance',
      label: 'Governance',
      caption: 'Protocols, team, data',
      icon: <GovernanceIcon />,
      roles: ['Physician', 'Program Admin'],
    },
  ];

  const allowed = items.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <>
      <div className="lg:hidden">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-brand-secondary/25 bg-brand-background/95 px-4 py-3 backdrop-blur">
        <BrandLockup compact />
        <div className="flex items-center gap-2">
          <RoleBadge role={user.role} />
          <button type="button" onClick={onSignOut} className="btn-ghost px-2 py-1 text-xs">
            Sign out
          </button>
        </div>
        </header>

        <nav className="sticky top-[57px] z-20 flex gap-1 overflow-x-auto border-b border-brand-secondary/25 bg-brand-background/95 px-3 py-2 backdrop-blur">
        {allowed.map((item) => (
          <button
            key={item.page}
            type="button"
            onClick={() => setCurrentPage(item.page)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              currentPage === item.page
                ? 'bg-brand-primary/20 text-brand-primary'
                : 'text-brand-text-secondary hover:bg-brand-raised'
            }`}
          >
            {item.label}
            {typeof item.badge === 'number' && item.badge > 0 ? ` (${item.badge})` : ''}
          </button>
        ))}
        </nav>
      </div>

      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-brand-secondary/25 bg-brand-surface/70 p-4 backdrop-blur lg:flex">
        <div className="px-1 py-2">
          <BrandLockup />
        </div>

        <div className="mt-5 rounded-xl border border-brand-secondary/25 bg-brand-background/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-text-secondary">Signed in</p>
          <p className="mt-1 truncate text-sm font-semibold text-brand-text-primary">{user.name}</p>
          <div className="mt-2">
            <RoleBadge role={user.role} />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-brand-text-secondary">
            {facility?.name ?? 'Programme-wide access'}
          </p>
        </div>

        <ul className="mt-6 space-y-1.5">
          {allowed.map((item) => (
            <NavItem
              key={item.page}
              item={item}
              active={currentPage === item.page}
              onClick={() => setCurrentPage(item.page)}
            />
          ))}
        </ul>

        <div className="mt-auto space-y-3 pt-6">
          <div className="rounded-xl border border-brand-secondary/25 bg-brand-background/40 p-3 text-[11px] leading-relaxed text-brand-text-secondary">
            <p className="font-semibold text-brand-text-primary">Local demonstration store</p>
            <p className="mt-1">
              Synthetic data only, saved in this browser. Not a health record system. Do not enter real patient
              information.
            </p>
          </div>
          <button type="button" onClick={onSignOut} className="btn-secondary w-full text-xs">
            Sign out
          </button>
          <p className="text-center text-[10px] text-brand-text-secondary/70">
            NdaY'Radoko · Prototype v0.3 · Not a medical device
          </p>
        </div>
      </aside>
    </>
  );
};

const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10.5 12 3l9 7.5M5.25 9.75V20.25h13.5V9.75M9.75 20.25v-6h4.5v6" />
  </svg>
);
const CareIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 20.25s-7.5-4.35-7.5-10.125A4.125 4.125 0 0 1 12 7.5a4.125 4.125 0 0 1 7.5 2.625C19.5 15.9 12 20.25 12 20.25Z" />
  </svg>
);
const WorkflowIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.5 6.75h6a2.25 2.25 0 0 1 2.25 2.25v6a2.25 2.25 0 0 0 2.25 2.25h4.5M4.5 6.75V5.25A1.5 1.5 0 0 1 6 3.75h3m-4.5 3v4.5m0-4.5h6M15 15h-3.75a1.5 1.5 0 0 1-1.5-1.5V9m9.75 5.25h-2.25m2.25 0V18a1.5 1.5 0 0 1-1.5 1.5h-6" />
  </svg>
);
const EquipmentIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.5 8.25h3l1.5-2.25h6l1.5 2.25h3a1.5 1.5 0 0 1 1.5 1.5v8.25a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V9.75a1.5 1.5 0 0 1 1.5-1.5Z" />
    <circle cx="12" cy="13.5" r="3" strokeWidth={1.8} />
  </svg>
);
const ProgramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7.5 3.75h9A2.25 2.25 0 0 1 18.75 6v14.25L12 16.5l-6.75 3.75V6A2.25 2.25 0 0 1 7.5 3.75Z" />
  </svg>
);
const GovernanceIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3 4.5 6v5.25c0 4.5 3.15 7.65 7.5 9.75 4.35-2.1 7.5-5.25 7.5-9.75V6L12 3Z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m9 12 2.25 2.25L15.75 9.75" />
  </svg>
);

export default Navbar;
