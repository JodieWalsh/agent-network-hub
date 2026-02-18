/**
 * Date validation utilities.
 *
 * HTML date inputs can accept values like "2026-02-30" which don't correspond
 * to real calendar dates. These helpers catch that by round-tripping through
 * the Date constructor and comparing the result back to the input string.
 *
 * Supports YYYY-MM-DD (HTML date input) and DD/MM/YYYY (Australian text entry).
 */

/**
 * Parse a date string into { year, month, day } regardless of format.
 * Returns null if the format is unrecognised.
 */
function parseDateParts(dateString: string): { year: number; month: number; day: number } | null {
  // YYYY-MM-DD (HTML date input standard)
  const isoMatch = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return { year: Number(isoMatch[1]), month: Number(isoMatch[2]), day: Number(isoMatch[3]) };
  }

  // DD/MM/YYYY (Australian / European format)
  const auMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (auMatch) {
    return { year: Number(auMatch[3]), month: Number(auMatch[2]), day: Number(auMatch[1]) };
  }

  return null;
}

/** Return true when `dateString` represents a real calendar date.
 *  Accepts YYYY-MM-DD and DD/MM/YYYY formats. */
export function isValidDate(dateString: string): boolean {
  if (!dateString) return false;

  const parts = parseDateParts(dateString);
  if (!parts) return false;

  const { year, month, day } = parts;

  // Construct a Date and round-trip check.
  // "2026-02-30" → Date parses to March 2 → getDate() !== 30 → false.
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** Normalise any supported date format to YYYY-MM-DD, or return null if invalid. */
export function normaliseToISO(dateString: string): string | null {
  if (!dateString) return null;
  const parts = parseDateParts(dateString);
  if (!parts) return null;

  const { year, month, day } = parts;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null; // invalid calendar date
  }

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** Return true when `dateString` is a valid date in the future (today excluded). */
export function isDateInFuture(dateString: string): boolean {
  const iso = normaliseToISO(dateString);
  if (!iso) return false;
  const date = new Date(iso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

/** Return true when `dateString` is a valid date that is today or in the future. */
export function isDateTodayOrFuture(dateString: string): boolean {
  const iso = normaliseToISO(dateString);
  if (!iso) return false;
  const date = new Date(iso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}
