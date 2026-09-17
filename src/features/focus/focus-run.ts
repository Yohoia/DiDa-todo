import type { FocusSessionRecord } from "../../types/focus.ts";

export type FocusPhase = "focus" | "focusComplete" | "shortBreak" | "longBreak" | "breakComplete";
export type FocusRun = {
  id: string;
  taskId: string;
  phase: FocusPhase;
  focusSeconds: number;
  totalSeconds: number;
  remainingSeconds: number;
  deadline: number | null;
  startedAt: string;
  completedRounds: number;
  autoBreak: boolean;
  autoNext: boolean;
};
export function newFocusRun(
  taskId: string,
  id: string,
  minutes: number,
  autoBreak: boolean,
  now = Date.now(),
): FocusRun {
  const totalSeconds = Math.max(5, Math.min(120, minutes)) * 60;
  return {
    id,
    taskId,
    phase: "focus",
    focusSeconds: totalSeconds,
    totalSeconds,
    remainingSeconds: totalSeconds,
    deadline: now + totalSeconds * 1000,
    startedAt: new Date(now).toISOString(),
    completedRounds: 0,
    autoBreak,
    autoNext: false,
  };
}
export function focusRemaining(run: FocusRun, now = Date.now()): number {
  return run.deadline === null
    ? run.remainingSeconds
    : Math.max(0, Math.min(run.totalSeconds, Math.ceil((run.deadline - now) / 1000)));
}
export function pauseFocusRun(run: FocusRun, now = Date.now()): FocusRun {
  return { ...run, remainingSeconds: focusRemaining(run, now), deadline: null };
}
export function resumeFocusRun(run: FocusRun, now = Date.now()): FocusRun {
  return { ...run, deadline: now + run.remainingSeconds * 1000 };
}
export function focusRunRecord(run: FocusRun, now = Date.now()): FocusSessionRecord | null {
  if (run.phase !== "focus") return null;
  const remaining = focusRemaining(run, now);
  const durationSeconds = run.totalSeconds - remaining;
  if (durationSeconds <= 0) return null;
  return {
    id: run.id,
    taskId: run.taskId,
    startedAt: run.startedAt,
    endedAt: new Date(
      remaining === 0 && run.deadline !== null ? Math.min(now, run.deadline) : now,
    ).toISOString(),
    durationSeconds,
    completed: remaining === 0,
  };
}
export function startFocusBreak(run: FocusRun, now = Date.now()): FocusRun {
  const long = run.completedRounds > 0 && run.completedRounds % 4 === 0;
  const totalSeconds = (long ? 15 : 5) * 60;
  return {
    ...run,
    phase: long ? "longBreak" : "shortBreak",
    totalSeconds,
    remainingSeconds: totalSeconds,
    deadline: now + totalSeconds * 1000,
  };
}
export function nextFocusRound(run: FocusRun, id: string, now = Date.now()): FocusRun {
  return {
    ...run,
    id,
    phase: "focus",
    totalSeconds: run.focusSeconds,
    remainingSeconds: run.focusSeconds,
    startedAt: new Date(now).toISOString(),
    deadline: now + run.focusSeconds * 1000,
  };
}
/** Advance only the current phase; never invent multiple rounds after a long absence. */
export function settleFocusRun(run: FocusRun, nextId: string, now = Date.now()): FocusRun {
  if (
    focusRemaining(run, now) > 0 ||
    run.phase === "focusComplete" ||
    run.phase === "breakComplete"
  )
    return run;
  if (run.phase === "focus") {
    const completed: FocusRun = {
      ...run,
      phase: "focusComplete",
      completedRounds: run.completedRounds + 1,
      remainingSeconds: 0,
      deadline: null,
    };
    return run.autoBreak ? startFocusBreak(completed, now) : completed;
  }
  const completed: FocusRun = {
    ...run,
    phase: "breakComplete",
    remainingSeconds: 0,
    deadline: null,
  };
  return run.autoNext ? nextFocusRound(completed, nextId, now) : completed;
}
type RunStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
function browserStorage(): RunStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}
const key = (userId: string) => `dida-focus-active:${userId}`;
function valid(value: unknown): value is FocusRun {
  if (!value || typeof value !== "object") return false;
  const run = value as FocusRun;
  return (
    typeof run.id === "string" &&
    !!run.id &&
    typeof run.taskId === "string" &&
    !!run.taskId &&
    ["focus", "focusComplete", "shortBreak", "longBreak", "breakComplete"].includes(run.phase) &&
    Number.isSafeInteger(run.focusSeconds) &&
    run.focusSeconds >= 300 &&
    run.focusSeconds <= 7200 &&
    Number.isSafeInteger(run.totalSeconds) &&
    run.totalSeconds >= 300 &&
    run.totalSeconds <= 7200 &&
    Number.isSafeInteger(run.remainingSeconds) &&
    run.remainingSeconds >= 0 &&
    run.remainingSeconds <= run.totalSeconds &&
    (run.deadline === null || Number.isSafeInteger(run.deadline)) &&
    typeof run.startedAt === "string" &&
    Number.isFinite(Date.parse(run.startedAt)) &&
    Number.isSafeInteger(run.completedRounds) &&
    run.completedRounds >= 0 &&
    typeof run.autoBreak === "boolean" &&
    typeof run.autoNext === "boolean" &&
    (run.phase === "focusComplete" || run.phase === "breakComplete"
      ? run.deadline === null && run.remainingSeconds === 0
      : true)
  );
}
export function readActiveFocus(userId: string, storage = browserStorage()): FocusRun | null {
  try {
    const value: unknown = JSON.parse(storage?.getItem(key(userId)) ?? "null");
    return valid(value) ? value : null;
  } catch {
    return null;
  }
}
export function saveActiveFocus(
  userId: string,
  run: FocusRun,
  storage = browserStorage(),
): boolean {
  if (!storage || !valid(run)) return false;
  try {
    storage.setItem(key(userId), JSON.stringify(run));
    return true;
  } catch {
    return false;
  }
}
export function clearActiveFocus(userId: string, storage = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(key(userId));
    return true;
  } catch {
    return false;
  }
}
