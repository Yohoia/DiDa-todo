import type { FocusSessionRecord } from "../../types/focus.ts";

type JournalStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
function browserStorage(): JournalStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
const key = (userId: string) => `dida-focus-pending:${userId}`;
function valid(value: unknown): value is FocusSessionRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as FocusSessionRecord;
  return (
    typeof row.id === "string" &&
    typeof row.taskId === "string" &&
    typeof row.startedAt === "string" &&
    typeof row.endedAt === "string" &&
    Number.isFinite(Date.parse(row.startedAt)) &&
    Number.isFinite(Date.parse(row.endedAt)) &&
    Date.parse(row.endedAt) >= Date.parse(row.startedAt) &&
    Number.isSafeInteger(row.durationSeconds) &&
    row.durationSeconds > 0 &&
    typeof row.completed === "boolean"
  );
}
export function pendingFocusSessions(
  userId: string,
  storage = browserStorage(),
): FocusSessionRecord[] {
  try {
    const value: unknown = JSON.parse(storage?.getItem(key(userId)) ?? "[]");
    return Array.isArray(value) ? value.filter(valid) : [];
  } catch {
    return [];
  }
}
export function savePendingFocusSession(
  userId: string,
  input: FocusSessionRecord,
  storage = browserStorage(),
) {
  if (!storage || !valid(input)) return;
  const rows = pendingFocusSessions(userId, storage);
  const previous = rows.find((row) => row.id === input.id);
  if (
    previous &&
    (previous.durationSeconds > input.durationSeconds ||
      (previous.durationSeconds === input.durationSeconds &&
        previous.completed &&
        !input.completed))
  )
    return;
  try {
    storage.setItem(
      key(userId),
      JSON.stringify([...rows.filter((row) => row.id !== input.id), input]),
    );
  } catch {
    /* Storage unavailable: the provider still attempts the cloud write. */
  }
}
export function acknowledgeFocusSession(
  userId: string,
  input: FocusSessionRecord,
  storage = browserStorage(),
) {
  if (!storage) return;
  const rows = pendingFocusSessions(userId, storage);
  // A checkpoint finishing late must not acknowledge a newer unsaved checkpoint.
  const remaining = rows.filter(
    (row) => row.id !== input.id || JSON.stringify(row) !== JSON.stringify(input),
  );
  try {
    if (remaining.length) storage.setItem(key(userId), JSON.stringify(remaining));
    else storage.removeItem(key(userId));
  } catch {
    /* Retrying a saved record is safe because the session ID is stable. */
  }
}
