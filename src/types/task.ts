export const ORGANIZED_LISTS = ["Work", "Study", "Life"] as const;
export type OrganizedList = (typeof ORGANIZED_LISTS)[number];
export type TaskList = "Inbox" | OrganizedList;

export function isOrganizedList(value: string | null): value is OrganizedList {
  return ORGANIZED_LISTS.some((list) => list === value);
}
export type Subtask = { id: string; title: string; completed: boolean };

/**
 * Task model combining core business data and UI state.
 *
 * `list` is the single source of truth for task organization. There is no
 * separate project membership flag or project table.
 */
export type Task = {
  // Core identity
  id: string;
  title: string;
  description: string;

  // Organization
  list: TaskList;
  tags: string[];

  // Scheduling (note: both `date` and `schedule` exist for different views)
  date: string; // Due date (used in month view, deadline-based views)
  time?: string; // Due time
  schedule?: { date: string; hour: number; minute?: number; duration: number; label?: string }; // Calendar time block

  // Task properties
  priority: 1 | 2 | 3;
  estimate: number; // Pomodoro count
  reminder: string;

  // Completion state
  completed: boolean;
  completedAt?: string;
  created: number;

  // UI state (to be separated in Phase 1)
  frozen?: boolean; // Commitment lock (Today page)
  featured?: boolean; // One Thing highlight

  // Subtasks
  subtasks: Subtask[];
};
