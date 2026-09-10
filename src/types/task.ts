export type TaskList = "Inbox" | "Work" | "Study" | "Life";
export type Subtask = { id: string; title: string; completed: boolean };

/**
 * Task model combining core business data and UI state.
 *
 * NOTE: This structure will be refactored in Phase 1 when introducing Zod schemas.
 * Plan:
 * - Separate UI state (inWorkList, featured, frozen) from core business data
 * - Resolve semantic overlap between `schedule` and `date`/`time`
 * - Consider splitting into TaskCore (persisted) and TaskUI (derived/ephemeral)
 *
 * Current design serves Phase 0 demo needs with in-memory state only.
 */
export type Task = {
  // Core identity
  id: string;
  title: string;
  description: string;

  // Organization
  list: TaskList;
  tag?: string;

  // Scheduling (note: both `date` and `schedule` exist for different views)
  date: string; // Due date (used in month view, deadline-based views)
  time?: string; // Due time
  schedule?: { date: string; hour: number; duration: number; label?: string }; // Calendar time block

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
  inWorkList?: boolean; // Visible in Work & Projects view

  // Subtasks
  subtasks: Subtask[];
};
