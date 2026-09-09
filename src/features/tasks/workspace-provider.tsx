"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Task, TaskList } from "@/types/task";
import { initialTasks } from "./demo-data";

type Preferences = {
  firstDay: "Monday" | "Sunday";
  sound: boolean;
  duration: number;
  autoBreak: boolean;
  dailyCapacity: number;
  reminders: boolean;
};
type WorkspaceState = {
  tasks: Task[];
  updateTask: (id: string, patch: Partial<Task>) => void;
  addTask: (title: string, list?: TaskList, date?: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  selectedId: string | null;
  selectTask: (id: string | null) => void;
  quickAdd: TaskList | null;
  setQuickAdd: (list: TaskList | null) => void;
  focusId: string | null;
  startFocus: (id: string) => void;
  stopFocus: () => void;
  preferences: Preferences;
  setPreferences: (patch: Partial<Preferences>) => void;
  notice: string;
  notify: (message: string) => void;
};
const WorkspaceContext = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedId, selectTask] = useState<string | null>(null);
  const [quickAdd, setQuickAdd] = useState<TaskList | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [notice, notify] = useState("");
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
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              ...patch,
              schedule: task.schedule
                ? {
                    ...task.schedule,
                    ...(patch.title ? { label: patch.title } : {}),
                    ...(patch.date !== undefined ? { date: patch.date } : {}),
                  }
                : undefined,
            }
          : task,
      ),
    );
  }
  function addTask(title: string, list: TaskList = "Inbox", date = "") {
    if (!title.trim()) return;
    setTasks((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        description: "",
        list,
        date,
        priority: 3,
        estimate: 1,
        reminder: "None",
        completed: false,
        inWorkList: list === "Work",
        created: Date.now(),
        subtasks: [],
      },
    ]);
    notify(`已添加至 ${list}${date ? ` · ${date}` : ""}`);
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
  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
    selectTask(null);
    notify("任务已从本次预览中删除");
  }
  return (
    <WorkspaceContext.Provider
      value={{
        tasks,
        updateTask,
        addTask,
        toggleTask,
        deleteTask,
        selectedId,
        selectTask,
        quickAdd,
        setQuickAdd,
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
