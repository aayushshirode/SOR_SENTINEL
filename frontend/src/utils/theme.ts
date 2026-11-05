// SOR SENTINEL — Centralized Theme Management System
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export type AppTheme = 'default' | 'midnight' | 'peachy';

export const THEME_STORAGE_KEY = 'sor_theme';
export const THEME_EVENT = 'sor-theme-change';

/**
 * Safely retrieve currently stored theme with backward-compatible migration.
 * Legacy 'light' and 'dark' theme users are migrated to 'peachy' (Peachy White Mode).
 */
export function getStoredTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      localStorage.setItem(THEME_STORAGE_KEY, 'peachy');
      return 'peachy';
    }
    if (saved === 'midnight' || saved === 'peachy') {
      return saved;
    }
  } catch {
    // localStorage unavailable or restricted
  }
  return 'default';
}

/**
 * Apply theme to document element and persist to localStorage
 */
export function applyAppTheme(theme: AppTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}

  if (theme === 'midnight') {
    document.documentElement.setAttribute('data-theme', 'midnight');
  } else if (theme === 'peachy') {
    document.documentElement.setAttribute('data-theme', 'peachy');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

/**
 * Strict 3-theme cycling order:
 * 1. Default Cyber Navy ('default')
 * 2. Midnight Enterprise ('midnight')
 * 3. Peachy White Mode ('peachy')
 */
export function getNextTheme(current: AppTheme): { next: AppTheme; label: string } {
  switch (current) {
    case 'default':
      return { next: 'midnight', label: 'Midnight Enterprise' };
    case 'midnight':
      return { next: 'peachy', label: 'Peachy White Mode' };
    case 'peachy':
    default:
      return { next: 'default', label: 'Default (Cyber Navy)' };
  }
}

/**
 * Custom React hook for unified theme control across the entire application
 */
export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>(getStoredTheme);

  useEffect(() => {
    // Ensure initial theme attribute matches stored theme
    const initial = getStoredTheme();
    if (initial === 'midnight') {
      document.documentElement.setAttribute('data-theme', 'midnight');
    } else if (initial === 'peachy') {
      document.documentElement.setAttribute('data-theme', 'peachy');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    const handleThemeEvent = (e: Event) => {
      const customEvent = e as CustomEvent<AppTheme>;
      if (customEvent.detail) {
        setThemeState(customEvent.detail);
      } else {
        setThemeState(getStoredTheme());
      }
    };

    window.addEventListener(THEME_EVENT, handleThemeEvent);
    window.addEventListener('storage', handleThemeEvent);

    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeEvent);
      window.removeEventListener('storage', handleThemeEvent);
    };
  }, []);

  const setTheme = (nextTheme: AppTheme) => {
    applyAppTheme(nextTheme);
    setThemeState(nextTheme);
  };

  const cycleTheme = () => {
    const { next, label } = getNextTheme(theme);
    setTheme(next);
    toast.success(`Theme switched to ${label}`, { id: 'theme-toast', duration: 1500 });
  };

  return { theme, setTheme, cycleTheme };
}
