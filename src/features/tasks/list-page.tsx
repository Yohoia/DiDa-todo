"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { useState } from "react";
import { HiBriefcase, HiPlus } from "react-icons/hi2";
import { AnimatePresence, motion } from "framer-motion";
import { TaskRow } from "@/components/task/task-row";
import { EmptyState } from "@/components/shared/workspace-ui";
import { useWorkspace } from "./workspace-provider";
import { cn } from "@/lib/utils";
import type { TaskList } from "@/types/task";
import styles from "@/styles/workspace.module.css";

export function ListPage() {
  const { t } = useI18n();
  const { tasks, selectTask, toggleTask, toggleSubtask, setQuickAdd, updateTask } = useWorkspace();
  const [sort, setSort] = useState("priority");
  const [collection, setCollection] = useState("project");
  const list: TaskList =
    collection === "project" || collection === "Work" ? "Work" : (collection as TaskList);
  const listTasks = tasks.filter((task) =>
    collection === "project" ? task.inWorkList && task.list === "Work" : task.list === list,
  );
  const title =
    collection === "project"
      ? t("Work & Projects")
      : collection === "Work"
        ? t("All Work")
        : collection === "Study"
          ? t("Study & Learning")
          : t("Life & Personal");
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
          <span className="flex size-[42px] shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
            <HiBriefcase size={21} />
          </span>
          <div>
            <h1 className="font-serif text-[2rem]">{title}</h1>
            <p className={styles.muted}>
              {t("tasks.listCount", {
                count: active.length,
                percent: listTasks.length ? Math.round((completed / listTasks.length) * 100) : 0,
              })}
            </p>
          </div>
        </div>
        <motion.button
          className={styles.button}
          onClick={() => setQuickAdd(list)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <HiPlus size={14} /> {t("Add Task")}
        </motion.button>
      </header>
      <div className={styles.row}>
        <select
          aria-label={t("选择清单")}
          className={styles.select}
          value={collection}
          onChange={(event) => setCollection(event.target.value)}
        >
          <option value="project">{t("Work & Projects")}</option>
          <option value="Work">{t("All Work")}</option>
          <option value="Study">{t("Study")}</option>
          <option value="Life">{t("Life")}</option>
        </select>
        <label className={styles.muted}>
          {t("Sort by:")}{" "}
          <select
            className={styles.select}
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="priority">{t("Priority (High to Low)")}</option>
            <option value="date">{t("Due Date")}</option>
            <option value="created">{t("Creation Date")}</option>
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-2.5">
        <AnimatePresence mode="popLayout">
          {active.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onOpen={() => selectTask(task.id)}
              onToggle={() => toggleTask(task.id)}
              onToggleSubtask={(subtaskId) => toggleSubtask(task.id, subtaskId)}
              onToggleFeatured={() => updateTask(task.id, { featured: !task.featured })}
            />
          ))}
        </AnimatePresence>
        {!active.length && (
          <EmptyState title={t("All caught up")}>
            {t("Add a task when your next idea arrives.")}
          </EmptyState>
        )}
      </div>
    </div>
  );
}
