import type { Task } from "@/types/task";

/** 重点和承诺是任务属性，不改变时间分组；容量只按原任务计算。 */
export function getTodayTasks(tasks: Task[], todayKey: string) {
  const today = tasks.filter((task) => task.date === todayKey);
  return {
    active: today.filter((task) => !task.completed),
    featured: today.find((task) => task.featured && !task.completed),
    timed: today
      .filter((task) => task.time)
      .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")),
    anytime: today.filter((task) => !task.time),
  };
}
