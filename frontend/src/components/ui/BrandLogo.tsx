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
        className="w-full h-full brand-emblem-svg"
        style={{ filter: 'var(--brand-filter-shadow, drop-shadow(0 0 12px rgba(0,212,255,0.55)))' }}
      >
        <defs>
          {/* Circular ambient neon glow halo */}
          <radialGradient id="sl_aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--brand-emblem-aura-start, #00d4ff)" stopOpacity="0.35" />
            <stop offset="50%" stopColor="var(--brand-emblem-aura-mid, #0284c7)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--brand-emblem-aura-mid, #0284c7)" stopOpacity="0" />
          </radialGradient>

          {/* Shield glowing neon outline */}
          <linearGradient id="sl_shield_stroke" x1="50" y1="14" x2="50" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--brand-shield-stroke-1, #7dd3fc)" />
            <stop offset="35%" stopColor="var(--brand-shield-stroke-2, #00d4ff)" />
            <stop offset="100%" stopColor="var(--brand-shield-stroke-3, #0284c7)" />
          </linearGradient>

          {/* Shield dark midnight interior fill */}
          <linearGradient id="sl_shield_fill" x1="50" y1="14" x2="50" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--brand-shield-fill-1, #0a1529)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--brand-shield-fill-2, #040914)" stopOpacity="0.98" />
          </linearGradient>

          {/* Padlock bright cyan fill */}
          <linearGradient id="sl_lock_fill" x1="50" y1="44" x2="50" y2="72" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--brand-lock-fill-1, #67e8f9)" />
            <stop offset="100%" stopColor="var(--brand-lock-fill-2, #38bdf8)" />
          </linearGradient>
        </defs>

        {/* Ambient neon bloom halo */}
        <circle cx="50" cy="50" r="48" fill="url(#sl_aura)" />

        {/* Shield Outer Shell with sleek neon outline */}
        <path
          d="M50 16C37 21.5 22 21.5 20 24C18 46 32 68 50 85C68 68 82 46 80 24C78 21.5 63 21.5 50 16Z"
          fill="url(#sl_shield_fill)"
          stroke="url(#sl_shield_stroke)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner subtle shield contour accent */}
        <path
          d="M50 21C39 25.5 27 25.5 25.5 27.5C24 45 35 63 50 78C65 63 76 45 74.5 27.5C73 25.5 61 25.5 50 21Z"
          stroke="var(--brand-inner-contour, #00d4ff)"
          strokeOpacity="0.25"
          strokeWidth="1"
        />

        {/* Padlock Shackle */}
        <path
          d="M40 46V37C40 31.4772 44.4772 27 50 27C55.5228 27 60 31.4772 60 37V46"
          stroke="var(--brand-lock-shackle, #e0f2fe)"
          strokeWidth="3.6"
          strokeLinecap="round"
        />

        {/* Padlock Solid Body */}
        <rect
          x="34"
          y="44"
          width="32"
          height="25"
          rx="5"
          fill="url(#sl_lock_fill)"
          stroke="var(--brand-lock-stroke, #bae6fd)"
          strokeWidth="1.2"
        />

        {/* Keyhole */}
        <circle cx="50" cy="53" r="2.6" fill="var(--brand-keyhole, #040914)" />
        <path
          d="M48.8 54.2L47.6 62.2H52.4L51.2 54.2H48.8Z"
          fill="var(--brand-keyhole, #040914)"
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
    sm: 'text-[8px] tracking-[0.16em]',
    md: 'text-[9px] tracking-[0.18em]',
    lg: 'text-[10px] tracking-[0.2em]',
    xl: 'text-xs tracking-[0.22em]',
  };

  const content = (
    <div className={clsx('flex items-center justify-between w-full select-none group', className)}>
      {/* Left Brand Identity Cluster: Emblem + Divider + Wordmark */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Approved Shield-and-Lock Emblem */}
        <ShieldLockEmblem className={iconSizes[size]} />

        {/* Vertical Hairline Divider */}
        {showDivider && showWordmark && (
          <div
            className="h-6 w-[1px] shrink-0 mx-0.5"
            style={{ backgroundColor: 'var(--brand-divider, #253556)' }}
          />
        )}

        {showWordmark && (
          <div className="flex flex-col justify-center leading-none min-w-0">
            <div className="flex items-center font-sora leading-snug">
              <span
                className={clsx('font-bold tracking-wide', textSizes[size])}
                style={{ color: 'var(--brand-wordmark-sor, #ffffff)' }}
              >
                SOR
              </span>
              <span
                className={clsx('font-bold ml-1 tracking-wide', textSizes[size])}
                style={{ color: 'var(--brand-wordmark-sentinel, #22d3ee)' }}
              >
                SENTINEL
              </span>
            </div>
            {subtext ? (
              <span
                className={clsx('font-rajdhani font-semibold uppercase mt-0.5', subtextSizes[size])}
                style={{ color: 'var(--brand-wordmark-sentinel, #22d3ee)' }}
              >
                {subtext}
              </span>
            ) : (
              <span
                className={clsx('font-rajdhani font-bold uppercase mt-0.5', subtextSizes[size])}
                style={{ color: 'var(--brand-subtext, #8fa3bf)' }}
              >
                SECURITY INTELLIGENCE
              </span>
            )}
          </div>
        )}
      </div>

      {/* Version Badge matching reference: clean rounded pill, theme-adaptive */}
      {badge && (
        <div
          className="shrink-0 px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium shadow-sm ml-2"
          style={{
            color: 'var(--brand-badge-text, #22d3ee)',
            borderColor: 'var(--brand-badge-border, rgba(34, 211, 238, 0.5))',
            backgroundColor: 'var(--brand-badge-bg, rgba(6, 182, 212, 0.1))',
            borderWidth: '1px',
            borderStyle: 'solid',
          }}
        >
          {badge}
        </div>
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
