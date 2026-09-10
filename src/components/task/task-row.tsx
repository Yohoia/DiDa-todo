"use client";
import { useI18n } from "@/features/preferences/preferences-provider";
import { isDemoToday, isDemoTomorrow } from "@/lib/date-utils";

import { HiCheck, HiClock, HiLockClosed } from "react-icons/hi2";
import { motion } from "framer-motion";
import type { Task } from "@/types/task";
import { cn } from "@/lib/utils";
import taskStyles from "./task-row.module.css";
import workspaceStyles from "@/styles/workspace.module.css";
import { SubtaskPopover } from "./subtask-popover";

type Props = {
  task: Task;
  onToggle: () => void;
  onToggleSubtask: (subtaskId: string) => void;
  onOpen: () => void;
  variant?: "inbox" | "timeline" | "upcoming" | "list";
};
export function TaskRow({ task, onToggle, onToggleSubtask, onOpen, variant = "upcoming" }: Props) {
  const { t, date: formatDate } = useI18n();
  const hasSubtasks = task.subtasks.length > 0;
  const hasTimelineMeta = task.tags.length > 0 || task.id === "design" || hasSubtasks;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        taskStyles.row,
        taskStyles[variant],
        task.completed && taskStyles.completed,
        task.frozen && taskStyles.frozen,
      )}
    >
      {variant === "timeline" && !task.frozen && (
        <span className={taskStyles.time}>{task.time || t("Any")}</span>
      )}
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={t("tasks.complete", { title: task.title })}
        onClick={onToggle}
        className={taskStyles.checkButton}
      >
        <span className={taskStyles.checkbox}>{task.completed && <HiCheck size={12} />}</span>
      </button>
      {variant === "list" && (
        <span
          className={cn(
            taskStyles.priority,
            task.priority === 1 && taskStyles.high,
            task.priority === 2 && taskStyles.medium,
          )}
          title={t("tasks.priority", { priority: task.priority })}
          aria-label={t("tasks.priority", { priority: task.priority })}
        />
      )}
      <div className={taskStyles.content}>
        <button
          type="button"
          className={taskStyles.contentButton}
          onClick={onOpen}
          aria-label={t("tasks.open", { title: task.title })}
        >
          <span className={taskStyles.title}>
            {task.title}{" "}
            {task.frozen && <HiLockClosed size={12} className="inline" aria-label={t("已承诺")} />}
          </span>
          {variant === "inbox" && (
            <span className={taskStyles.unorganized}>{t("Unorganized")}</span>
          )}
          {variant === "upcoming" &&
            task.tags.map((tag) => (
              <span key={tag} className={workspaceStyles.tag}>
                #{tag}
              </span>
            ))}
        </button>
        {variant === "timeline" && hasTimelineMeta && (
          <div className={taskStyles.meta}>
            {task.tags.map((tag) => (
              <span key={tag} className={workspaceStyles.tag}>
                #{tag}
              </span>
            ))}
            {task.id === "design" && (
              <span className="inline-flex items-center gap-1">
                <HiClock size={13} aria-hidden="true" />1
              </span>
            )}
            {hasSubtasks && <SubtaskPopover subtasks={task.subtasks} onToggle={onToggleSubtask} />}
          </div>
        )}
        {variant === "list" && (
          <div className={taskStyles.meta}>
            <span>
              {task.date
                ? t("tasks.due", {
                    date: `${isDemoToday(task.date) ? t("Today") : isDemoTomorrow(task.date) ? t("Tomorrow") : formatDate(task.date, { month: "short", day: "numeric" })}${task.time ? `, ${task.time}` : ""}`,
                  })
                : t("No due date")}
            </span>
            {task.priority === 1 ? (
              <span className="inline-flex items-center gap-1">
                <HiClock size={13} aria-hidden="true" />
                {t("tasks.pomodoros", { count: task.estimate })}
              </span>
            ) : (
              task.tags.map((tag) => <span key={tag}>#{tag}</span>)
            )}
            {hasSubtasks && <SubtaskPopover subtasks={task.subtasks} onToggle={onToggleSubtask} />}
          </div>
        )}
        {(variant === "inbox" || variant === "upcoming") && hasSubtasks && (
          <div className={taskStyles.meta}>
            <SubtaskPopover subtasks={task.subtasks} onToggle={onToggleSubtask} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
