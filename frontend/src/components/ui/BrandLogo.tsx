// SOR SENTINEL — Professional Cybersecurity Brand Logo & Shield-and-Lock Emblem
import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  linkTo?: string;
  subtext?: string;
  showDivider?: boolean;
  badge?: string;
}

export function ShieldLockEmblem({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <div className={clsx('relative flex items-center justify-center shrink-0', className)}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_10px_rgba(0,212,255,0.45)]"
      >
        <defs>
          {/* Subtle outer neon ring glow */}
          <radialGradient id="sl_aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.25" />
            <stop offset="65%" stopColor="#00d4ff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
          </radialGradient>
          {/* Shield gradient outline */}
          <linearGradient id="sl_shield_stroke" x1="20" y1="12" x2="80" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="40%" stopColor="#00d4ff" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          {/* Shield inner fill gradient */}
          <linearGradient id="sl_shield_fill" x1="50" y1="10" x2="50" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0a192f" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#050b14" stopOpacity="0.95" />
          </linearGradient>
          {/* Lock fill gradient */}
          <linearGradient id="sl_lock_fill" x1="50" y1="42" x2="50" y2="76" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>

        {/* Outer ambient glow circles matching reference design */}
        <circle cx="50" cy="50" r="46" fill="url(#sl_aura)" />
        <circle cx="50" cy="50" r="44" stroke="#00d4ff" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="50" cy="50" r="39" stroke="#00d4ff" strokeOpacity="0.12" strokeWidth="0.8" />

        {/* Outer Shield Shell */}
        <path
          d="M50 14C33 19 23 20.5 23 37C23 57 38 72 50 82C62 72 77 57 77 37C77 20.5 67 19 50 14Z"
          fill="url(#sl_shield_fill)"
          stroke="url(#sl_shield_stroke)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner Shield Accent Contour */}
        <path
          d="M50 20C37.5 24.2 29 25.5 29 38.5C29 53.5 40.5 65.5 50 73.5C59.5 65.5 71 53.5 71 38.5C71 25.5 62.5 24.2 50 20Z"
          stroke="#00d4ff"
          strokeOpacity="0.28"
          strokeWidth="1.2"
        />

        {/* Padlock Shackle */}
        <path
          d="M41 47V39C41 34.0294 45.0294 30 50 30C54.9706 30 59 34.0294 59 39V47"
          stroke="#e0f2fe"
          strokeWidth="3.6"
          strokeLinecap="round"
        />

        {/* Padlock Body */}
        <rect
          x="36"
          y="45"
          width="28"
          height="23"
          rx="5"
          fill="url(#sl_lock_fill)"
          stroke="#bae6fd"
          strokeWidth="1.8"
        />

        {/* Padlock Keyhole */}
        <circle cx="50" cy="53.5" r="2.6" fill="#061220" />
        <path
          d="M48.7 54.5L47.5 61.5H52.5L51.3 54.5H48.7Z"
          fill="#061220"
        />
      </svg>
    </div>
  );
}

export function BrandLogo({
  className,
  size = 'md',
  showWordmark = true,
  linkTo = '/',
  subtext,
  showDivider = false,
  badge,
}: BrandLogoProps) {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  const subtextSizes = {
    sm: 'text-[8px] tracking-[0.14em]',
    md: 'text-[9px] tracking-[0.16em]',
    lg: 'text-[10px] tracking-[0.18em]',
    xl: 'text-xs tracking-[0.2em]',
  };

  const content = (
    <div className={clsx('flex items-center gap-2.5 select-none group', className)}>
      {/* Approved Shield-and-Lock Emblem */}
      <ShieldLockEmblem className={iconSizes[size]} />

      {/* Optional Vertical Divider */}
      {showDivider && showWordmark && (
        <div className="h-7 w-[1px] bg-[#1e2d4f] shrink-0" />
      )}

      {showWordmark && (
        <div className="flex flex-col leading-tight min-w-0">
          <div className="flex items-center tracking-wider font-sora">
            <span className={clsx('font-extrabold text-[#ffffff]', textSizes[size])}>
              SOR
            </span>
            <span className={clsx('font-extrabold text-cyan-400 ml-1', textSizes[size])}>
              SENTINEL
            </span>
          </div>
          {subtext ? (
            <span className={clsx('font-rajdhani font-semibold tracking-[0.14em] uppercase text-cyan-400/80', subtextSizes[size])}>
              {subtext}
            </span>
          ) : (
            <span className={clsx('font-rajdhani font-semibold tracking-[0.16em] uppercase text-[#8fa3bf]', subtextSizes[size])}>
              SECURITY INTELLIGENCE
            </span>
          )}
        </div>
      )}

      {/* Optional Version Badge */}
      {badge && (
        <span className="ml-auto shrink-0 px-2 py-0.5 rounded text-[10px] font-outfit font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
          {badge}
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className={clsx(
          'inline-flex items-center focus:outline-none',
          className?.includes('w-full') && 'w-full'
        )}
      >
        {content}
      </Link>
    );
  }

  return content;
}
