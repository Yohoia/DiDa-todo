"use client";

import { useState } from "react";
import { BriefcaseBusiness, Plus } from "lucide-react";
import { TaskRow } from "@/components/task/task-row";
import { EmptyState } from "@/components/shared/workspace-ui";
import { useWorkspace } from "./workspace-provider";
import { cn } from "@/lib/utils";
import type { TaskList } from "@/types/task";
import styles from "@/styles/workspace.module.css";

export function ListPage() {
  const { tasks, selectTask, toggleTask, setQuickAdd } = useWorkspace();
  const [sort, setSort] = useState("priority");
  const [collection, setCollection] = useState("project");
  const list: TaskList =
    collection === "project" || collection === "Work" ? "Work" : (collection as TaskList);
  const listTasks = tasks.filter((task) =>
    collection === "project" ? task.inWorkList && task.list === "Work" : task.list === list,
  );
  const title =
    collection === "project"
      ? "Work & Projects"
      : collection === "Work"
        ? "All Work"
        : collection === "Study"
          ? "Study & Learning"
          : "Life & Personal";
  const active = listTasks
    .filter((task) => !task.completed)
    .sort((a, b) =>
      sort === "priority"
        ? a.priority - b.priority
        : sort === "date"
          ? (a.date || "9999").localeCompare(b.date || "9999")
          : b.created - a.created,
    );
  const completed = listTasks.filter((task) => task.completed).length;
  return (
    <div className={cn(styles.page, styles.narrow)}>
      <header className={cn(styles.row, "border-b border-border pb-5")}>
        <div className="flex items-center gap-3">
          <span className="flex size-[42px] shrink-0 items-center justify-center rounded-lg bg-foreground text-white">
            <BriefcaseBusiness size={21} strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="font-serif text-[2rem]">{title}</h1>
            <p className={styles.muted}>
              {active.length} active tasks ·{" "}
              {listTasks.length ? Math.round((completed / listTasks.length) * 100) : 0}% completed
              this week
            </p>
          </div>
        </div>
        <button className={styles.button} onClick={() => setQuickAdd(list)}>
          <Plus size={14} /> Add Task
        </button>
      </header>
      <div className={styles.row}>
        <select
          aria-label="选择清单"
          className={styles.select}
          value={collection}
          onChange={(event) => setCollection(event.target.value)}
        >
          <option value="project">Work & Projects</option>
          <option value="Work">All Work</option>
          <option value="Study">Study</option>
          <option value="Life">Life</option>
        </select>
        <label className={styles.muted}>
          Sort by:{" "}
          <select
            className={styles.select}
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="priority">Priority (High to Low)</option>
            <option value="date">Due Date</option>
            <option value="created">Creation Date</option>
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-2.5">
        {active.map((task) => (
          <TaskRow
            key={task.id}
            variant="list"
            task={task}
            onOpen={() => selectTask(task.id)}
            onToggle={() => toggleTask(task.id)}
          />
        ))}
        {!active.length && (
          <EmptyState title="All caught up">Add a task when your next idea arrives.</EmptyState>
        )}
      </div>
    </div>
  );
}
