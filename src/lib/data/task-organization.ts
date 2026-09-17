import type { Task } from "@/types/task";
import type { TaskOrganizationDraft } from "@/types/task-organization";

/** Compare the fields used by AI, not unrelated commitment/subtask state. */
export function isOrganizationCandidateCurrent(expected: Task, current: Task | undefined): boolean {
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
    current.estimate === expected.estimate,
  );
}

export function organizationPatch(
  suggestion: TaskOrganizationDraft,
  task: Task,
  pomodoroMinutes = 25,
): Partial<Task> {
  const schedule =
    suggestion.time && task.date
      ? {
          date: task.date,
          hour: Number(suggestion.time.slice(0, 2)),
          minute: Number(suggestion.time.slice(3, 5)),
          duration: task.schedule?.duration ?? suggestion.estimate * pomodoroMinutes,
          label: task.title,
        }
      : undefined;
  return {
    list: suggestion.list,
    tags: suggestion.tags,
    priority: suggestion.priority,
    estimate: suggestion.estimate,
    ...(suggestion.time || suggestion.timeEdited
      ? { time: suggestion.time ?? undefined, schedule }
      : {}),
  };
}
