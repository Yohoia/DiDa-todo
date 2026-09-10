"use client";
import { useI18n } from "@/features/preferences/preferences-provider";
import { isDemoToday, isDemoTomorrow } from "@/lib/date-utils";

import { HiCheck, HiLockClosed } from "react-icons/hi2";
import type { Task } from "@/types/task";
import { cn } from "@/lib/utils";
import taskStyles from "./task-row.module.css";
import workspaceStyles from "@/styles/workspace.module.css";

type Props = {
  task: Task;
  onToggle: () => void;
  onOpen: () => void;
  variant?: "inbox" | "timeline" | "upcoming" | "list";
};
export function TaskRow({ task, onToggle, onOpen, variant = "upcoming" }: Props) {
  const { t, date: formatDate } = useI18n();
  return (
    <div
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
      <button
        type="button"
        className={taskStyles.content}
        onClick={onOpen}
        aria-label={t("tasks.open", { title: task.title })}
      >
        <span className={taskStyles.title}>
          {task.title}{" "}
          {task.frozen && <HiLockClosed size={12} className="inline" aria-label={t("已承诺")} />}
        </span>
        {variant === "inbox" && <span className={taskStyles.unorganized}>{t("Unorganized")}</span>}
        {variant === "upcoming" && task.tag && (
          <span className={workspaceStyles.tag}>{task.tag}</span>
        )}
        {variant === "timeline" && task.tag && (
          <span className={taskStyles.meta}>
            <span className={workspaceStyles.tag}>{task.tag}</span>
            {task.id === "design" && <span>◷ 1</span>}
          </span>
        )}
        {variant === "list" && (
          <span className={taskStyles.meta}>
            <span>
              {task.date
                ? t("tasks.due", {
                    date: `${isDemoToday(task.date) ? t("Today") : isDemoTomorrow(task.date) ? t("Tomorrow") : formatDate(task.date, { month: "short", day: "numeric" })}${task.time ? `, ${task.time}` : ""}`,
                  })
                : t("No due date")}
            </span>
            {task.priority === 1 ? (
              <span>◷ {t("tasks.pomodoros", { count: task.estimate })}</span>
            ) : (
              task.tag && <span>#{task.tag}</span>
            )}
          </span>
        )}
      </button>
    </div>
  );
}
