import type { TaskOrganizationInput, TaskOrganizationSuggestion } from "@/types/task-organization";
import { MAX_ORGANIZE_TASKS } from "../../types/task-organization.ts";

type OrganizeResponse = { suggestions?: unknown; error?: unknown };

type OrganizationRequest = {
  date: string;
  locale: string;
  pomodoroMinutes: number;
  tasks: TaskOrganizationInput[];
};

export async function organizeDayTasks(
  input: OrganizationRequest,
  signal?: AbortSignal,
): Promise<TaskOrganizationSuggestion[]> {
  const suggestions: TaskOrganizationSuggestion[] = [];
  for (let from = 0; from < input.tasks.length; from += MAX_ORGANIZE_TASKS) {
    signal?.throwIfAborted();
    const batch = await organizeBatch(
      { ...input, tasks: input.tasks.slice(from, from + MAX_ORGANIZE_TASKS) },
      signal,
    );
    suggestions.push(...batch);
  }
  return suggestions;
}

async function organizeBatch(
  input: {
    date: string;
    locale: string;
    pomodoroMinutes: number;
    tasks: TaskOrganizationInput[];
  },
  signal?: AbortSignal,
): Promise<TaskOrganizationSuggestion[]> {
  let response: Response;
  try {
    response = await fetch("/api/tasks/organize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("organize_failed");
  }

  if (response.status === 401) throw new Error("auth_required");
  if (response.status === 429) throw new Error("rate_limited");
  if (response.status === 503) throw new Error("not_configured");
  if (!response.ok) throw new Error("organize_failed");

  const data = (await response.json()) as OrganizeResponse;
  if (!Array.isArray(data.suggestions)) throw new Error("organize_failed");
  const suggestions = data.suggestions as TaskOrganizationSuggestion[];
  const ids = new Set(input.tasks.map((task) => task.id));
  if (
    suggestions.length !== ids.size ||
    new Set(suggestions.map((item) => item.id)).size !== ids.size ||
    suggestions.some((item) => !ids.has(item.id))
  )
    throw new Error("organize_failed");
  return suggestions;
}
