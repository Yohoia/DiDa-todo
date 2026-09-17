import type {
  TaskOrganizationDraft,
  TaskOrganizationSuggestion,
} from "../../types/task-organization.ts";
import type { Task } from "../../types/task.ts";
import { TASK_DESCRIPTION_LIMIT, TASK_TITLE_LIMIT } from "./task-content.ts";

export function parseOrganizationTags(input: string): string[] {
  return [
    ...new Set(
      input
        .split(/[,，]/)
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean),
    ),
  ];
}
export function organizationDraftError(draft: TaskOrganizationDraft): string | null {
  if (draft.title !== undefined && (!draft.title.trim() || draft.title.length > TASK_TITLE_LIMIT))
    return "organize.invalidTitle";
  if (draft.description !== undefined && draft.description.length > TASK_DESCRIPTION_LIMIT)
    return "organize.invalidDescription";
  if (
    draft.reminder !== undefined &&
    !["None", "10 min before", "20 min before", "30 min before"].includes(draft.reminder)
  )
    return "organize.invalidDetails";
  if (
    draft.repeatIntervalDays !== undefined &&
    (!Number.isInteger(draft.repeatIntervalDays) ||
      draft.repeatIntervalDays < 1 ||
      draft.repeatIntervalDays > 365)
  )
    return "organize.invalidDetails";
  if (draft.frozen !== undefined && typeof draft.frozen !== "boolean")
    return "organize.invalidDetails";
  if (
    draft.subtasks !== undefined &&
    (new Set(draft.subtasks.map((subtask) => subtask.id)).size !== draft.subtasks.length ||
      draft.subtasks.some(
        (subtask) =>
          !subtask.id ||
          !subtask.title.trim() ||
          subtask.title.length > TASK_TITLE_LIMIT ||
          typeof subtask.completed !== "boolean",
      ))
  )
    return "organize.invalidDetails";
  if (!["Inbox", "Work", "Study", "Life"].includes(draft.list)) return "organize.invalidList";
  if (draft.time !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time))
    return "organize.invalidTime";
  if (![1, 2, 3].includes(draft.priority)) return "organize.invalidPriority";
  if (!Number.isInteger(draft.estimate) || draft.estimate < 1 || draft.estimate > 16)
    return "organize.invalidEstimate";
  if (
    draft.tags.length > 3 ||
    draft.tags.some((tag) => !tag.trim() || tag.length > 12) ||
    new Set(draft.tags).size !== draft.tags.length
  )
    return "organize.invalidTags";
  return null;
}
export function isOrganizationEdited(
  original: TaskOrganizationSuggestion,
  draft: TaskOrganizationDraft,
  task?: Task,
) {
  return (
    (draft.title !== undefined && draft.title !== task?.title) ||
    (draft.description !== undefined && draft.description !== task?.description) ||
    (draft.reminder !== undefined && draft.reminder !== task?.reminder) ||
    (Object.hasOwn(draft, "repeatIntervalDays") &&
      draft.repeatIntervalDays !== task?.repeatIntervalDays) ||
    (draft.frozen !== undefined && draft.frozen !== !!task?.frozen) ||
    (draft.subtasks !== undefined &&
      JSON.stringify(draft.subtasks) !== JSON.stringify(task?.subtasks)) ||
    original.list !== draft.list ||
    original.time !== draft.time ||
    original.priority !== draft.priority ||
    original.estimate !== draft.estimate ||
    JSON.stringify(original.tags) !== JSON.stringify(draft.tags)
  );
}

/** Keep full-detail edits local and reject attempts to change day or execute immediate actions. */
export function updateOrganizationDraft(
  draft: TaskOrganizationDraft,
  patch: Partial<Task>,
): TaskOrganizationDraft {
  const next = { ...draft };
  for (const key of [
    "title",
    "description",
    "list",
    "tags",
    "priority",
    "estimate",
    "reminder",
    "repeatIntervalDays",
    "frozen",
    "subtasks",
  ] as const) {
    if (Object.hasOwn(patch, key)) Object.assign(next, { [key]: patch[key] });
  }
  if (Object.hasOwn(patch, "time")) {
    next.time = patch.time ?? null;
    next.timeEdited = true;
  }
  return next;
}
