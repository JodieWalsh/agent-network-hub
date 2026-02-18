/**
 * Date validation utilities.
 *
 * HTML date inputs can accept values like "2026-02-30" which don't correspond
 * to real calendar dates. These helpers catch that by round-tripping through
 * the Date constructor and comparing the result back to the input string.
 */

/** Return true when `dateString` (YYYY-MM-DD) represents a real calendar date. */
export function isValidDate(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) return false;
  // Round-trip check: "2026-02-30" parses to March 2, so the ISO string won't match.
  const [y, m, d] = dateString.split('-').map(Number);
  return (
    date.getFullYear() === y &&
    date.getMonth() + 1 === m &&
    date.getDate() === d
  );
}

/** Return true when `dateString` is a valid date in the future (today excluded). */
export function isDateInFuture(dateString: string): boolean {
  if (!isValidDate(dateString)) return false;
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

/** Return true when `dateString` is a valid date that is today or in the future. */
export function isDateTodayOrFuture(dateString: string): boolean {
  if (!isValidDate(dateString)) return false;
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}
