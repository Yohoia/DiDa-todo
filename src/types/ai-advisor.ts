export const MAX_AI_ADVISOR_TASKS = 40;

export type AiAdvisorTaskInput = {
  id: string;
  title: string;
  description: string;
  list: string;
  priority: 1 | 2 | 3;
  estimate: number;
  subtaskCount: number;
};

export type AiAdvisorTaskSuggestion = {
  id: string;
  subtasks: string[];
  estimate: number;
  reason: string;
};

export type AiAdvisorResult = {
  taskSuggestions: AiAdvisorTaskSuggestion[];
  capacity: { status: "fits" | "tight" | "over"; totalPomodoros: number; message: string };
  weeklyReview: { summary: string; wins: string[]; risks: string[]; nextActions: string[] };
};

export type AiAdvisorDraft = AiAdvisorTaskSuggestion;
