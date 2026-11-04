// SOR SENTINEL — Form Input Component
import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightElement,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[#e8edf5] font-plex"
        >
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6180]">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={clsx(
            'w-full bg-[#0f1629] border rounded-lg px-4 py-2.5 text-sm text-[#e8edf5] font-plex',
            'placeholder:text-[#4a6180]',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500',
            leftIcon && 'pl-10',
            rightElement && 'pr-10',
            error
              ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
              : 'border-[#1e2d4f] hover:border-[#253556]',
            className
          )}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-400 flex items-center gap-1 font-plex">⚠ {error}</p>}
      {hint && !error && <p className="text-xs text-[#4a6180] font-plex">{hint}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  charCount?: number;
  maxChars?: number;
}

export function Textarea({
  label, error, hint, charCount, maxChars, className, id, ...props
}: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={inputId} className="text-sm font-medium text-[#e8edf5] font-plex">
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          {maxChars !== undefined && charCount !== undefined && (
            <span className={clsx(
              'text-xs font-rajdhani font-bold',
              charCount > maxChars * 0.9 ? 'text-yellow-400' : 'text-[#4a6180]'
            )}>
              {charCount.toLocaleString()} / {maxChars.toLocaleString()}
            </span>
          )}
        </div>
      )}
      <textarea
        id={inputId}
        className={clsx(
          'w-full bg-[#0f1629] border rounded-lg px-4 py-3 text-sm text-[#e8edf5] font-plex',
          'placeholder:text-[#4a6180] resize-vertical min-h-[120px]',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500',
          error
            ? 'border-red-500/60 focus:border-red-500'
            : 'border-[#1e2d4f] hover:border-[#253556]',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400 font-plex">⚠ {error}</p>}
      {hint && !error && <p className="text-xs text-[#4a6180] font-plex">{hint}</p>}
    </div>
  );
}
