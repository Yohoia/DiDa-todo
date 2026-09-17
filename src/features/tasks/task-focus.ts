import type { Task } from "@/types/task";

export function canSetTodayFocus(task: Task, todayKey: string): boolean {
  return task.date === todayKey && !task.completed;
}

/** Reject invalid promotions before clearing another task's focus. */
export function normalizeFocusPatch(
  task: Task,
  patch: Partial<Task>,
  todayKey: string,
): Partial<Task> | null {
  const next = { ...task, ...patch };
  if (patch.featured === true && !canSetTodayFocus(next, todayKey)) return null;
  if (task.featured && !canSetTodayFocus(next, todayKey)) return { ...patch, featured: false };
  return patch;
}
