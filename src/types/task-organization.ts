import type { OrganizedList, Task, TaskList } from "@/types/task";

export const MAX_ORGANIZE_TASKS = 40;

export type TaskOrganizationInput = Pick<
  Task,
  "id" | "title" | "description" | "list" | "tags" | "time" | "priority" | "estimate"
>;

export type TaskOrganizationSuggestion = {
  id: string;
  list: OrganizedList;
  tags: string[];
  time: string | null;
  priority: 1 | 2 | 3;
  estimate: number;
  reason: string;
};

/** Human edits are local drafts until confirmed; an explicit null time clears it. */
export type TaskOrganizationDraft = Omit<TaskOrganizationSuggestion, "list"> & {
  list: TaskList;
  timeEdited?: boolean;
  /** Human-only content changes; AI suggestions do not rewrite task content. */
  title?: string;
  description?: string;
  reminder?: string;
  repeatIntervalDays?: number;
  frozen?: boolean;
  subtasks?: Task["subtasks"];
};
