"use client";
import type { MessageKey } from "@/i18n/messages";
import type { MessageValues } from "@/i18n/translate";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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

type Notice = { key: MessageKey; values?: MessageValues };
export type QuickAddPreset = { list: TaskList; date?: string; time?: string; title?: string };
/** 登录用户摘要：服务端验证会话后注入。 */
export type WorkspaceUser = { id: string; email: string; displayName: string };

type WorkspaceState = {
  tasks: Task[];
  updateTask: (id: string, patch: Partial<Task>) => void;
  addTask: (title: string, list?: TaskList, date?: string, time?: string) => string | undefined;
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
  recordFocusSession: (input: {
    taskId: string;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    completed: boolean;
  }) => void;
};
const WorkspaceContext = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({
  children,
  initialTasks,
  initialPreferences,
  initialNotifications,
  user,
}: {
  children: ReactNode;
  initialTasks: Task[];
  initialPreferences: Preferences;
  initialNotifications: AppNotification[];
  user: WorkspaceUser;
}) {
  const [tasks, setTasks] = useState(initialTasks);
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
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const syncRevisionRef = useRef(0);
  const reconciliationNeededRef = useRef(false);
  function persist(action: (repository: Repository) => Promise<void>) {
    if (!sessionValidRef.current) return;
    repositoryRef.current ??= createRepository(createClient(), user.id);
    const repository = repositoryRef.current;
    const revision = ++syncRevisionRef.current;
    queueRef.current = queueRef.current
      .then(() => {
        if (sessionValidRef.current) return action(repository);
      })
      .catch((error: unknown) => {
        console.error("sync failed:", error);
        reconciliationNeededRef.current = true;
        notify({ key: "sync.failed" });
      })
      .then(async () => {
        // 等这批队列的最后一项结束再回读，避免旧请求失败时覆盖后续乐观更新。
        if (
          !sessionValidRef.current ||
          !reconciliationNeededRef.current ||
          revision !== syncRevisionRef.current
        )
          return;
        try {
          const [serverTasks, serverPreferences, serverNotifications] = await Promise.all([
            repository.loadTasks(),
            repository.loadPreferences(),
            repository.listNotifications(),
          ]);
          setTasks(serverTasks);
          updatePreferences(serverPreferences);
          notificationsRef.current = serverNotifications;
          updateNotifications(serverNotifications);
          reconciliationNeededRef.current = false;
        } catch (reloadError) {
          console.error("sync recovery failed:", reloadError);
        }
      });
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== id && patch.featured === true && task.featured) {
          return { ...task, featured: false };
        }
        if (task.id !== id) return task;

        const nextDate = patch.date !== undefined ? patch.date : task.date;
        const timeChanged = Object.hasOwn(patch, "time");
        const nextTime = nextDate ? (timeChanged ? patch.time : task.time) : undefined;
        let schedule = task.schedule;

        if (timeChanged) {
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
      for (const other of tasks) {
        if (other.featured && other.id !== id) {
          const otherId = other.id;
          persist((repository) => repository.updateTask(otherId, { featured: false }));
        }
      }
    }
    persist((repository) => repository.updateTask(id, patch));
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
    const task = tasks.find((item) => item.id === id);
    const completed = task ? !task.completed : true;
    const patch = { completed, completedAt: completed ? new Date().toISOString() : undefined };
    setTasks((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    persist((repository) => repository.updateTask(id, patch));
  }
  function toggleSubtask(taskId: string, subtaskId: string) {
    const task = tasks.find((item) => item.id === taskId);
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
    updateNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
    persist((repository) => repository.markNotificationRead(id));
  }
  function markAllNotificationsRead() {
    updateNotifications((current) => current.map((item) => ({ ...item, read: true })));
    persist((repository) => repository.markAllNotificationsRead());
  }

  function clearNotifications() {
    const ids = notificationsRef.current.filter((item) => !item.dismissedAt).map((item) => item.id);
    if (!ids.length) return;
    const dismissedAt = new Date().toISOString();
    notificationsRef.current = notificationsRef.current.map((item) =>
      item.dismissedAt ? item : { ...item, dismissedAt, read: true },
    );
    updateNotifications(notificationsRef.current);
    persist((repository) => repository.dismissNotifications(ids));
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
        tasks,
        updateTask,
        addTask,
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
        recordFocusSession: (input) =>
          persist((repository) => repository.recordFocusSession(input)),
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
