import type { Task } from "@/types/task";
import type { TaskOrganizationDraft } from "@/types/task-organization";

/** Compare the fields used by AI, not unrelated commitment/subtask state. */
export function isOrganizationCandidateCurrent(
  expected: Task,
  current: Task | undefined,
  checkDetails = false,
): boolean {
  return Boolean(
    current &&
    !current.completed &&
    current.date === expected.date &&
    current.title === expected.title &&
    current.description === expected.description &&
    current.list === expected.list &&
    JSON.stringify(current.tags) === JSON.stringify(expected.tags) &&
    (current.time || null) === (expected.time || null) &&
    current.priority === expected.priority &&
    current.estimate === expected.estimate &&
    (!checkDetails ||
      (current.reminder === expected.reminder &&
        current.repeatIntervalDays === expected.repeatIntervalDays &&
        !!current.frozen === !!expected.frozen &&
        JSON.stringify(current.subtasks) === JSON.stringify(expected.subtasks))),
  );
}

export function organizationPatch(
  suggestion: TaskOrganizationDraft,
  task: Task,
  pomodoroMinutes = 25,
): Partial<Task> {
  const title = suggestion.title ?? task.title;
  const schedule =
    suggestion.time && task.date
      ? {
          date: task.date,
          hour: Number(suggestion.time.slice(0, 2)),
          minute: Number(suggestion.time.slice(3, 5)),
          duration: task.schedule?.duration ?? suggestion.estimate * pomodoroMinutes,
          label: title,
        }
      : undefined;
  return {
    ...(suggestion.title !== undefined ? { title } : {}),
    ...(suggestion.description !== undefined ? { description: suggestion.description } : {}),
    ...(suggestion.reminder !== undefined ? { reminder: suggestion.reminder } : {}),
    ...(Object.hasOwn(suggestion, "repeatIntervalDays")
      ? { repeatIntervalDays: suggestion.repeatIntervalDays }
      : {}),
    ...(suggestion.frozen !== undefined ? { frozen: suggestion.frozen } : {}),
    ...(suggestion.subtasks !== undefined ? { subtasks: suggestion.subtasks } : {}),
    list: suggestion.list,
    tags: suggestion.tags,
    priority: suggestion.priority,
    estimate: suggestion.estimate,
    ...(suggestion.time || suggestion.timeEdited
      ? { time: suggestion.time ?? undefined, schedule }
      : suggestion.title !== undefined && task.schedule
        ? { schedule: { ...task.schedule, label: title } }
        : {}),
  };
}

export function hasOrganizationDetailEdits(value: object): boolean {
  return ["reminder", "repeatIntervalDays", "frozen", "subtasks"].some((key) =>
    Object.hasOwn(value, key),
  );
}
