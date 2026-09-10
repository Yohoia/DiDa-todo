/**
 * Date utilities for relative date calculations
 * Uses 2026-09-09 as the demo anchor date
 */

export const DEMO_ANCHOR = "2026-09-09";

/**
 * Get relative date offset from the demo anchor
 * @param offset Number of days from anchor (0 = today, 1 = tomorrow, -1 = yesterday)
 */
export function getDemoDate(offset: number): string {
  const anchor = new Date(`${DEMO_ANCHOR}T12:00:00+08:00`);
  const result = new Date(anchor);
  result.setDate(result.getDate() + offset);
  return result.toISOString().split("T")[0];
}

/**
 * Get offset days from demo anchor
 * @param date Date string in YYYY-MM-DD format
 * @returns Number of days from anchor (0 = anchor day, negative = past, positive = future)
 */
export function getDaysFromAnchor(date: string): number {
  const anchor = new Date(`${DEMO_ANCHOR}T12:00:00+08:00`);
  const target = new Date(`${date}T12:00:00+08:00`);
  const diffMs = target.getTime() - anchor.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if date is the demo "today"
 */
export function isDemoToday(date: string): boolean {
  return date === DEMO_ANCHOR;
}

/**
 * Check if date is the demo "tomorrow"
 */
export function isDemoTomorrow(date: string): boolean {
  return date === getDemoDate(1);
}

/**
 * Check if date is the demo "yesterday"
 */
export function isDemoYesterday(date: string): boolean {
  return date === getDemoDate(-1);
}

/**
 * Demo date constants for common use
 */
export const DEMO_DATES = {
  today: DEMO_ANCHOR,
  tomorrow: getDemoDate(1),
  yesterday: getDemoDate(-1),
  nextWeek: getDemoDate(7),
  lastWeek: getDemoDate(-7),
} as const;
