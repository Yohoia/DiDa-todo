import type { AiAdvisorResult, AiAdvisorTaskInput } from "@/types/ai-advisor";

type AdvisorRequest = {
  locale: string;
  pomodoroMinutes: number;
  dailyCapacity: number;
  tasks: AiAdvisorTaskInput[];
  history: { date: string; completed: number; focusMinutes: number }[];
};

export async function requestAiAdvisor(
  input: AdvisorRequest,
  signal?: AbortSignal,
): Promise<AiAdvisorResult> {
  let response: Response;
  try {
    response = await fetch("/api/ai/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("network_failed");
  }
  if (response.status === 401) throw new Error("auth_required");
  if (response.status === 429) throw new Error("rate_limited");
  if (response.status === 503) throw new Error("not_configured");
  if (!response.ok) throw new Error("advisor_failed");

  const data = (await response.json()) as { result?: unknown };
  if (!data.result || typeof data.result !== "object") throw new Error("advisor_failed");
  return data.result as AiAdvisorResult;
}
