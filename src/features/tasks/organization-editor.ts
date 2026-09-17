import type {
  TaskOrganizationDraft,
  TaskOrganizationSuggestion,
} from "../../types/task-organization.ts";

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
) {
  return (
    original.list !== draft.list ||
    original.time !== draft.time ||
    original.priority !== draft.priority ||
    original.estimate !== draft.estimate ||
    JSON.stringify(original.tags) !== JSON.stringify(draft.tags)
  );
}
