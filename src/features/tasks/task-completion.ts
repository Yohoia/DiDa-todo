import type { Task } from "@/types/task";

/** 恢复任务不抢占当前 One Thing，避免与现有专注任务违反唯一约束。 */
export function taskCompletionPatch(task: Task): Partial<Task> {
  const completed = !task.completed;
  return {
    completed,
    completedAt: completed ? new Date().toISOString() : undefined,
    ...(!completed ? { featured: false } : {}),
  };
}
