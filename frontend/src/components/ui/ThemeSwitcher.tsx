// SOR SENTINEL — Top-Right Header Theme Switcher
import React, { useState, useEffect } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import toast from 'react-hot-toast';

export type AppTheme = 'default' | 'light' | 'dark';

export function ThemeSwitcher({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('sor_theme') as AppTheme) || 'default';
  });

  const applyTheme = (nextTheme: AppTheme) => {
    localStorage.setItem('sor_theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else if (nextTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    setTheme(nextTheme);
  };

  useEffect(() => {
    const saved = (localStorage.getItem('sor_theme') as AppTheme) || 'default';
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  const cycleTheme = () => {
    let next: AppTheme = 'default';
    let label = 'Default (Cyber Navy)';
    if (theme === 'default') {
      next = 'light';
      label = 'Light Mode';
    } else if (theme === 'light') {
      next = 'dark';
      label = 'Complete Dark Mode';
    } else {
      next = 'default';
      label = 'Cyber Navy';
    }

    applyTheme(next);
    toast.success(`Theme switched to ${label}`, { id: 'theme-toast', duration: 1500 });
  };

  const getThemeInfo = () => {
    switch (theme) {
      case 'light':
        return {
          icon: <Sun className="w-3.5 h-3.5 text-amber-400" />,
          label: 'Light',
          tooltip: 'Current: Light Mode. Click to switch to Complete Dark',
        };
      case 'dark':
        return {
          icon: <Moon className="w-3.5 h-3.5 text-violet-400" />,
          label: 'Dark',
          tooltip: 'Current: Complete Dark Mode. Click to switch to Cyber Navy',
        };
      default:
        return {
          icon: <Laptop className="w-3.5 h-3.5 text-cyan-400" />,
          label: 'Theme',
          tooltip: 'Current: Cyber Navy. Click to switch to Light Mode',
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
      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#8fa3bf] hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg border border-[#1e2d4f] hover:border-cyan-500/30 transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${className}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default ThemeSwitcher;
