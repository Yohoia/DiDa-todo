"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { useState } from "react";
import { HiBriefcase, HiPlus } from "react-icons/hi2";
import { AnimatePresence, motion } from "framer-motion";
import { TaskRow } from "@/components/task/task-row";
import { EmptyState } from "@/components/shared/workspace-ui";
import { Select } from "@/components/ui/select";
import { useWorkspace } from "./workspace-provider";
import { cn } from "@/lib/utils";
import type { TaskList } from "@/types/task";
import styles from "@/styles/workspace.module.css";

export function ListPage() {
  const { t, label } = useI18n();
  const { tasks, selectTask, toggleTask, toggleSubtask, updateTask, setQuickAdd } = useWorkspace();
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
      <div className={styles.filterBar}>
        <div className={styles.selectGroup}>
          <span className={styles.selectLabel}>{t("List")}</span>
          <Select
            ariaLabel={t("选择清单")}
            value={collection}
            onValueChange={setCollection}
            options={[
              { value: "project", label: t("Work & Projects") },
              { value: "Work", label: t("All Work") },
              { value: "Study", label: label("Study") },
              { value: "Life", label: label("Life") },
            ]}
          />
        </div>
        <div className={styles.selectGroup}>
          <span className={styles.selectLabel}>{t("Sort by:")}</span>
          <Select
            ariaLabel={t("Sort by:")}
            value={sort}
            onValueChange={setSort}
            align="end"
            options={[
              { value: "priority", label: t("Priority (High to Low)") },
              { value: "date", label: t("Due Date") },
              { value: "created", label: t("Creation Date") },
            ]}
          />
        </div>
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
              onUnlock={() => updateTask(task.id, { frozen: false })}
              whenMode="detailed"
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
