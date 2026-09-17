import type { Task } from "../../types/task.ts";

/** Serializable pending task write; survives reloads and is isolated per account. */
export type TaskWriteEntry = {
  id: string;
  taskId: string;
  /** Version the edit was based on; compare-and-set rejects stale lineage. */
  expectedUpdatedAt?: string;
  patch: Partial<Task>;
  /** A completed repeating task materializes its next occurrence after upload. */
  createRepeatChild?: boolean;
};

type QueueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStorage(): QueueStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

const key = (userId: string) => `dida-task-writes:${userId}`;

function validEntry(value: unknown): value is TaskWriteEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as TaskWriteEntry;
  return (
    typeof entry.id === "string" &&
    !!entry.id &&
    typeof entry.taskId === "string" &&
    !!entry.taskId &&
    (entry.expectedUpdatedAt === undefined || typeof entry.expectedUpdatedAt === "string") &&
    !!entry.patch &&
    typeof entry.patch === "object" &&
    (entry.createRepeatChild === undefined || typeof entry.createRepeatChild === "boolean")
  );
}

export function pendingTaskWrites(userId: string, storage = browserStorage()): TaskWriteEntry[] {
  try {
    const value: unknown = JSON.parse(storage?.getItem(key(userId)) ?? "[]");
    return Array.isArray(value) ? value.filter(validEntry) : [];
  } catch {
    return [];
  }
}

/** Coalesce per task: only the final field values and the oldest base version persist. */
export function enqueueTaskWrite(
  userId: string,
  entry: TaskWriteEntry,
  storage = browserStorage(),
): TaskWriteEntry[] {
  const rows = pendingTaskWrites(userId, storage);
  const previous = rows.find((row) => row.taskId === entry.taskId);
  const patch = previous ? { ...previous.patch, ...entry.patch } : entry.patch;
  let createRepeatChild = previous?.createRepeatChild || entry.createRepeatChild;
  if (entry.patch.completed !== undefined) {
    createRepeatChild = !!entry.createRepeatChild;
  } else if (entry.patch.repeatIntervalDays !== undefined) {
    const completed = patch.completed ?? previous?.patch.completed;
    createRepeatChild =
      completed !== false && !!entry.patch.repeatIntervalDays && !!createRepeatChild;
  }
  const next = previous
    ? rows.map((row) =>
        row === previous
          ? {
              ...row,
              expectedUpdatedAt: row.expectedUpdatedAt ?? entry.expectedUpdatedAt,
              patch,
              createRepeatChild,
            }
          : row,
      )
    : [...rows, entry];
  try {
    storage?.setItem(key(userId), JSON.stringify(next));
  } catch {
    /* Storage unavailable: the in-memory optimistic state still applies. */
  }
  return next;
}

/** Remove only the exact flushed snapshot; edits coalesced during flight stay queued. */
export function acknowledgeTaskWrite(
  userId: string,
  entry: TaskWriteEntry,
  storage = browserStorage(),
): void {
  const rows = pendingTaskWrites(userId, storage);
  const remaining = rows.filter(
    (row) => row.id !== entry.id || JSON.stringify(row) !== JSON.stringify(entry),
  );
  try {
    if (remaining.length) storage?.setItem(key(userId), JSON.stringify(remaining));
    else storage?.removeItem(key(userId));
  } catch {
    /* A replayed write is either idempotent or rejected by the version check. */
  }
}

/** Our own successful write advances the lineage of follow-up edits for that task. */
export function updateTaskWriteVersion(
  userId: string,
  taskId: string,
  updatedAt: string | undefined,
  storage = browserStorage(),
): void {
  if (!updatedAt) return;
  const rows = pendingTaskWrites(userId, storage);
  if (!rows.some((row) => row.taskId === taskId && row.expectedUpdatedAt !== updatedAt)) return;
  const next = rows.map((row) =>
    row.taskId === taskId ? { ...row, expectedUpdatedAt: updatedAt } : row,
  );
  try {
    storage?.setItem(key(userId), JSON.stringify(next));
  } catch {
    /* The next flush retry will refresh the version from the server row. */
  }
}

/** Whether a server row already contains this patch (crash between write and acknowledge). */
export function taskPatchMatches(task: Task, patch: Partial<Task>): boolean {
  return (Object.keys(patch) as (keyof Task)[]).every((field) => {
    const value = patch[field];
    switch (field) {
      case "time":
        return (value || undefined) === task.time;
      case "completedAt":
      case "repeatIntervalDays":
        return value === undefined ? !task[field] : task[field] === value;
      case "date":
        return task.date === (value ?? "");
      case "schedule":
        return scheduleMatches(task.schedule, value as Task["schedule"] | undefined);
      case "subtasks":
        return JSON.stringify(task.subtasks) === JSON.stringify(value ?? []);
      case "tags":
        return JSON.stringify(task.tags) === JSON.stringify(value ?? []);
      case "frozen":
      case "featured":
        return !!task[field] === !!value;
      default:
        return task[field] === value;
    }
  });
}

function scheduleMatches(
  actual: Task["schedule"] | undefined,
  expected: Task["schedule"] | undefined,
): boolean {
  if (!expected || !actual) return actual === expected;
  return (
    actual.date === expected.date &&
    actual.hour === expected.hour &&
    (actual.minute ?? 0) === (expected.minute ?? 0) &&
    actual.duration === expected.duration
  );
}

/** Apply one edit optimistically with the same schedule derivation as live editing. */
export function applyTaskPatch(task: Task, patch: Partial<Task>): Task {
  const nextDate = patch.date !== undefined ? patch.date : task.date;
  const timeChanged = Object.hasOwn(patch, "time");
  const nextTime = patch.date === "" ? undefined : timeChanged ? patch.time : task.time;
  let schedule = task.schedule;
  if (timeChanged || (!schedule && nextDate && nextTime)) {
    if (nextTime && nextDate) {
      const [hour, minute] = nextTime.split(":").map(Number);
      schedule = {
        date: nextDate,
        hour,
        minute,
        duration: task.schedule?.duration ?? Math.max(25, task.estimate * 25),
        label: patch.title ?? task.title,
      };
    } else {
      schedule = undefined;
    }
  } else if (schedule) {
    schedule = nextDate
      ? {
          ...schedule,
          ...(patch.title ? { label: patch.title } : {}),
          ...(patch.date !== undefined ? { date: patch.date } : {}),
        }
      : undefined;
  }
  return { ...task, ...patch, time: nextTime, schedule };
}

/** Hydrate a server snapshot with still-pending writes, preserving One Thing exclusivity. */
export function applyTaskPatches(tasks: Task[], entries: TaskWriteEntry[]): Task[] {
  let next = [...tasks];
  for (const entry of entries) {
    next = next.map((task) => {
      if (task.id === entry.taskId) return applyTaskPatch(task, entry.patch);
      return entry.patch.featured === true && task.featured ? { ...task, featured: false } : task;
    });
  }
  return next;
}
