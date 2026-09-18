type AiAdvisorTask = {
  id: string;
  estimate: number;
  subtaskCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeEstimate(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 16
    ? value
    : fallback;
}

function normalizeReason(value: unknown, locale: string) {
  const fallback = locale.toLowerCase().startsWith("zh")
    ? "保留现有子任务，不覆盖。"
    : "Keep existing subtasks.";
  const reason = typeof value === "string" && value.trim() ? value.trim() : fallback;
  return reason.slice(0, 80);
}

export function normalizeAiAdvisorResult(raw: unknown, tasks: AiAdvisorTask[], locale: string) {
  if (!isRecord(raw) || !Array.isArray(raw.taskSuggestions)) return raw;

  const suggestionsById = new Map<string, Record<string, unknown>>();
  for (const item of raw.taskSuggestions) {
    if (isRecord(item) && typeof item.id === "string" && !suggestionsById.has(item.id)) {
      suggestionsById.set(item.id, item);
    }
  }

  return {
    ...raw,
    taskSuggestions: tasks.map((task) => {
      const suggestion = suggestionsById.get(task.id);
      if (!suggestion && task.subtaskCount === 0) return null;

      return {
        id: task.id,
        subtasks: task.subtaskCount > 0 ? [] : (suggestion?.subtasks ?? []),
        estimate: normalizeEstimate(suggestion?.estimate, task.estimate),
        reason: normalizeReason(suggestion?.reason, locale),
      };
    }),
  };
}
