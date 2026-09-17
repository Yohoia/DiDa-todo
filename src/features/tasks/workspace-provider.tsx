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
} from "@/lib/data/repository";
import { createClient } from "@/lib/supabase/client";
import { LOGIN_REQUIRED_URL } from "@/lib/workspace-access";
import { createWorkspaceSync } from "./workspace-sync";
import { taskCompletionPatch } from "./task-completion";
import { getTodayKey } from "@/lib/date-utils";
import { normalizeFocusPatch } from "./task-focus";
import { isOrganizationCandidateCurrent, organizationPatch } from "@/lib/data/task-organization";
import type { TaskOrganizationDraft } from "@/types/task-organization";
import { organizationDraftError } from "./organization-editor";
import {
  captureDraftError,
  capturedTask,
  type TaskCaptureDraft,
  type CaptureSaveResult,
} from "./task-capture";
import type { FocusSessionRecord } from "@/types/focus";
import {
  pendingFocusSessions,
  savePendingFocusSession,
  acknowledgeFocusSession,
} from "@/features/focus/focus-journal";

type Notice = { key: MessageKey; values?: MessageValues };
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
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  notice: Notice | null;
  notify: (message: Notice | null) => void;
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
  const [tasks, updateTasks] = useState(initialTasks);
  const tasksRef = useRef(initialTasks);
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
  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((_event, session) => {
      if (!session || session.user.id !== user.id) {
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
  const persist = useCallback(
    (action: (repository: Repository) => Promise<void>) => {
      if (!sessionValidRef.current) return Promise.resolve();
      syncRef.current ??= createWorkspaceSync({
        getRepository: () => (repositoryRef.current ??= createRepository(createClient(), user.id)),
        isActive: () => sessionValidRef.current,
        onSnapshot: (snapshot) => {
          setTasks(snapshot.tasks);
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
                : "sync.failed",
          });
        },
      });
      return syncRef.current.enqueue(action);
    },
    [user.id, setTasks],
  );

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

  function updateTask(id: string, patch: Partial<Task>) {
    if (Object.hasOwn(patch, "repeatIntervalDays") && !recurrenceAvailable) {
      notify({ key: "repeat.migrationNeeded" });
      return;
    }
    const previousTasks = tasksRef.current;
    const current = previousTasks.find((task) => task.id === id);
    if (!current) return;
    const normalized = normalizeFocusPatch(current, patch, getTodayKey());
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

        const nextDate = patch.date !== undefined ? patch.date : task.date;
        const timeChanged = Object.hasOwn(patch, "time");
        // An explicit clock time can exist on an undated capture. Only clearing
        // the date deliberately removes it; unrelated edits must preserve it.
        const nextTime = patch.date === "" ? undefined : timeChanged ? patch.time : task.time;
        let schedule = task.schedule;

        if (timeChanged || (!schedule && nextDate && nextTime)) {
          if (nextTime && nextDate) {
            const [hour, minute] = nextTime.split(":").map(Number);
            schedule = {
              date: nextDate,
              hour,
              minute,
              duration: task.schedule?.duration ?? Math.max(25, task.estimate * 25),
              label: patch.title ?? task.title,
            };
          } else {
            schedule = undefined;
          }
        } else if (schedule) {
          schedule = nextDate
            ? {
                ...schedule,
                ...(patch.title ? { label: patch.title } : {}),
                ...(patch.date !== undefined ? { date: patch.date } : {}),
              }
            : undefined;
        }

        return { ...task, ...patch, time: nextTime, schedule };
      }),
    );
    // 置新 One Thing 前先排队取消旧的（tasks 里仍 featured 的其他任务）
    if (patch.featured === true) {
      for (const other of previousTasks) {
        if (other.featured && other.id !== id) {
          const otherId = other.id;
          persist((repository) => repository.updateTask(otherId, { featured: false }));
        }
      }
    }
    persist((repository) => repository.updateTask(id, patch));
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
      if (
        !original ||
        !isOrganizationCandidateCurrent(
          original,
          tasksRef.current.find((task) => task.id === suggestion.id),
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
          )
        ) {
          result.skipped++;
          return;
        }
        let applied: boolean;
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
        result.applied++;
        setTasks((current) =>
          current.map((task) => {
            if (task.id !== original.id || !isOrganizationCandidateCurrent(original, task))
              return task;
            return { ...task, ...patch };
          }),
        );
      });
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
      reminder: "None",
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
    setTasks((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    persist(async (repository) => {
      await repository.updateTask(id, patch);
      if (patch.completed && task.repeatIntervalDays) {
        const child = await repository.loadRepeatChild(id);
        if (child && sessionValidRef.current)
          setTasks((current) =>
            current.some((item) => item.id === child.id) ? current : [...current, child],
          );
      }
    });
  }
  async function saveCapturedTasks(drafts: TaskCaptureDraft[]): Promise<CaptureSaveResult> {
    const result: CaptureSaveResult = { savedIds: [], failedIds: [] };
    for (const draft of drafts) {
      if (!sessionValidRef.current || captureDraftError(draft)) {
        result.failedIds.push(draft.id);
        continue;
      }
      const task = capturedTask(draft, preferences.duration);
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
      current.map((item) => (item.id === taskId ? { ...item, subtasks } : item)),
    );
    persist((repository) => repository.updateTask(taskId, { subtasks }));
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
    if (notificationsRef.current.some((item) => item.taskId === taskId)) return false;
    const notification: AppNotification = {
      id: createId(),
      type: "task_due",
      taskId,
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
  function markNotificationRead(id: string) {
    const notification = notificationsRef.current.find((item) => item.id === id);
    if (!notification) return;
    notificationsRef.current = notificationsRef.current.map((item) =>
      item.id === id ? { ...item, read: true } : item,
    );
    updateNotifications(notificationsRef.current);
    persist((repository) => repository.markTaskNotificationRead(notification.taskId));
  }
  function markAllNotificationsRead() {
    notificationsRef.current = notificationsRef.current.map((item) => ({ ...item, read: true }));
    updateNotifications(notificationsRef.current);
    persist((repository) => repository.markAllNotificationsRead());
  }

  function clearNotifications() {
    const taskIds = notificationsRef.current
      .filter((item) => !item.dismissedAt)
      .map((item) => item.taskId);
    if (!taskIds.length) return;
    const dismissedAt = new Date().toISOString();
    notificationsRef.current = notificationsRef.current.map((item) =>
      item.dismissedAt ? item : { ...item, dismissedAt, read: true },
    );
    updateNotifications(notificationsRef.current);
    persist((repository) => repository.dismissTaskNotifications(taskIds));
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
        markNotificationRead,
        markAllNotificationsRead,
        clearNotifications,
        setPreferences: (patch) => {
          updatePreferences((current) => ({ ...current, ...patch }));
          persist((repository) => repository.savePreferences(patch));
        },
        notice,
        notify,
        user,
        signOut,
        recordVoiceCapture: (input) =>
          persist((repository) => repository.recordVoiceCapture(input)),
        recordFocusSession,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return context;
}
