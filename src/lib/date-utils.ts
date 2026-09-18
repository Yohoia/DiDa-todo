/** Date utilities for relative date calculations in the user's display timezone. */

export const APP_TIME_ZONE = "Asia/Shanghai";

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

function timeZoneOffsetMs(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(value);
  const part = Object.fromEntries(parts.map((item) => [item.type, item.value]));
  const asUtc = Date.UTC(
    Number(part.year),
    Number(part.month) - 1,
    Number(part.day),
    Number(part.hour === "24" ? "0" : part.hour),
    Number(part.minute),
    Number(part.second),
  );
  return asUtc - value.getTime();
}

/** Task wall-clock times follow the selected account timezone, never the device. */
export function taskDateTime(date: string, time: string, timeZone = APP_TIME_ZONE): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day
  )
    return null;
  const naive = Date.UTC(year, month - 1, day, Number(time.slice(0, 2)), Number(time.slice(3, 5)));
  const firstOffset = timeZoneOffsetMs(new Date(naive), timeZone);
  const candidate = new Date(naive - firstOffset);
  const secondOffset = timeZoneOffsetMs(candidate, timeZone);
  const value = new Date(naive - secondOffset);
  return Number.isFinite(value.getTime()) && getTodayKey(value, timeZone) === date ? value : null;
}

let todayKeyCache: { key: string; timeZone: string; expiresAt: number } | null = null;

/**
 * Return a stable YYYY-MM-DD key for the current app-local calendar day.
 * The no-arg path memoizes for a short TTL so per-row callers (TaskRow) don't
 * rebuild an Intl.DateTimeFormat on every render; midnight rollover lands
 * within the TTL.
 */
export function getTodayKey(now?: Date, timeZone = APP_TIME_ZONE): string {
  if (
    !now &&
    todayKeyCache &&
    todayKeyCache.timeZone === timeZone &&
    Date.now() < todayKeyCache.expiresAt
  ) {
    return todayKeyCache.key;
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now ?? new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const key = `${value.year}-${value.month}-${value.day}`;
  if (!now) todayKeyCache = { key, timeZone, expiresAt: Date.now() + 30_000 };
  return key;
}

/**
 * Return the earliest UTC instant belonging to a timezone's current local day.
 * Probing offsets around both the current and nominal-wall-clock instants also
 * handles DST transitions that fall at or across local midnight.
 */
export function timeZoneDayStart(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const wall = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const dateKey = `${wall.year}-${wall.month}-${wall.day}`;
  const nominalMidnight = Date.UTC(Number(wall.year), Number(wall.month) - 1, Number(wall.day));

  const probes = [
    now.getTime() - 86_400_000,
    now.getTime(),
    now.getTime() + 86_400_000,
    nominalMidnight - 86_400_000,
    nominalMidnight,
    nominalMidnight + 86_400_000,
  ];
  const candidates = probes
    .map((value) => nominalMidnight - timeZoneOffsetMs(new Date(value), timeZone))
    .filter((value) => getTodayKey(new Date(value), timeZone) === dateKey);

  if (!candidates.length) {
    throw new Error(`Unable to resolve the start of day in ${timeZone}`);
  }
  return new Date(Math.min(...candidates)).toISOString();
}

/** Parse a YYYY-MM-DD key into calendar parts (month is 0-11). */
export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month: month - 1, day };
}

/** Get the calendar weekday (Sunday is 0) without using the process timezone. */
export function dateKeyWeekday(key: string): number {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month, day)).getUTCDay();
}

/** Next Monday strictly after the given day, as YYYY-MM-DD. */
export function nextMondayKey(from: string): string {
  const { year, month, day } = parseDateKey(from);
  const date = new Date(year, month, day);
  const weekday = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() + ((7 - weekday) % 7 || 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** Demo seed data follows the real app-local day instead of a hard-coded date. */
export const DEMO_ANCHOR = getTodayKey();

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
 * A task becomes overdue after its due day has passed and it is still incomplete.
 * Undated tasks are never considered overdue.
 */
export function isOverdue(date: string, completed: boolean, timeZone = APP_TIME_ZONE): boolean {
  return Boolean(date) && date < getTodayKey(undefined, timeZone) && !completed;
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

export type CalendarCell = {
  /** Flat index in the 6-week grid; used for the collapsed week-row shift. */
  id: number;
  type: "pre" | "normal" | "next";
  year: number;
  /** 0-11 */
  month: number;
  day: number;
  /** Stable YYYY-MM-DD key matching Task.date */
  key: string;
};

/**
 * Build a month grid as a flat array of fixed 6 weeks (42 cells): previous-month
 * padding + the month itself + next-month padding, so every month renders at the
 * same height and the collapsed strip always shows a full week row.
 */
export function buildMonthCalendar(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 = 1,
): CalendarCell[] {
  const leading = (new Date(year, month, 1).getDay() - weekStartsOn + 7) % 7;
  const monthLength = new Date(year, month + 1, 0).getDate();
  const cells: Omit<CalendarCell, "id" | "key">[] = [];
  const preMonth = month === 0 ? 11 : month - 1;
  const preYear = month === 0 ? year - 1 : year;
  const preDays = new Date(preYear, preMonth + 1, 0).getDate();
  for (let day = leading; day > 0; day--) {
    cells.push({ type: "pre", year: preYear, month: preMonth, day: preDays - day + 1 });
  }
  for (let day = 1; day <= monthLength; day++) {
    cells.push({ type: "normal", year, month, day });
  }
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  for (let day = 1; cells.length < 42; day++) {
    cells.push({ type: "next", year: nextYear, month: nextMonth, day });
  }
  return cells.map((cell, id) => ({
    ...cell,
    id,
    key: `${cell.year}-${String(cell.month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`,
  }));
}
