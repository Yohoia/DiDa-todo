import type { TaskOrganizationInput, TaskOrganizationSuggestion } from "@/types/task-organization";

type OrganizeResponse = { suggestions?: unknown; error?: unknown };

export async function organizeDayTasks(
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
  return data.suggestions as TaskOrganizationSuggestion[];
}
