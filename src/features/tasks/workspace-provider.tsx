"use client";
import type { MessageKey } from "@/i18n/messages";
import type { MessageValues } from "@/i18n/translate";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Task, TaskList } from "@/types/task";
import { createId } from "@/lib/utils";
import { initialTasks } from "./demo-data";

type Preferences = {
  firstDay: "Monday" | "Sunday";
  sound: boolean;
  duration: number;
  autoBreak: boolean;
  dailyCapacity: number;
  reminders: boolean;
};
type Notice = { key: MessageKey; values?: MessageValues };
export type QuickAddPreset = { list: TaskList; date?: string; time?: string };

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
  /** 语音速记：悬浮在导航栏上方的听写条，说完自动落入指定清单。 */
  voiceCapture: QuickAddPreset | null;
  setVoiceCapture: (preset: QuickAddPreset | null) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  focusId: string | null;
  startFocus: (id: string) => void;
  stopFocus: () => void;
  preferences: Preferences;
  setPreferences: (patch: Partial<Preferences>) => void;
  notice: Notice | null;
  notify: (message: Notice | null) => void;
};
const WorkspaceContext = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedId, selectTask] = useState<string | null>(null);
  const [quickAdd, updateQuickAdd] = useState<QuickAddPreset | null>(null);
  const [voiceCapture, updateVoiceCapture] = useState<QuickAddPreset | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [notice, notify] = useState<Notice | null>(null);
  const [preferences, updatePreferences] = useState<Preferences>({
    firstDay: "Monday",
    sound: true,
    duration: 25,
    autoBreak: false,
    dailyCapacity: 8,
    reminders: true,
  });

  function updateTask(id: string, patch: Partial<Task>) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== id && patch.featured === true && task.featured) {
          return { ...task, featured: false };
        }
        if (task.id !== id) return task;

        const nextDate = patch.date !== undefined ? patch.date : task.date;
        const timeChanged = Object.hasOwn(patch, "time");
        const nextTime = timeChanged ? patch.time : task.time;
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

        // If setting this task as featured, unfeatured all others
        if (patch.featured === true) {
          return {
            ...task,
            ...patch,
            schedule,
          };
        }
        return { ...task, ...patch, schedule };
      }),
    );
  }
  function addTask(title: string, list: TaskList = "Inbox", date = "", time?: string) {
    if (!title.trim()) return;
    const id = createId();
    const [hour, minute] = (time ?? "").split(":").map(Number);
    setTasks((current) => [
      ...current,
      {
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
        inWorkList: list === "Work",
        created: Date.now(),
        subtasks: [],
      },
    ]);
    notify({ key: "tasks.added", values: { list, date: date ? ` · ${date}` : "" } });
    return id;
  }
  function toggleTask(id: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed,
              completedAt: task.completed ? undefined : new Date().toISOString(),
            }
          : task,
      ),
    );
  }
  function toggleSubtask(taskId: string, subtaskId: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((subtask) =>
                subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
              ),
            }
          : task,
      ),
    );
  }
  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
    selectTask(null);
    notify({ key: "tasks.deleted" });
  }
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
        setPreferences: (patch) => updatePreferences((current) => ({ ...current, ...patch })),
        notice,
        notify,
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
