import type { Task } from "@/types/task";

export const HOUR_HEIGHT = 80;
export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export const pad = (value: number) => String(value).padStart(2, "0");
export function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function fromDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
export function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}
export function weekStart(date: Date, sunday: boolean) {
  return addDays(date, -((date.getDay() + (sunday ? 0 : 6)) % 7));
}
export function taskDate(task: Task) {
  return task.date || task.schedule?.date || "";
}
export function taskTime(task: Task) {
  if (task.time) return task.time;
  if (!task.schedule) return "";
  return `${pad(task.schedule.hour)}:${pad(task.schedule.minute ?? 0)}`;
}
export function taskMinutes(task: Task) {
  const time = taskTime(task);
  if (!time) return null;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}
export function endMinutes(task: Task) {
  return Math.min(1440, (taskMinutes(task) ?? 0) + Math.max(15, task.schedule?.duration ?? 30));
}
export function timeLabel(minutes: number) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** Lay out connected overlap groups, including events that cross hour boundaries. */
export function layoutEvents(tasks: Task[]) {
  const events = tasks
    .filter((task) => taskMinutes(task) !== null)
    .map((task) => {
      const start = taskMinutes(task)!;
      const end = endMinutes(task);
      // Reserve room for the minimum readable card height as well as its actual duration.
      return { task, start, end, collisionEnd: Math.max(end, start + 24), column: 0, columns: 1 };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end || a.task.id.localeCompare(b.task.id));
  let group: typeof events = [];
  let columnEnds: number[] = [];
  let groupEnd = -1;
  function finishGroup() {
    for (const event of group) event.columns = columnEnds.length;
    group = [];
    columnEnds = [];
  }
  for (const event of events) {
    if (event.start >= groupEnd) finishGroup();
    const freeColumn = columnEnds.findIndex((end) => end <= event.start);
    event.column = freeColumn === -1 ? columnEnds.length : freeColumn;
    columnEnds[event.column] = event.collisionEnd;
    group.push(event);
    groupEnd = Math.max(event.collisionEnd, ...columnEnds);
  }
  finishGroup();
  return events;
}
