import type { OrganizedList, Task } from "@/types/task";

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
