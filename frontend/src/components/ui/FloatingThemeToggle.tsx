// SOR SENTINEL — Floating Theme Control (Bottom-Left)
import React, { useState, useEffect } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import toast from 'react-hot-toast';

export type AppTheme = 'default' | 'light' | 'dark';

export function FloatingThemeToggle() {
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
      label = 'Default (Cyber Navy)';
    }

    applyTheme(next);
    toast.success(`Theme switched to ${label}`, { id: 'theme-toast', duration: 1500 });
  };

  const getThemeInfo = () => {
    switch (theme) {
      case 'light':
        return {
          icon: <Sun className="w-5 h-5 text-amber-500" />,
          label: 'Theme: Light (Click for Complete Dark)',
        };
      case 'dark':
        return {
          icon: <Moon className="w-5 h-5 text-violet-400" />,
          label: 'Theme: Complete Dark (Click for Default)',
        };
      default:
        return {
          icon: <Laptop className="w-5 h-5 text-cyan-400" />,
          label: 'Theme: Default Cyber Navy (Click for Light)',
        };
    }
  };

  const { icon, label } = getThemeInfo();

  return (
    <div className="fixed bottom-5 left-5 z-50">
      <button
        type="button"
        onClick={cycleTheme}
        aria-label={label}
        title={label}
        className="w-11 h-11 rounded-full bg-[#0f1629]/95 border border-[#1e2d4f] hover:border-cyan-500/50 shadow-xl shadow-black/40 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        {icon}
      </button>
    </div>
  );
}
