// SOR SENTINEL — Top-Right Header Theme Switcher
import React from 'react';
import { Laptop, Sparkles, Sun } from 'lucide-react';
import { useTheme, AppTheme } from '@/utils/theme';

export type { AppTheme };

export function ThemeSwitcher({ className = '' }: { className?: string }) {
  const { theme, cycleTheme } = useTheme();

  const getThemeInfo = () => {
    switch (theme) {
      case 'midnight':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-cyan-400" />,
          label: 'Midnight',
          tooltip: 'Current: Midnight Enterprise. Click to switch to Peachy White Mode',
        };
      case 'peachy':
        return {
          icon: <Sun className="w-3.5 h-3.5 text-[#E89578]" />,
          label: 'Peachy White',
          tooltip: 'Current: Peachy White Mode. Click to switch to Cyber Navy',
        };
      case 'default':
      default:
        return {
          icon: <Laptop className="w-3.5 h-3.5 text-cyan-400" />,
          label: 'Cyber Navy',
          tooltip: 'Current: Default Cyber Navy. Click to switch to Midnight Enterprise',
        };
    }
  };

  const { icon, label, tooltip } = getThemeInfo();

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={tooltip}
      title={tooltip}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#8fa3bf] hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg border border-[#1e2d4f] hover:border-cyan-500/30 transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 font-outfit ${className}`}
    >
      {icon}
      <span className="hidden sm:inline font-medium">{label}</span>
    </button>
  );
}

export default ThemeSwitcher;
