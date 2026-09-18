"use client";
import type { MessageKey } from "@/i18n/messages";
import type { MessageValues } from "@/i18n/translate";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Task, TaskList } from "@/types/task";
import type { AppNotification } from "@/types/notification";
import type { VoiceCaptureState, VoiceParsed } from "@/types/voice";
import { createId } from "@/lib/utils";
import {
  createRepository,
  type Repository,
  type StoredPreferences as Preferences,
  type TaskPage,
} from "@/lib/data/repository";
import { createClient } from "@/lib/supabase/client";
import { LOGIN_REQUIRED_URL } from "@/lib/workspace-access";
import { createWorkspaceSync } from "./workspace-sync";
import { createWorkspaceRealtime, type WorkspaceRealtimeStatus } from "./workspace-realtime";
import { taskCompletionPatch } from "./task-completion";
import { getTodayKey } from "@/lib/date-utils";
import { normalizeFocusPatch } from "./task-focus";
import {
  isOrganizationCandidateCurrent,
  organizationPatch,
  hasOrganizationDetailEdits,
} from "@/lib/data/task-organization";
import type { AiAdvisorDraft } from "@/types/ai-advisor";
import type { TaskOrganizationDraft } from "@/types/task-organization";
import { organizationDraftError } from "./organization-editor";
import {
  captureDraftError,
  capturedTask,
  type TaskCaptureDraft,
  type CaptureSaveResult,
} from "./task-capture";
import {
  acknowledgeTaskWrite,
  applyTaskPatch,
  applyTaskPatches,
  enqueueTaskWrite,
  pendingTaskWrites,
  taskPatchMatches,
  taskWriteStorageLimited,
  updateTaskWriteVersion,
  type TaskWriteEntry,
} from "./task-write-queue";
import type { FocusSessionRecord } from "@/types/focus";
import { PreferencesProvider, usePreferences } from "@/features/preferences/preferences-provider";
import {
  pendingFocusSessions,
  savePendingFocusSession,
  acknowledgeFocusSession,
} from "@/features/focus/focus-journal";

type Notice = { key: MessageKey; values?: MessageValues };
const TASK_WRITE_DEBOUNCE_MS = 500;
const TASK_WRITE_RETRY_MS = 3_000;
const URGENT_TASK_FIELDS = [
  "completed",
  "completedAt",
  "subtasks",
  "frozen",
  "repeatIntervalDays",
] as const;

function sameTaskWrite(left: TaskWriteEntry, right: TaskWriteEntry): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeTaskPage(
  userId: string,
  current: Task[],
  incoming: Task[],
  replaceDate?: string,
): Task[] {
  const pending = pendingTaskWrites(userId);
  const incomingIds = new Set(incoming.map((task) => task.id));
  const retained = replaceDate
    ? current.filter(
        (task) =>
          task.date !== replaceDate ||
          incomingIds.has(task.id) ||
          pending.some((entry) => entry.taskId === task.id),
      )
    : current;
  const byId = new Map(retained.map((task) => [task.id, task] as const));
  for (const task of incoming) byId.set(task.id, task);
  return applyTaskPatches([...byId.values()], pending);
}

export type QuickAddPreset = {
  list: TaskList;
  date?: string;
  time?: string;
  title?: string;
  captures?: TaskCaptureDraft[];
  sourceVoice?: { transcript: string; durationSeconds?: number };
};
/** 登录用户摘要：服务端验证会话后注入。 */
export type WorkspaceUser = { id: string; email: string; displayName: string };

type WorkspaceState = {
  recurrenceAvailable: boolean;
  tasks: Task[];
  updateTask: (id: string, patch: Partial<Task>) => void;
  applyTaskOrganization: (
    expected: Task[],
    suggestions: TaskOrganizationDraft[],
  ) => Promise<{ applied: number; skipped: number; failed: number }>;
  applyTaskAdvice: (
    expected: Task[],
    suggestions: AiAdvisorDraft[],
  ) => Promise<{ applied: number; skipped: number; failed: number }>;
  addTask: (title: string, list?: TaskList, date?: string, time?: string) => string | undefined;
  saveCapturedTasks: (drafts: TaskCaptureDraft[]) => Promise<CaptureSaveResult>;
  toggleTask: (id: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteTask: (id: string) => void;
  selectedId: string | null;
  selectTask: (id: string | null) => void;
  quickAdd: QuickAddPreset | null;
  setQuickAdd: (preset: TaskList | QuickAddPreset | null) => void;
  /** 语音速记：导航栏变形为听写胶囊，录音→识别→确认卡三阶段。 */
  voiceCapture: VoiceCaptureState | null;
  setVoiceCapture: (state: VoiceCaptureState | null) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  focusId: string | null;
  startFocus: (id: string) => void;
  stopFocus: () => void;
  preferences: Preferences;
  setPreferences: (patch: Partial<Preferences>) => void;
  /** 站内通知中心（任务到期提醒），登录后持久化 */
  notifications: AppNotification[];
  recordTaskDueNotification: (input: {
    taskId: string;
    title: string;
    remindAt: string;
  }) => boolean;
  recordDailyDigestNotification: (input: {
    date: string;
    count: number;
    remindAt: string;
  }) => boolean;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  notice: Notice | null;
  notify: (message: Notice | null) => void;
  /** Realtime connection state; data snapshots still go through the serial sync queue. */
  realtimeStatus: WorkspaceRealtimeStatus;
  taskWritesStorageLimited: boolean;
  loadCompletedTasks: (offset?: number, limit?: number) => Promise<TaskPage>;
  loadTasksForDate: (date: string) => Promise<Task[]>;
  searchTasks: (query: string, offset?: number, limit?: number) => Promise<TaskPage>;
  user: WorkspaceUser;
  signOut: () => Promise<void>;
  /** 语音确认后留档（voice_captures）。 */
  recordVoiceCapture: (input: {
    transcript: string;
    parsed: VoiceParsed[];
    taskCount: number;
    durationSeconds?: number;
  }) => void;
  /** 番茄钟退出时记录实际专注时长，供档案花园和统计页聚合。 */
  recordFocusSession: (input: FocusSessionRecord) => void;
};
const WorkspaceContext = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({
  children,
  initialTasks,
  initialPreferences,
  initialNotifications,
  user,
  recurrenceAvailable,
}: {
  children: ReactNode;
  initialTasks: Task[];
  initialPreferences: Preferences;
  initialNotifications: AppNotification[];
  user: WorkspaceUser;
  recurrenceAvailable: boolean;
}) {
  const [tasks, updateTasks] = useState(() =>
    applyTaskPatches(initialTasks, pendingTaskWrites(user.id)),
  );
  const tasksRef = useRef(tasks);
  // Update the mirror synchronously: async AI checks must see edits before
  // React's next render, without side effects in state updater callbacks.
  const setTasks = useCallback((next: Task[] | ((current: Task[]) => Task[])) => {
    const value = typeof next === "function" ? next(tasksRef.current) : next;
    tasksRef.current = value;
    updateTasks(value);
  }, []);
  const [selectedId, selectTask] = useState<string | null>(null);
  const [quickAdd, updateQuickAdd] = useState<QuickAddPreset | null>(null);
  const [voiceCapture, updateVoiceCapture] = useState<VoiceCaptureState | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [notice, notify] = useState<Notice | null>(null);
  const [preferences, updatePreferences] = useState(initialPreferences);
  const [notifications, updateNotifications] = useState(initialNotifications);
  const [sessionValid, setSessionValid] = useState(true);
  const sessionValidRef = useRef(true);
  const [realtimeStatus, setRealtimeStatus] = useState<WorkspaceRealtimeStatus>("connecting");
  const [taskWritesStorageLimited, setTaskWritesStorageLimited] = useState(false);
  const displayPreferences = usePreferences();
  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((event, session) => {
      // A network interruption can momentarily report no session before storage is
      // restored. Only an explicit sign-out or a different authenticated user ends
      // this workspace; the server-rendered session remains the source of truth.
      if (event === "SIGNED_OUT" || (session && session.user.id !== user.id)) {
        sessionValidRef.current = false;
        setSessionValid(false);
        // 完整导航清理当前用户的任务、弹窗和浏览器内存，跨标签页退出同样生效。
        window.location.replace(LOGIN_REQUIRED_URL);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [user.id]);
  // 调度器在 interval 回调里写通知：用 ref 镜像最新列表做同步去重，避免闭包过期
  const notificationsRef = useRef(initialNotifications);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // 登录态的写穿通道：仓库只在浏览器事件里惰性创建；队列串行执行，
  // 保证「先取消旧 One Thing 再置新的」这类有顺序依赖的写入不违反唯一索引。
  const repositoryRef = useRef<Repository | null>(null);
  const syncRef = useRef<ReturnType<typeof createWorkspaceSync> | null>(null);
  const ensureSync = useCallback(() => {
    syncRef.current ??= createWorkspaceSync({
      getRepository: () => (repositoryRef.current ??= createRepository(createClient(), user.id)),
      isActive: () => sessionValidRef.current,
      getSupplementalTaskIds: () =>
        tasksRef.current.filter((task) => task.completed).map((task) => task.id),
      onSnapshot: (snapshot) => {
        setTasks(applyTaskPatches(snapshot.tasks, pendingTaskWrites(user.id)));
        updatePreferences(snapshot.preferences);
        notificationsRef.current = snapshot.notifications;
        updateNotifications(snapshot.notifications);
      },
      onError: (error, recovery) => {
        console.error(recovery ? "sync recovery failed:" : "sync failed:", error);
        notify({
          key:
            error instanceof Error && error.message === "organization_conflict"
              ? "organize.conflict"
              : error instanceof Error && error.message === "task_conflict"
                ? "sync.conflict"
                : "sync.failed",
        });
      },
    });
    return syncRef.current;
  }, [setTasks, user.id]);
  const persist = useCallback(
    (action: (repository: Repository) => Promise<void>) => {
      if (!sessionValidRef.current) return Promise.resolve();
      return ensureSync().enqueue(action);
    },
    [ensureSync],
  );
  // Retention is a hard delete, while Clear only sets a dismissal marker. This
  // keeps aggregate dedupe records long enough without showing stale messages.
  useEffect(() => {
    let active = true;
    void (async () => {
      await persist((repository) =>
        repository.pruneNotifications(preferences.notificationRetentionDays),
      );
      if (!active) return;
      const cutoff = Date.now() - preferences.notificationRetentionDays * 86_400_000;
      updateNotifications((current) =>
        current.filter((item) => new Date(item.createdAt).getTime() >= cutoff),
      );
    })();
    return () => {
      active = false;
    };
  }, [persist, preferences.notificationRetentionDays]);
  const refreshWorkspace = useCallback(() => {
    if (!sessionValidRef.current) return;
    void ensureSync().refresh();
  }, [ensureSync]);

  const runTaskPageRead = useCallback(
    async (read: (repository: Repository) => Promise<TaskPage>): Promise<TaskPage> => {
      let page: TaskPage | undefined;
      await persist(async (repository) => {
        page = await read(repository);
      });
      return page ?? { tasks: [], total: 0, hasMore: false };
    },
    [persist],
  );

  const loadCompletedTasks = useCallback(
    async (offset?: number, limit?: number) => {
      const page = await runTaskPageRead((repository) =>
        repository.loadCompletedTasks(offset, limit),
      );
      if (page.tasks.length) setTasks((current) => mergeTaskPage(user.id, current, page.tasks));
      return page;
    },
    [runTaskPageRead, setTasks, user.id],
  );

  const loadTasksForDate = useCallback(
    async (date: string) => {
      let tasks: Task[] = [];
      await persist(async (repository) => {
        tasks = await repository.loadTasksByDate(date);
      });
      setTasks((current) => mergeTaskPage(user.id, current, tasks, date));
      return tasks;
    },
    [persist, setTasks, user.id],
  );

  const searchTasks = useCallback(
    async (query: string, offset?: number, limit?: number) => {
      const page = await runTaskPageRead((repository) =>
        repository.searchTasks(query, offset, limit),
      );
      if (page.tasks.length) setTasks((current) => mergeTaskPage(user.id, current, page.tasks));
      return page;
    },
    [runTaskPageRead, setTasks, user.id],
  );

  const flushingRef = useRef(false);
  const queueActiveRef = useRef(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flushTaskWrites = useCallback(async () => {
    if (flushingRef.current || !queueActiveRef.current || !sessionValidRef.current) return;
    flushingRef.current = true;
    let transientFailure = false;
    try {
      while (sessionValidRef.current) {
        const entry = pendingTaskWrites(user.id)[0];
        if (!entry) break;
        await persist(async (repository) => {
          let result = await repository.updateTaskVersioned(
            entry.taskId,
            entry.expectedUpdatedAt,
            entry.patch,
          );
          if (!result) {
            const server = await repository.loadTask(entry.taskId);
            if (!server || !taskPatchMatches(server, entry.patch)) {
              acknowledgeTaskWrite(user.id, entry);
              throw new Error("task_conflict");
            }
            result = { updatedAt: server.updatedAt };
          }
          const child = entry.createRepeatChild
            ? await repository.loadRepeatChild(entry.taskId)
            : null;
          acknowledgeTaskWrite(user.id, entry);
          updateTaskWriteVersion(user.id, entry.taskId, result.updatedAt);
          if (result.updatedAt) {
            setTasks((current) =>
              current.map((task) =>
                task.id === entry.taskId ? { ...task, updatedAt: result.updatedAt } : task,
              ),
            );
          }
          if (child && sessionValidRef.current) {
            setTasks((current) =>
              current.some((task) => task.id === child.id) ? current : [...current, child],
            );
          }
        });
        const nextEntry = pendingTaskWrites(user.id)[0];
        if (nextEntry && sameTaskWrite(nextEntry, entry)) {
          transientFailure = true;
          break;
        }
      }
    } finally {
      flushingRef.current = false;
      setTaskWritesStorageLimited(taskWriteStorageLimited(user.id));
      const pending = pendingTaskWrites(user.id);
      if (
        (transientFailure || pending.length > 0) &&
        queueActiveRef.current &&
        sessionValidRef.current
      ) {
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = undefined;
          void flushTaskWrites();
        }, TASK_WRITE_RETRY_MS);
      }
    }
  }, [persist, setTasks, user.id]);

  const scheduleTaskWriteFlush = useCallback(
    (immediate = false) => {
      if (!queueActiveRef.current || !sessionValidRef.current) return;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = undefined;
      }
      if (immediate) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = undefined;
        }
        void flushTaskWrites();
        return;
      }
      debounceTimerRef.current ??= setTimeout(() => {
        debounceTimerRef.current = undefined;
        void flushTaskWrites();
      }, TASK_WRITE_DEBOUNCE_MS);
    },
    [flushTaskWrites],
  );

  useEffect(() => {
    queueActiveRef.current = true;
    scheduleTaskWriteFlush(true);
    const flushWhenVisible = () => {
      if (document.visibilityState === "visible") scheduleTaskWriteFlush(true);
    };
    window.addEventListener("online", flushWhenVisible);
    document.addEventListener("visibilitychange", flushWhenVisible);
    return () => {
      queueActiveRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      debounceTimerRef.current = undefined;
      retryTimerRef.current = undefined;
      window.removeEventListener("online", flushWhenVisible);
      document.removeEventListener("visibilitychange", flushWhenVisible);
    };
  }, [scheduleTaskWriteFlush]);

  useEffect(() => {
    const client = createClient();
    const realtime = createWorkspaceRealtime({
      getClient: () => client,
      getAccessToken: async () => {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (!data.session || data.session.user.id !== user.id) return null;
        return data.session.access_token;
      },
      userId: user.id,
      onStatus: setRealtimeStatus,
      requestRefresh: refreshWorkspace,
      onError: (error) => console.error("realtime failed:", error),
    });
    return () => realtime.stop();
  }, [refreshWorkspace, user.id]);

  const recordFocusSession = useCallback(
    (input: FocusSessionRecord) => {
      if (input.durationSeconds <= 0) return;
      savePendingFocusSession(user.id, input);
      void persist(async (repository) => {
        await repository.recordFocusSession(input);
        acknowledgeFocusSession(user.id, input);
      });
    },
    [persist, user.id],
  );

  useEffect(() => {
    for (const input of pendingFocusSessions(user.id)) recordFocusSession(input);
  }, [user.id, recordFocusSession]);

  const writeTaskDirectly = useCallback(
    (taskId: string, patch: Partial<Task>) => {
      void persist(async (repository) => {
        const live = tasksRef.current.find((task) => task.id === taskId);
        if (!live) return;
        const result = await repository.updateTaskVersioned(taskId, live.updatedAt, patch);
        if (!result) throw new Error("task_conflict");
        updateTaskWriteVersion(user.id, taskId, result.updatedAt);
        if (result.updatedAt) {
          setTasks((current) =>
            current.map((task) =>
              task.id === taskId ? { ...task, updatedAt: result.updatedAt } : task,
            ),
          );
        }
      });
    },
    [persist, setTasks, user.id],
  );

  const writeOneThingDirectly = useCallback(
    (taskId: string, patch: Partial<Task>, previousFeaturedIds: string[]) => {
      void persist(async (repository) => {
        for (const otherId of previousFeaturedIds) {
          const live = tasksRef.current.find((task) => task.id === otherId);
          if (!live) continue;
          const result = await repository.updateTaskVersioned(otherId, live.updatedAt, {
            featured: false,
          });
          if (!result) throw new Error("task_conflict");
          updateTaskWriteVersion(user.id, otherId, result.updatedAt);
          if (result.updatedAt) {
            setTasks((current) =>
              current.map((task) =>
                task.id === otherId ? { ...task, updatedAt: result.updatedAt } : task,
              ),
            );
          }
        }
        const live = tasksRef.current.find((task) => task.id === taskId);
        if (!live) return;
        const result = await repository.updateTaskVersioned(taskId, live.updatedAt, patch);
        if (!result) throw new Error("task_conflict");
        updateTaskWriteVersion(user.id, taskId, result.updatedAt);
        if (result.updatedAt) {
          setTasks((current) =>
            current.map((task) =>
              task.id === taskId ? { ...task, updatedAt: result.updatedAt } : task,
            ),
          );
        }
      });
    },
    [persist, setTasks, user.id],
  );

  function queueTaskWrite(entry: TaskWriteEntry) {
    enqueueTaskWrite(user.id, entry);
    setTaskWritesStorageLimited(taskWriteStorageLimited(user.id));
  }

  function updateTask(id: string, patch: Partial<Task>) {
    if (Object.hasOwn(patch, "repeatIntervalDays") && !recurrenceAvailable) {
      notify({ key: "repeat.migrationNeeded" });
      return;
    }
    const previousTasks = tasksRef.current;
    const current = previousTasks.find((task) => task.id === id);
    if (!current) return;
    const normalized = normalizeFocusPatch(
      current,
      patch,
      getTodayKey(undefined, preferences.timeZone),
    );
    if (!normalized) {
      notify({ key: "today.focusTodayOnly" });
      return;
    }
    patch = normalized;
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== id && patch.featured === true && task.featured) {
          return { ...task, featured: false };
        }
        if (task.id !== id) return task;
        return applyTaskPatch(task, patch);
      }),
    );

    // One Thing 的唯一索引要求先取消旧值再设置新值，不能进入按任务合并的队列。
    if (patch.featured === true) {
      scheduleTaskWriteFlush(true);
      writeOneThingDirectly(
        id,
        patch,
        previousTasks.filter((task) => task.featured && task.id !== id).map((task) => task.id),
      );
      return;
    }
    if (patch.featured !== undefined) {
      scheduleTaskWriteFlush(true);
      writeTaskDirectly(id, patch);
      return;
    }
    queueTaskWrite({
      id: createId(),
      taskId: id,
      expectedUpdatedAt: current.updatedAt,
      patch,
    });
    scheduleTaskWriteFlush(URGENT_TASK_FIELDS.some((field) => Object.hasOwn(patch, field)));
  }

  async function applyTaskOrganization(expected: Task[], suggestions: TaskOrganizationDraft[]) {
    const result = { applied: 0, skipped: 0, failed: 0 };
    const byId = new Map(expected.map((task) => [task.id, task]));
    for (const suggestion of suggestions) {
      if (organizationDraftError(suggestion)) {
        result.failed++;
        continue;
      }
      const original = byId.get(suggestion.id);
      const checkDetails = hasOrganizationDetailEdits(suggestion);
      if (
        !original ||
        !isOrganizationCandidateCurrent(
          original,
          tasksRef.current.find((task) => task.id === suggestion.id),
          checkDetails,
        )
      ) {
        result.skipped++;
        continue;
      }
      const patch = organizationPatch(suggestion, original, preferences.duration);
      await persist(async (repository) => {
        if (
          !isOrganizationCandidateCurrent(
            original,
            tasksRef.current.find((task) => task.id === original.id),
            checkDetails,
          )
        ) {
          result.skipped++;
          return;
        }
        let applied: { updatedAt?: string } | null;
        try {
          applied = await repository.applyTaskOrganization(original, patch);
        } catch (error) {
          result.failed++;
          throw error;
        }
        if (!applied) {
          result.skipped++;
          throw new Error("organization_conflict");
        }
        const updatedAt = applied.updatedAt;
        result.applied++;
        setTasks((current) =>
          current.map((task) => {
            if (
              task.id !== original.id ||
              !isOrganizationCandidateCurrent(original, task, checkDetails)
            )
              return task;
            return { ...task, ...patch, ...(updatedAt ? { updatedAt } : {}) };
          }),
        );
      });
    }
    return result;
  }
  async function applyTaskAdvice(expected: Task[], suggestions: AiAdvisorDraft[]) {
    const result = { applied: 0, skipped: 0, failed: 0 };
    const byId = new Map(expected.map((task) => [task.id, task]));
    for (const suggestion of suggestions) {
      const original = byId.get(suggestion.id);
      if (
        !original ||
        !isOrganizationCandidateCurrent(
          original,
          tasksRef.current.find((task) => task.id === original.id),
          true,
        )
      ) {
        result.skipped++;
        continue;
      }
      if (
        !Number.isInteger(suggestion.estimate) ||
        suggestion.estimate < 1 ||
        suggestion.estimate > 16 ||
        suggestion.subtasks.length > 6 ||
        suggestion.subtasks.some((title) => !title.trim() || title.length > 120)
      ) {
        result.failed++;
        continue;
      }
      const patch: Partial<Task> = {
        estimate: suggestion.estimate,
        ...(original.subtasks.length === 0
          ? {
              subtasks: suggestion.subtasks.map((title) => ({
                id: createId(),
                title,
                completed: false,
              })),
            }
          : {}),
      };
      let settled = false;
      await persist(async (repository) => {
        if (
          !isOrganizationCandidateCurrent(
            original,
            tasksRef.current.find((task) => task.id === original.id),
            true,
          ) ||
          pendingTaskWrites(user.id).some((entry) => entry.taskId === original.id)
        ) {
          result.skipped++;
          settled = true;
          return;
        }
        try {
          const saved = await repository.applyTaskOrganization(original, patch);
          settled = true;
          if (!saved) {
            result.skipped++;
            throw new Error("organization_conflict");
          }
          result.applied++;
          setTasks((current) =>
            current.map((task) =>
              task.id === original.id && isOrganizationCandidateCurrent(original, task, true)
                ? { ...task, ...patch, updatedAt: saved.updatedAt }
                : task,
            ),
          );
        } catch (error) {
          if (!settled) result.failed++;
          settled = true;
          throw error;
        }
      });
      if (!settled) result.failed++;
    }
    return result;
  }
  function addTask(title: string, list: TaskList = "Inbox", date = "", time?: string) {
    if (!title.trim()) return;
    const id = createId();
    const [hour, minute] = (time ?? "").split(":").map(Number);
    const task: Task = {
      id,
      title: title.trim(),
      description: "",
      list,
      tags: [],
      date,
      time,
      schedule:
        date && time ? { date, hour, minute, duration: 25, label: title.trim() } : undefined,
      priority: 3,
      estimate: 1,
      reminder:
        date && time && preferences.defaultReminderMinutes > 0
          ? `${preferences.defaultReminderMinutes} min before`
          : "None",
      completed: false,
      created: Date.now(),
      subtasks: [],
    };
    setTasks((current) => [...current, task]);
    persist((repository) => repository.createTask(task));
    notify({ key: "tasks.added", values: { list, date: date ? ` · ${date}` : "" } });
    return id;
  }
  function toggleTask(id: string) {
    const task = tasksRef.current.find((item) => item.id === id);
    if (!task) return;
    const patch = taskCompletionPatch(task);
    setTasks((current) =>
      current.map((item) => (item.id === id ? applyTaskPatch(item, patch) : item)),
    );
    queueTaskWrite({
      id: createId(),
      taskId: id,
      expectedUpdatedAt: task.updatedAt,
      patch,
      createRepeatChild: patch.completed && !!task.repeatIntervalDays,
    });
    scheduleTaskWriteFlush(true);
  }
  async function saveCapturedTasks(drafts: TaskCaptureDraft[]): Promise<CaptureSaveResult> {
    const result: CaptureSaveResult = { savedIds: [], failedIds: [] };
    for (const draft of drafts) {
      if (!sessionValidRef.current || captureDraftError(draft, preferences.timeZone)) {
        result.failedIds.push(draft.id);
        continue;
      }
      const task = capturedTask(
        draft,
        preferences.duration,
        Date.now(),
        preferences.defaultReminderMinutes,
      );
      setTasks((current) =>
        current.some((item) => item.id === draft.id) ? current : [...current, task],
      );
      await persist(async (repository) => {
        try {
          await repository.createTask(task);
          result.savedIds.push(draft.id);
        } catch (error) {
          result.failedIds.push(draft.id);
          throw error;
        }
      });
      if (!result.savedIds.includes(draft.id) && !result.failedIds.includes(draft.id))
        result.failedIds.push(draft.id);
    }
    notify({
      key: "capture.saveResult",
      values: { saved: String(result.savedIds.length), failed: String(result.failedIds.length) },
    });
    return result;
  }
  function toggleSubtask(taskId: string, subtaskId: string) {
    const task = tasksRef.current.find((item) => item.id === taskId);
    if (!task) return;
    const subtasks = task.subtasks.map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
    );
    setTasks((current) =>
      current.map((item) => (item.id === taskId ? applyTaskPatch(item, { subtasks }) : item)),
    );
    queueTaskWrite({
      id: createId(),
      taskId,
      expectedUpdatedAt: task.updatedAt,
      patch: { subtasks },
    });
    scheduleTaskWriteFlush(true);
  }
  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
    notificationsRef.current = notificationsRef.current.filter((item) => item.taskId !== id);
    updateNotifications(notificationsRef.current);
    selectTask(null);
    persist((repository) => repository.deleteTask(id));
    notify({ key: "tasks.deleted" });
  }
  /** 生成任务到期通知；已存在（本地去重 + 数据库唯一索引）返回 false 不重复提示 */
  function recordTaskDueNotification({
    taskId,
    title,
    remindAt,
  }: {
    taskId: string;
    title: string;
    remindAt: string;
  }) {
    const dedupeKey = `task:${taskId}:${remindAt}`;
    if (notificationsRef.current.some((item) => item.dedupeKey === dedupeKey)) return false;
    const notification: AppNotification = {
      id: createId(),
      type: "task_due",
      taskId,
      dedupeKey,
      title,
      remindAt,
      read: false,
      createdAt: new Date().toISOString(),
    };
    notificationsRef.current = [notification, ...notificationsRef.current];
    updateNotifications(notificationsRef.current);
    persist((repository) => repository.createTaskDueNotification(notification));
    return true;
  }

  function recordDailyDigestNotification({
    date,
    count,
    remindAt,
  }: {
    date: string;
    count: number;
    remindAt: string;
  }) {
    const dedupeKey = `daily-digest:${date}`;
    if (notificationsRef.current.some((item) => item.dedupeKey === dedupeKey)) return false;
    const notification: AppNotification = {
      id: createId(),
      type: "daily_digest",
      dedupeKey,
      title: count > 0 ? `今天有 ${count} 项安排` : "今天没有已安排事项",
      remindAt,
      read: false,
      createdAt: new Date().toISOString(),
    };
    notificationsRef.current = [notification, ...notificationsRef.current];
    updateNotifications(notificationsRef.current);
    persist((repository) => repository.createDailyDigestNotification(notification));
    return true;
  }
  function markNotificationRead(id: string) {
    const notification = notificationsRef.current.find((item) => item.id === id);
    if (!notification) return;
    notificationsRef.current = notificationsRef.current.map((item) =>
      item.id === id ? { ...item, read: true } : item,
    );
    updateNotifications(notificationsRef.current);
    persist((repository) => repository.markNotificationRead(id));
  }
  function markAllNotificationsRead() {
    notificationsRef.current = notificationsRef.current.map((item) => ({ ...item, read: true }));
    updateNotifications(notificationsRef.current);
    persist((repository) => repository.markAllNotificationsRead());
  }

  function clearNotifications() {
    if (!notificationsRef.current.some((item) => !item.dismissedAt)) return;
    const dismissedAt = new Date().toISOString();
    notificationsRef.current = notificationsRef.current.map((item) =>
      item.dismissedAt ? item : { ...item, dismissedAt, read: true },
    );
    updateNotifications(notificationsRef.current);
    persist((repository) => repository.dismissAllNotifications());
  }

  async function signOut() {
    try {
      // local：仅注销当前设备会话（默认 global 会把所有设备一起踢下线）
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) throw error;
    } catch (error) {
      console.error("sign out failed:", error);
      // 失败时留在当前页并提示，避免用户误以为已退出
      notify({ key: "退出登录失败，请重试" });
      return;
    }
    window.location.replace(LOGIN_REQUIRED_URL);
  }
  if (!sessionValid) return null;

  return (
    <WorkspaceContext.Provider
      value={{
        recurrenceAvailable,
        tasks,
        updateTask,
        applyTaskOrganization,
        applyTaskAdvice,
        addTask,
        saveCapturedTasks,
        toggleTask,
        toggleSubtask,
        deleteTask,
        selectedId,
        selectTask,
        quickAdd,
        setQuickAdd: (preset) =>
          updateQuickAdd(typeof preset === "string" ? { list: preset } : preset),
        voiceCapture,
        setVoiceCapture: updateVoiceCapture,
        searchOpen,
        setSearchOpen,
        focusId,
        startFocus: (id) => {
          selectTask(null);
          setFocusId(id);
        },
        stopFocus: () => setFocusId(null),
        preferences,
        notifications: notifications.filter((item) => !item.dismissedAt),
        recordTaskDueNotification,
        recordDailyDigestNotification,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotifications,
        setPreferences: (patch) => {
          updatePreferences((current) => ({ ...current, ...patch }));
          persist((repository) => repository.savePreferences(patch));
        },
        notice,
        notify,
        realtimeStatus,
        taskWritesStorageLimited,
        loadCompletedTasks,
        loadTasksForDate,
        searchTasks,
        user,
        signOut,
        recordVoiceCapture: (input) =>
          persist((repository) => repository.recordVoiceCapture(input)),
        recordFocusSession,
      }}
    >
      <PreferencesProvider
        initialLocale={displayPreferences.locale}
        initialTheme={displayPreferences.theme}
        initialTimeZone={preferences.timeZone}
        initialHour12={preferences.hour12}
      >
        {children}
      </PreferencesProvider>
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return context;
}
