// SOR SENTINEL — Card, Badge, Spinner, EmptyState, ErrorState
import React from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-[#131d35] border border-[#1e2d4f] rounded-xl',
        hover && 'hover:border-[#253556] transition-colors duration-200 cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'cyan' | 'violet' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const badgeStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/15 text-emerald-400',
  warning: 'bg-yellow-500/15 text-yellow-400',
  error:   'bg-red-500/15 text-red-400',
  info:    'bg-blue-500/15 text-blue-400',
  cyan:    'bg-cyan-500/15 text-cyan-400',
  violet:  'bg-violet-500/15 text-violet-400',
  neutral: 'bg-white/6 text-[#8fa3bf]',
};

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-outfit font-semibold tracking-wide uppercase',
      badgeStyles[variant],
      className
    )}>
      {children}
    </span>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <Loader2
      className={clsx('animate-spin text-cyan-400', sizes[size], className)}
    />
  );
}

// ── Loading Page ───────────────────────────────────────────────────────────────
export function LoadingPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-[#8fa3bf] text-sm">Loading…</p>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-[#1a2540] flex items-center justify-center mb-4 text-[#4a6180]">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-[#e8edf5] font-semibold mb-2">{title}</h3>
      {description && <p className="text-[#8fa3bf] text-sm max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Error State ───────────────────────────────────────────────────────────────
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6 text-red-400" />
      </div>
      <h3 className="text-[#e8edf5] font-semibold mb-2">{title}</h3>
      <p className="text-[#8fa3bf] text-sm max-w-sm mb-5">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm border border-[#1e2d4f] text-[#8fa3bf] rounded-lg hover:border-cyan-500 hover:text-cyan-400 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  center?: boolean;
}

export function SectionHeader({ title, subtitle, badge, center }: SectionHeaderProps) {
  return (
    <div className={clsx('mb-10', center && 'text-center')}>
      {badge && (
        <span className="inline-flex items-center gap-1.5 text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-3">
          <span className="w-4 h-px bg-cyan-400" />
          {badge}
          <span className="w-4 h-px bg-cyan-400" />
        </span>
      )}
      <h2 className="font-bold text-[#e8edf5] mb-3">{title}</h2>
      {subtitle && <p className="text-[#8fa3bf] max-w-2xl leading-relaxed">{subtitle}</p>}
    </div>
  );
}

// ── Skeleton Loader ───────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />;
}

export { BrandLogo } from './BrandLogo';
export { FloatingThemeToggle } from './FloatingThemeToggle';
export { ThemeSwitcher } from './ThemeSwitcher';

