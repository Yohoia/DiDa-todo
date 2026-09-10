"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { Check, LockKeyhole } from "lucide-react";
import type { Task } from "@/types/task";
import { cn } from "@/lib/utils";
import styles from "./task-row.module.css";
import shared from "@/styles/workspace.module.css";

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
        styles.row,
        styles[variant],
        task.completed && styles.completed,
        task.frozen && styles.frozen,
      )}
    >
      {variant === "timeline" && !task.frozen && (
        <span className={styles.time}>{task.time || t("Any")}</span>
      )}
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={t("tasks.complete", { title: task.title })}
        onClick={onToggle}
        className={styles.checkButton}
      >
        <span className={styles.checkbox}>{task.completed && <Check size={12} />}</span>
      </button>
      {variant === "list" && (
        <span
          className={cn(
            styles.priority,
            task.priority === 1 && styles.high,
            task.priority === 2 && styles.medium,
          )}
          title={t("tasks.priority", { priority: task.priority })}
          aria-label={t("tasks.priority", { priority: task.priority })}
        />
      )}
      <button
        type="button"
        className={styles.content}
        onClick={onOpen}
        aria-label={t("tasks.open", { title: task.title })}
      >
        <span className={styles.title}>
          {task.title}{" "}
          {task.frozen && <LockKeyhole size={12} className="inline" aria-label={t("已承诺")} />}
        </span>
        {variant === "inbox" && <span className={styles.unorganized}>{t("Unorganized")}</span>}
        {variant === "upcoming" && task.tag && <span className={shared.tag}>{task.tag}</span>}
        {variant === "timeline" && task.tag && (
          <span className={styles.meta}>
            <span className={shared.tag}>{task.tag}</span>
            {task.id === "design" && <span>◷ 1</span>}
          </span>
        )}
        {variant === "list" && (
          <span className={styles.meta}>
            <span>
              {task.date
                ? t("tasks.due", {
                    date: `${task.date === "2026-09-09" ? t("Today") : task.date === "2026-09-10" ? t("Tomorrow") : formatDate(task.date, { month: "short", day: "numeric" })}${task.time ? `, ${task.time}` : ""}`,
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
