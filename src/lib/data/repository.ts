import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task, TaskList } from "@/types/task";
import type { AppNotification } from "@/types/notification";
import type { FocusSessionRecord } from "@/types/focus";
import { isOrganizationCandidateCurrent, hasOrganizationDetailEdits } from "./task-organization.ts";

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
  dailyFocusGoalMinutes: number;
  defaultReminderMinutes: number;
  notificationRetentionDays: number;
  dailyDigest: boolean;
  gamificationEnabled: boolean;
  timeZone: string;
  hour12: boolean;
};

export const DEFAULT_PREFERENCES: StoredPreferences = {
  firstDay: "Monday",
  sound: true,
  duration: 25,
  autoBreak: false,
  dailyCapacity: 8,
  reminders: true,
  dailyFocusGoalMinutes: 120,
  defaultReminderMinutes: 0,
  notificationRetentionDays: 7,
  dailyDigest: true,
  gamificationEnabled: true,
  timeZone: "Asia/Shanghai",
  hour12: false,
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
  updated_at: string;
  repeat_interval_days?: number | null;
  repeat_parent_id?: string | null;
};

type SubtaskRow = {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position: number;
};

type SearchRpcRow = {
  task: TaskRow;
  total_count: number | null;
};

type PreferencesRow = {
  first_day: string;
  sound: boolean;
  pomodoro_duration: number;
  auto_break: boolean;
  daily_capacity: number;
  reminders: boolean;
  daily_focus_goal_minutes?: number;
  default_reminder_minutes?: number;
  notification_retention_days?: number;
  daily_digest?: boolean;
  gamification_enabled?: boolean;
  time_zone?: string;
  hour_12?: boolean;
};

const READ_PAGE_SIZE = 500;
const DAY_START_SUFFIX = "T00:00:00+08:00";

export type TaskPage = {
  tasks: Task[];
  total: number;
  hasMore: boolean;
};

async function loadAllTaskRows(client: SupabaseClient, userId: string): Promise<TaskRow[]> {
  const rows: TaskRow[] = [];
  for (let from = 0; ; from += READ_PAGE_SIZE) {
    const { data, error } = await client
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + READ_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as TaskRow[];
    rows.push(...page);
    if (page.length < READ_PAGE_SIZE) return rows;
  }
}

async function loadWorkspaceTaskRows(
  client: SupabaseClient,
  userId: string,
  timeZone = "Asia/Shanghai",
) {
  const activeRows: TaskRow[] = [];
  for (let from = 0; ; from += READ_PAGE_SIZE) {
    const { data, error } = await client
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("completed", false)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + READ_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as TaskRow[];
    activeRows.push(...page);
    if (page.length < READ_PAGE_SIZE) break;
  }

  const todayStart = `${timeZoneDateKey(timeZone)}${DAY_START_SUFFIX}`;
  const completedToday: TaskRow[] = [];
  for (let from = 0; ; from += READ_PAGE_SIZE) {
    const { data, error } = await client
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("completed", true)
      .gte("completed_at", todayStart)
      .order("completed_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + READ_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as TaskRow[];
    completedToday.push(...page);
    if (page.length < READ_PAGE_SIZE) break;
  }

  return [...activeRows, ...completedToday].sort(
    (left, right) =>
      left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id),
  );
}

function timeZoneDateKey(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function loadAllSubtaskRows(
  client: SupabaseClient,
  taskIds?: string[],
  userId?: string,
): Promise<SubtaskRow[]> {
  if (taskIds && taskIds.length === 0) return [];
  const rows: SubtaskRow[] = [];
  const batches = taskIds ? chunk(taskIds, READ_PAGE_SIZE) : [undefined];
  for (const batch of batches) {
    for (let from = 0; ; from += READ_PAGE_SIZE) {
      let query = client.from("subtasks").select("id, task_id, title, completed, position");
      if (batch) query = query.in("task_id", batch);
      if (userId) query = query.eq("user_id", userId);
      const { data, error } = await query
        .order("task_id", { ascending: true })
        .order("position", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + READ_PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      const page = (data ?? []) as SubtaskRow[];
      rows.push(...page);
      if (page.length < READ_PAGE_SIZE) break;
    }
  }
  return rows;
}

function chunk(values: string[], size: number) {
  const batches: string[][] = [];
  for (let index = 0; index < values.length; index += size)
    batches.push(values.slice(index, index + size));
  return batches;
}

async function rowsToTasks(
  client: SupabaseClient,
  userId: string,
  taskRows: TaskRow[],
): Promise<Task[]> {
  const subtaskRows = await loadAllSubtaskRows(
    client,
    taskRows.map((row) => row.id),
    userId,
  );
  const grouped = new Map<string, SubtaskRow[]>();
  for (const row of subtaskRows) {
    const list = grouped.get(row.task_id) ?? [];
    list.push(row);
    grouped.set(row.task_id, list);
  }
  return taskRows.map((row) => rowToTask(row, grouped.get(row.id) ?? []));
}

function rowToTask(row: TaskRow, subtasks: SubtaskRow[]): Task {
  const date = row.date ?? "";
  const time = row.time ? row.time.slice(0, 5) : undefined;
  return {
    id: row.id,
    updatedAt: row.updated_at,
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
    repeatIntervalDays: row.repeat_interval_days ?? undefined,
    repeatParentId: row.repeat_parent_id ?? undefined,
    completed: row.completed,
    completedAt: row.completed_at ?? undefined,
    frozen: row.frozen,
    featured: row.featured,
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
    ...(task.repeatIntervalDays !== undefined
      ? { repeat_interval_days: task.repeatIntervalDays }
      : {}),
    completed: task.completed,
    completed_at: task.completedAt ?? null,
    frozen: task.frozen ?? false,
    featured: task.featured ?? false,
  };
}

/** 未传字段不覆盖现值；显式传入 time/schedule: undefined 表示清空。 */
function updateColumns(patch: Partial<Task>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.list !== undefined) row.list = patch.list;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.date !== undefined) row.date = patch.date || null;
  if (Object.hasOwn(patch, "time")) {
    row.time = patch.time || null;
    if (!patch.time) row.duration_minutes = null;
  }
  if (Object.hasOwn(patch, "schedule")) row.duration_minutes = patch.schedule?.duration ?? null;
  if (patch.date === "") {
    row.time = null;
    row.duration_minutes = null;
  }
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.estimate !== undefined) row.estimate = patch.estimate;
  if (patch.reminder !== undefined) row.reminder = patch.reminder;
  if (Object.hasOwn(patch, "repeatIntervalDays"))
    row.repeat_interval_days = patch.repeatIntervalDays ?? null;
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
  supportsRepeatingTasks(): Promise<boolean>;
  loadTasks(): Promise<Task[]>;
  /** Active tasks plus today's completions; historical archive is loaded on demand. */
  loadWorkspaceTasks(): Promise<Task[]>;
  loadCompletedTasks(offset?: number, limit?: number): Promise<TaskPage>;
  loadTasksByDate(date: string): Promise<Task[]>;
  loadTasksByIds(ids: string[]): Promise<Task[]>;
  searchTasks(query: string, offset?: number, limit?: number): Promise<TaskPage>;
  loadTask(id: string): Promise<Task | null>;
  createTask(task: Task): Promise<void>;
  updateTask(id: string, patch: Partial<Task>): Promise<void>;
  /** null = version conflict or row missing; updatedAt is the fresh row version. */
  updateTaskVersioned(
    taskId: string,
    expectedUpdatedAt: string | undefined,
    patch: Partial<Task>,
  ): Promise<{ updatedAt?: string } | null>;
  applyTaskOrganization(
    expected: Task,
    patch: Partial<Task>,
  ): Promise<{ updatedAt?: string } | null>;
  loadRepeatChild(parentId: string): Promise<Task | null>;
  deleteTask(id: string): Promise<void>;
  loadPreferences(): Promise<StoredPreferences>;
  savePreferences(patch: Partial<StoredPreferences>): Promise<void>;
  recordVoiceCapture(input: {
    transcript: string;
    parsed: unknown;
    taskCount: number;
    durationSeconds?: number;
  }): Promise<void>;
  recordFocusSession(input: FocusSessionRecord): Promise<void>;
  listNotifications(): Promise<AppNotification[]>;
  createTaskDueNotification(notification: AppNotification): Promise<void>;
  createDailyDigestNotification(notification: AppNotification): Promise<void>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  dismissTaskNotifications(taskIds: string[]): Promise<void>;
  dismissAllNotifications(): Promise<void>;
  pruneNotifications(retentionDays: number): Promise<void>;
};

/**
 * @param client 浏览器端（乐观写穿）或服务端（layout 预取）客户端，RLS 依赖其携带的会话
 * @param userId 会话用户 id（tasks/subtasks 等表的 user_id 非空且必须匹配 RLS）
 */
export function createRepository(client: SupabaseClient, userId: string): Repository {
  const repository: Repository = {
    async supportsRepeatingTasks() {
      const { error } = await client.from("tasks").select("repeat_interval_days").limit(0);
      if (!error) return true;
      if (error.code === "42703" || error.code === "PGRST204") return false;
      throw new Error(error.message);
    },
    async loadTasks() {
      const taskRows = await loadAllTaskRows(client, userId);
      return rowsToTasks(client, userId, taskRows);
    },

    async loadWorkspaceTasks() {
      const preferences = await repository.loadPreferences();
      const taskRows = await loadWorkspaceTaskRows(client, userId, preferences.timeZone);
      return rowsToTasks(client, userId, taskRows);
    },

    async loadCompletedTasks(offset = 0, limit = 30) {
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const safeOffset = Math.max(offset, 0);
      const { data, count, error } = await client
        .from("tasks")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .eq("completed", true)
        .order("completed_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: true })
        .range(safeOffset, safeOffset + safeLimit - 1);
      if (error) throw new Error(error.message);
      const taskRows = (data ?? []) as TaskRow[];
      const total = count ?? taskRows.length;
      return {
        tasks: await rowsToTasks(client, userId, taskRows),
        total,
        hasMore: safeOffset + taskRows.length < total,
      };
    },

    async loadTasksByDate(date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
      const taskRows: TaskRow[] = [];
      for (let from = 0; ; from += READ_PAGE_SIZE) {
        const { data, error } = await client
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .eq("date", date)
          .order("time", { ascending: true, nullsFirst: false })
          .order("priority", { ascending: true })
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + READ_PAGE_SIZE - 1);
        if (error) throw new Error(error.message);
        const page = (data ?? []) as TaskRow[];
        taskRows.push(...page);
        if (page.length < READ_PAGE_SIZE) break;
      }
      return rowsToTasks(client, userId, taskRows);
    },

    async loadTasksByIds(ids) {
      if (!ids.length) return [];
      const rows: TaskRow[] = [];
      for (const batch of chunk(ids, 100)) {
        const { data, error } = await client
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .in("id", batch)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true });
        if (error) throw new Error(error.message);
        rows.push(...((data ?? []) as TaskRow[]));
      }
      return rowsToTasks(client, userId, rows);
    },

    async searchTasks(query, offset = 0, limit = 30) {
      const normalized = query.trim().slice(0, 120);
      if (!normalized) return { tasks: [], total: 0, hasMore: false };
      const safeLimit = Math.min(Math.max(limit, 1), 50);
      const { data, error } = await client.rpc(
        "search_tasks",
        {
          p_query: normalized,
          p_limit: safeLimit,
          p_offset: Math.max(offset, 0),
        },
        { count: "exact" },
      );
      if (error) throw new Error(error.message);
      const rpcRows = (data ?? []) as SearchRpcRow[];
      const taskRows = rpcRows.map((row) => row.task);
      const total = rpcRows[0]?.total_count ?? 0;
      return {
        tasks: await rowsToTasks(client, userId, taskRows),
        total,
        hasMore: offset + taskRows.length < total,
      };
    },

    async loadTask(id) {
      const { data, error } = await client
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const subtasks = await loadAllSubtaskRows(client, [id], userId);
      return rowToTask(data as TaskRow, subtasks);
    },

    async createTask(task) {
      const { error } = await client.from("tasks").insert({ ...taskToRow(task), user_id: userId });
      if (error) {
        if (error.code !== "23505") throw new Error(error.message);
        const existing = await client
          .from("tasks")
          .select("id")
          .eq("id", task.id)
          .eq("user_id", userId)
          .maybeSingle();
        if (existing.error || !existing.data) throw new Error(error.message);
        // A confirmed capture retries with the same ID, never overwriting edits.
        if (!task.subtasks.length) return;
      }
      if (task.subtasks.length) await repository.updateTask(task.id, { subtasks: task.subtasks });
    },

    async updateTask(id, patch) {
      if (patch.subtasks !== undefined) {
        const result = await repository.updateTaskVersioned(id, undefined, patch);
        if (!result) throw new Error("task_conflict");
        return;
      }
      const row = updateColumns(patch);
      if (Object.keys(row).length > 0) {
        const { error } = await client.from("tasks").update(row).eq("id", id).eq("user_id", userId);
        if (error) throw new Error(error.message);
      }
    },

    async updateTaskVersioned(taskId, expectedUpdatedAt, patch) {
      const row = updateColumns(patch);
      if (patch.subtasks !== undefined) {
        const { data, error } = await client.rpc("update_task_with_subtasks", {
          p_task_id: taskId,
          p_expected_updated_at: expectedUpdatedAt ?? null,
          p_patch: row,
          p_subtasks: patch.subtasks,
        });
        if (error) throw new Error(error.message);
        const next = (data ?? [])[0] as { updated_at: string } | undefined;
        return next ? { updatedAt: next.updated_at } : null;
      }
      if (Object.keys(row).length === 0) return { updatedAt: expectedUpdatedAt };
      let query = client
        .from("tasks")
        .update(row)
        .eq("id", taskId)
        .eq("user_id", userId)
        .select("updated_at");
      if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const next = (data ?? [])[0] as { updated_at?: string } | undefined;
      if (!next) return null;
      return { updatedAt: next.updated_at ?? expectedUpdatedAt };
    },

    async applyTaskOrganization(expected, patch): Promise<{ updatedAt?: string } | null> {
      const { data, error } = await client
        .from("tasks")
        .select("*")
        .eq("id", expected.id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const row = data as TaskRow;
      const checkDetails = hasOrganizationDetailEdits(patch);
      const subtasks = checkDetails ? await loadAllSubtaskRows(client, [expected.id], userId) : [];
      if (!isOrganizationCandidateCurrent(expected, rowToTask(row, subtasks), checkDetails))
        return null;
      if (patch.subtasks !== undefined) {
        return repository.updateTaskVersioned(expected.id, row.updated_at, patch);
      }
      // The version predicate closes the race between reading and writing,
      // including edits from another device. No migration is required.
      const result = await client
        .from("tasks")
        .update(updateColumns(patch))
        .eq("id", expected.id)
        .eq("user_id", userId)
        .eq("updated_at", row.updated_at)
        .eq("completed", false)
        .select("updated_at");
      if (result.error) throw new Error(result.error.message);
      if (result.data?.length !== 1) return null;
      const updatedAt =
        (result.data[0] as { updated_at?: string } | undefined)?.updated_at ?? row.updated_at;
      return { updatedAt };
    },

    async loadRepeatChild(parentId) {
      const { data, error } = await client
        .from("tasks")
        .select("*")
        .eq("repeat_parent_id", parentId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const { data: subtasks, error: subtaskError } = await client
        .from("subtasks")
        .select("id, task_id, title, completed, position")
        .eq("task_id", data.id)
        .eq("user_id", userId)
        .order("position");
      if (subtaskError) throw new Error(subtaskError.message);
      return rowToTask(data as TaskRow, (subtasks ?? []) as SubtaskRow[]);
    },

    async deleteTask(id) {
      const { error } = await client.from("tasks").delete().eq("id", id).eq("user_id", userId);
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
        dailyFocusGoalMinutes: row.daily_focus_goal_minutes ?? 120,
        defaultReminderMinutes: row.default_reminder_minutes ?? 0,
        notificationRetentionDays: row.notification_retention_days ?? 7,
        dailyDigest: row.daily_digest ?? true,
        gamificationEnabled: row.gamification_enabled ?? true,
        timeZone: row.time_zone ?? "Asia/Shanghai",
        hour12: row.hour_12 ?? false,
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
        ...(patch.dailyFocusGoalMinutes !== undefined
          ? { daily_focus_goal_minutes: patch.dailyFocusGoalMinutes }
          : {}),
        ...(patch.defaultReminderMinutes !== undefined
          ? { default_reminder_minutes: patch.defaultReminderMinutes }
          : {}),
        ...(patch.notificationRetentionDays !== undefined
          ? { notification_retention_days: patch.notificationRetentionDays }
          : {}),
        ...(patch.dailyDigest !== undefined ? { daily_digest: patch.dailyDigest } : {}),
        ...(patch.gamificationEnabled !== undefined
          ? { gamification_enabled: patch.gamificationEnabled }
          : {}),
        ...(patch.timeZone !== undefined ? { time_zone: patch.timeZone } : {}),
        ...(patch.hour12 !== undefined ? { hour_12: patch.hour12 } : {}),
      });
      if (error) throw new Error(error.message);
    },

    async recordVoiceCapture({ transcript, parsed, taskCount, durationSeconds }) {
      const { error } = await client.from("voice_captures").insert({
        user_id: userId,
        transcript,
        parsed,
        task_count: taskCount,
        duration_seconds: durationSeconds ?? null,
      });
      if (error) throw new Error(error.message);
    },

    async recordFocusSession({ id, taskId, startedAt, endedAt, durationSeconds, completed }) {
      if (durationSeconds <= 0) return;
      const baseRow = {
        id,
        user_id: userId,
        task_id: taskId as string | null,
        mode: "focus",
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: Math.round(durationSeconds),
        completed,
      };

      async function writeFocusRow(taskId: string | null) {
        const row = { ...baseRow, task_id: taskId };
        const { error } = await client.from("focus_sessions").insert(row);
        if (!error) return;
        if (error.code !== "23505") throw error;
        // Replays/checkpoints share an ID. An older checkpoint cannot shrink
        // an already saved session or create duplicate experience points.
        let replay = client
          .from("focus_sessions")
          .update(row)
          .eq("id", id)
          .eq("user_id", userId)
          .lte("duration_seconds", row.duration_seconds);
        if (!completed) replay = replay.eq("completed", false);
        const updated = await replay;
        if (updated.error) throw updated.error;
      }

      try {
        await writeFocusRow(taskId);
      } catch (error) {
        // Another device may delete the task while this checkpoint is queued.
        // Preserve the focus fact as an orphan, matching on delete set null.
        const foreignKeyViolation =
          typeof error === "object" && error !== null && (error as { code?: string }).code;
        if (taskId !== null && foreignKeyViolation === "23503") {
          await writeFocusRow(null);
          return;
        }
        throw error;
      }
    },

    async listNotifications() {
      type Row = {
        id: string;
        task_id: string | null;
        dedupe_key: string | null;
        title: string;
        type: AppNotification["type"];
        remind_at: string;
        read: boolean;
        created_at: string;
        dismissed_at: string | null;
      };
      // 隐藏记录也参与去重；分页读全，避免旧提醒被 50 条上限截断后重新出现。
      const rows: Row[] = [];
      for (let from = 0; ; from += READ_PAGE_SIZE) {
        const { data, error } = await client
          .from("notifications")
          .select("id, task_id, dedupe_key, title, remind_at, read, created_at, dismissed_at, type")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, from + READ_PAGE_SIZE - 1);
        if (error) throw new Error(error.message);
        const page = (data ?? []) as Row[];
        rows.push(...page);
        if (page.length < READ_PAGE_SIZE) break;
      }
      return rows.map((row) => ({
        id: row.id,
        type: row.type as AppNotification["type"],
        taskId: row.task_id ?? undefined,
        dedupeKey: row.dedupe_key ?? undefined,
        title: row.title,
        remindAt: row.remind_at,
        read: row.read,
        createdAt: row.created_at,
        dismissedAt: row.dismissed_at ?? undefined,
      }));
    },

    async createTaskDueNotification(notification) {
      const { error } = await client.from("notifications").insert({
        id: notification.id,
        user_id: userId,
        type: notification.type,
        task_id: notification.taskId,
        dedupe_key:
          notification.dedupeKey ??
          (notification.taskId ? `task:${notification.taskId}:${notification.remindAt}` : null),
        title: notification.title,
        remind_at: notification.remindAt,
        read: notification.read,
      });
      // 23505 = 唯一索引冲突：该任务已生成过通知（多标签页并发/回访补扫），视为成功
      if (error && error.code !== "23505") throw new Error(error.message);
    },

    async createDailyDigestNotification(notification) {
      const { error } = await client.from("notifications").insert({
        id: notification.id,
        user_id: userId,
        type: "daily_digest",
        task_id: null,
        dedupe_key: notification.dedupeKey,
        title: notification.title,
        remind_at: notification.remindAt,
        read: notification.read,
      });
      if (error && error.code !== "23505") throw new Error(error.message);
    },

    async markNotificationRead(id) {
      // Aggregate notifications do not have a task_id, so the row ID is the
      // stable update key for both notification types.
      const { error } = await client
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async markAllNotificationsRead() {
      const { error } = await client
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);
      if (error) throw new Error(error.message);
    },

    async dismissTaskNotifications(taskIds) {
      // 只隐藏确认时已有的通知，不影响清空期间刚到达的新提醒。
      // 多标签页冲突时本地 ID 可能是临时值，使用稳定的任务 ID 定位真实通知。
      for (let from = 0; from < taskIds.length; from += READ_PAGE_SIZE) {
        const { error } = await client
          .from("notifications")
          .update({ dismissed_at: new Date().toISOString(), read: true })
          .eq("user_id", userId)
          .in("task_id", taskIds.slice(from, from + READ_PAGE_SIZE));
        if (error) throw new Error(error.message);
      }
    },

    async dismissAllNotifications() {
      const { error } = await client
        .from("notifications")
        .update({ dismissed_at: new Date().toISOString(), read: true })
        .eq("user_id", userId)
        .is("dismissed_at", null);
      if (error) throw new Error(error.message);
    },

    async pruneNotifications(retentionDays) {
      const days = Math.min(Math.max(Math.round(retentionDays), 1), 90);
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
      const { error } = await client
        .from("notifications")
        .delete()
        .eq("user_id", userId)
        .lt("created_at", cutoff);
      if (error) throw new Error(error.message);
    },
  };
  return repository;
}
