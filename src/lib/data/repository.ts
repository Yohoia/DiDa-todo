import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task, TaskList } from "@/types/task";

/**
 * Supabase 数据仓库：组件不直接 supabase.from()，统一经此层读写（TechStack §14）。
 * date/time 是库里唯一时间事实；schedule 在加载时由二者 + duration_minutes 派生。
 */

/** 工作台偏好（user_preferences 表 ↔ WorkspaceProvider 的同一形状）。 */
export type StoredPreferences = {
  firstDay: "Monday" | "Sunday";
  sound: boolean;
  duration: number;
  autoBreak: boolean;
  dailyCapacity: number;
  reminders: boolean;
};

export const DEFAULT_PREFERENCES: StoredPreferences = {
  firstDay: "Monday",
  sound: true,
  duration: 25,
  autoBreak: false,
  dailyCapacity: 8,
  reminders: true,
};

type TaskRow = {
  id: string;
  title: string;
  description: string;
  list: TaskList;
  tags: string[] | null;
  date: string | null;
  time: string | null; // PostgREST 返回 HH:MM:SS
  duration_minutes: number | null;
  priority: number;
  estimate: number;
  reminder: string;
  completed: boolean;
  completed_at: string | null;
  frozen: boolean;
  featured: boolean;
  created_at: string;
};

type SubtaskRow = {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position: number;
};

type PreferencesRow = {
  first_day: string;
  sound: boolean;
  pomodoro_duration: number;
  auto_break: boolean;
  daily_capacity: number;
  reminders: boolean;
};

function rowToTask(row: TaskRow, subtasks: SubtaskRow[]): Task {
  const date = row.date ?? "";
  const time = row.time ? row.time.slice(0, 5) : undefined;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    list: row.list,
    tags: row.tags ?? [],
    date,
    time,
    schedule:
      date && time
        ? {
            date,
            hour: Number(time.slice(0, 2)),
            minute: Number(time.slice(3, 5)),
            duration: row.duration_minutes ?? 25,
            label: row.title,
          }
        : undefined,
    priority: (row.priority as Task["priority"]) ?? 3,
    estimate: row.estimate,
    reminder: row.reminder,
    completed: row.completed,
    completedAt: row.completed_at ?? undefined,
    frozen: row.frozen,
    featured: row.featured,
    inWorkList: row.list === "Work",
    created: new Date(row.created_at).getTime(),
    subtasks: subtasks.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      completed: subtask.completed,
    })),
  };
}

/** UI Task → tasks 表插入行（user_id 由调用方补上；id 沿用客户端 uuid 以便乐观更新）。 */
function taskToRow(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    list: task.list,
    tags: task.tags,
    date: task.date || null,
    time: task.time || null,
    duration_minutes: task.schedule?.duration ?? null,
    priority: task.priority,
    estimate: task.estimate,
    reminder: task.reminder,
    completed: task.completed,
    completed_at: task.completedAt ?? null,
    frozen: task.frozen ?? false,
    featured: task.featured ?? false,
  };
}

/** updateTask 的 patch → 待更新列；undefined 字段不进 row（不覆盖库中现值）。 */
function updateColumns(patch: Partial<Task>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.list !== undefined) row.list = patch.list;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.date !== undefined) row.date = patch.date || null;
  if (patch.time !== undefined) row.time = patch.time || null;
  if (patch.schedule !== undefined) row.duration_minutes = patch.schedule?.duration ?? null;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.estimate !== undefined) row.estimate = patch.estimate;
  if (patch.reminder !== undefined) row.reminder = patch.reminder;
  if (patch.completed !== undefined) {
    row.completed = patch.completed;
    row.completed_at = patch.completedAt ?? (patch.completed ? new Date().toISOString() : null);
  } else if (patch.completedAt !== undefined) {
    row.completed_at = patch.completedAt ?? null;
  }
  if (patch.frozen !== undefined) row.frozen = patch.frozen;
  if (patch.featured !== undefined) row.featured = patch.featured;
  return row;
}

export type Repository = {
  loadTasks(): Promise<Task[]>;
  createTask(task: Task): Promise<void>;
  updateTask(id: string, patch: Partial<Task>): Promise<void>;
  deleteTask(id: string): Promise<void>;
  loadPreferences(): Promise<StoredPreferences>;
  savePreferences(patch: Partial<StoredPreferences>): Promise<void>;
  recordVoiceCapture(input: {
    transcript: string;
    parsed: unknown;
    taskCount: number;
  }): Promise<void>;
};

/**
 * @param client 浏览器端（乐观写穿）或服务端（layout 预取）客户端，RLS 依赖其携带的会话
 * @param userId 会话用户 id（tasks/subtasks 等表的 user_id 非空且必须匹配 RLS）
 */
export function createRepository(client: SupabaseClient, userId: string): Repository {
  const repository: Repository = {
    async loadTasks() {
      const [tasksResult, subtasksResult] = await Promise.all([
        client.from("tasks").select("*").order("created_at", { ascending: true }),
        client
          .from("subtasks")
          .select("id, task_id, title, completed, position")
          .order("position", { ascending: true }),
      ]);
      if (tasksResult.error) throw new Error(tasksResult.error.message);
      if (subtasksResult.error) throw new Error(subtasksResult.error.message);

      const grouped = new Map<string, SubtaskRow[]>();
      for (const row of (subtasksResult.data ?? []) as SubtaskRow[]) {
        const list = grouped.get(row.task_id) ?? [];
        list.push(row);
        grouped.set(row.task_id, list);
      }
      return ((tasksResult.data ?? []) as TaskRow[]).map((row) =>
        rowToTask(row, grouped.get(row.id) ?? []),
      );
    },

    async createTask(task) {
      const { error } = await client.from("tasks").insert({ ...taskToRow(task), user_id: userId });
      if (error) throw new Error(error.message);
      if (task.subtasks.length) await repository.updateTask(task.id, { subtasks: task.subtasks });
    },

    async updateTask(id, patch) {
      const row = updateColumns(patch);
      if (Object.keys(row).length > 0) {
        const { error } = await client.from("tasks").update(row).eq("id", id);
        if (error) throw new Error(error.message);
      }
      if (patch.subtasks === undefined) return;

      // 子任务整组同步：upsert 现有（position 即数组序），删除列表里没有的
      const next = patch.subtasks;
      if (next.length > 0) {
        const { error } = await client.from("subtasks").upsert(
          next.map((subtask, index) => ({
            id: subtask.id,
            task_id: id,
            user_id: userId,
            title: subtask.title,
            completed: subtask.completed,
            position: index,
          })),
        );
        if (error) throw new Error(error.message);
      }
      const keepIds = next.map((subtask) => subtask.id);
      const stale = keepIds.length
        ? client
            .from("subtasks")
            .delete()
            .eq("task_id", id)
            .not("id", "in", `(${keepIds.join(",")})`)
        : client.from("subtasks").delete().eq("task_id", id);
      const { error } = await stale;
      if (error) throw new Error(error.message);
    },

    async deleteTask(id) {
      const { error } = await client.from("tasks").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async loadPreferences() {
      const { data, error } = await client
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        // 正常不会发生（注册触发器建档）；兜底写一行默认值
        await repository.savePreferences({});
        return DEFAULT_PREFERENCES;
      }
      const row = data as PreferencesRow;
      return {
        firstDay: row.first_day === "Sunday" ? "Sunday" : "Monday",
        sound: row.sound,
        duration: row.pomodoro_duration,
        autoBreak: row.auto_break,
        dailyCapacity: row.daily_capacity,
        reminders: row.reminders,
      };
    },

    async savePreferences(patch) {
      const { error } = await client.from("user_preferences").upsert({
        user_id: userId,
        ...(patch.firstDay !== undefined ? { first_day: patch.firstDay } : {}),
        ...(patch.sound !== undefined ? { sound: patch.sound } : {}),
        ...(patch.duration !== undefined ? { pomodoro_duration: patch.duration } : {}),
        ...(patch.autoBreak !== undefined ? { auto_break: patch.autoBreak } : {}),
        ...(patch.dailyCapacity !== undefined ? { daily_capacity: patch.dailyCapacity } : {}),
        ...(patch.reminders !== undefined ? { reminders: patch.reminders } : {}),
      });
      if (error) throw new Error(error.message);
    },

    async recordVoiceCapture({ transcript, parsed, taskCount }) {
      const { error } = await client.from("voice_captures").insert({
        user_id: userId,
        transcript,
        parsed,
        task_count: taskCount,
      });
      if (error) throw new Error(error.message);
    },
  };
  return repository;
}
