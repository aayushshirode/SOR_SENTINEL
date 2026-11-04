// SOR SENTINEL — Timezone-Aware Date & Time Utilities (Asia/Kolkata IST)

/**
 * Normalizes an ISO date string to ensure it is interpreted as UTC
 * if it doesn't already contain a timezone indicator.
 */
export function parseUtcDate(dateInput?: string | Date | null): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;

  const raw = String(dateInput).trim();
  if (!raw) return null;

  // If the date string has no timezone indicator (Z or +/-offset), append 'Z' so it is parsed as UTC
  const hasTimezone = raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw);
  const normalized = hasTimezone ? raw : `${raw}Z`;

  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a timestamp into Indian Standard Time (Asia/Kolkata).
 * e.g. "04 Nov 2026, 06:24:43 pm IST"
 */
export function formatKolkataDateTime(dateInput?: string | Date | null): string {
  const d = parseUtcDate(dateInput);
  if (!d) return '—';

  try {
    const formatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(d);
    return `${formatted} IST`;
  } catch {
    return d.toLocaleString();
  }
}

/**
 * Formats a date only into Indian Standard Time (Asia/Kolkata).
 * e.g. "04 Nov 2026"
 */
export function formatKolkataDate(dateInput?: string | Date | null): string {
  const d = parseUtcDate(dateInput);
  if (!d) return '—';

  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

/**
 * Formats a time only into Indian Standard Time (Asia/Kolkata).
 * e.g. "06:24:43 pm IST"
 */
export function formatKolkataTime(dateInput?: string | Date | null): string {
  const d = parseUtcDate(dateInput);
  if (!d) return '—';

  try {
    const formatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(d);
    return `${formatted} IST`;
  } catch {
    return d.toLocaleTimeString();
  }
}
