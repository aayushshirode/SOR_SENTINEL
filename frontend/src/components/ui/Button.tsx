// SOR SENTINEL — Reusable Button Component
import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const styles = {
  base: 'inline-flex items-center justify-center gap-2 font-outfit font-semibold tracking-wide rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f1a] disabled:opacity-50 disabled:cursor-not-allowed select-none',
  variant: {
    primary: 'bg-cyan-500 text-[#0a0f1a] hover:bg-cyan-400 active:bg-cyan-600 shadow-lg shadow-cyan-500/20',
    secondary: 'bg-violet-600 text-white hover:bg-violet-500 active:bg-violet-700',
    outline: 'border border-[#1e2d4f] text-[#e8edf5] hover:border-cyan-500 hover:text-cyan-400 bg-transparent',
    ghost: 'text-[#8fa3bf] hover:text-[#e8edf5] hover:bg-white/5 bg-transparent',
    danger: 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700',
  },
  size: {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-base',
  },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(styles.base, styles.variant[variant], styles.size[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
