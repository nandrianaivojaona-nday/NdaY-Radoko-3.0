import React from 'react';

const RADOKO_LOGO = `${import.meta.env.BASE_URL}assets/images/nday-radoko-logo.png`;
const ENTERPRISE_LOGO = `${import.meta.env.BASE_URL}assets/images/nday-enterprise-logo.png`;
const RADOKO_ICON = `${import.meta.env.BASE_URL}assets/images/nday-radoko-icon.png`;

// Inline SVG fallbacks used when the PNG asset is missing (403/404).
const RADOKO_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
    '<rect width="200" height="200" rx="24" fill="#2563EB"/>' +
    '<text x="100" y="130" font-family="Helvetica,Arial,sans-serif" font-size="72" font-weight="bold" text-anchor="middle" fill="white">NR</text>' +
    '</svg>'
  );
const ENTERPRISE_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
    '<rect width="200" height="200" rx="20" fill="#1D4ED8"/>' +
    '<text x="100" y="126" font-family="Helvetica,Arial,sans-serif" font-size="64" font-weight="bold" text-anchor="middle" fill="white">NE</text>' +
    '</svg>'
  );


export const RadokoLogo: React.FC<{ size?: number; className?: string; iconOnly?: boolean }> = ({
  size = 48,
  className = '',
  iconOnly = false,
}) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5 ${className}`}
    style={{ width: size, height: size }}
  >
    <img
      src={iconOnly ? RADOKO_ICON : RADOKO_LOGO}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = RADOKO_FALLBACK; }}
      alt="NdaY'Radoko project logo"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="h-full w-full rounded-xl object-cover"
    />
  </span>
);

export const EnterpriseLogo: React.FC<{ size?: number; className?: string }> = ({ size = 40, className = '' }) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5 ${className}`}
    style={{ width: size, height: size }}
  >
    <img
      src={ENTERPRISE_LOGO}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = ENTERPRISE_FALLBACK; }}
      alt="NdaY' Enterprise logo"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="h-full w-full rounded-lg object-cover"
    />
  </span>
);

export const BrandLockup: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className="flex items-center gap-3">
    <RadokoLogo size={compact ? 40 : 46} />
    <div className="min-w-0">
      <p className="truncate text-base font-bold leading-tight text-brand-text-primary">
        NdaY'<span className="text-brand-primary">Radoko</span>
      </p>
      {!compact && (
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-text-secondary">
          A NdaY' Enterprise project
        </p>
      )}
    </div>
  </div>
);

/**
 * Partner lockup used on the landing page and in reports. The project mark leads;
 * the enterprise mark identifies the organisation responsible for it.
 */
export const BrandPartners: React.FC<{ orientation?: 'row' | 'stack' }> = ({ orientation = 'row' }) => (
  <div
    className={`flex ${orientation === 'row' ? 'flex-wrap items-center gap-5' : 'flex-col gap-4'}`}
    aria-label="NdaY'Radoko, a project of NdaY' Enterprise"
  >
    <div className="flex items-center gap-3">
      <RadokoLogo size={64} />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-text-secondary">Project</p>
        <p className="text-lg font-bold leading-tight text-brand-text-primary">
          NdaY'<span className="text-brand-primary">Radoko</span>
        </p>
        <p className="text-xs text-brand-text-secondary">Physician-supervised young-infant outreach</p>
      </div>
    </div>
    <div className={`${orientation === 'row' ? 'h-12 w-px bg-brand-secondary/40' : 'h-px w-24 bg-brand-secondary/40'}`} />
    <div className="flex items-center gap-3">
      <EnterpriseLogo size={52} />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-text-secondary">Built by</p>
        <p className="text-base font-bold leading-tight text-brand-text-primary">NdaY' Enterprise</p>
        <p className="text-xs text-brand-text-secondary">Local technology and service design</p>
      </div>
    </div>
  </div>
);

export const BrandFooter: React.FC<{ onOpenProgram?: () => void; onOpenSafety?: () => void }> = ({
  onOpenProgram,
  onOpenSafety,
}) => (
  <footer className="mt-12 border-t border-brand-secondary/20 pt-6 text-xs text-brand-text-secondary">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <RadokoLogo size={32} iconOnly />
        <EnterpriseLogo size={28} />
        <p>
          <span className="font-semibold text-brand-text-primary">NdaY'Radoko</span> is a project of{' '}
          <span className="font-semibold text-brand-text-primary">NdaY' Enterprise</span>. Madagascar.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {onOpenProgram && (
          <button type="button" onClick={onOpenProgram} className="hover:text-brand-primary">
            Programme &amp; evidence
          </button>
        )}
        {onOpenSafety && (
          <button type="button" onClick={onOpenSafety} className="hover:text-brand-primary">
            Safety &amp; privacy
          </button>
        )}
        <span className="rounded-full border border-brand-secondary/40 px-2 py-1 font-semibold">
          Prototype — not a medical device
        </span>
      </div>
    </div>
  </footer>
);
