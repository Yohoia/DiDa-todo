"use client";

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
        <span className={styles.time}>{task.time || "Any"}</span>
      )}
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={`完成任务：${task.title}`}
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
          title={`P${task.priority} Priority`}
          aria-label={`优先级 P${task.priority}`}
        />
      )}
      <button
        type="button"
        className={styles.content}
        onClick={onOpen}
        aria-label={`查看任务：${task.title}`}
      >
        <span className={styles.title}>
          {task.title}{" "}
          {task.frozen && <LockKeyhole size={12} className="inline" aria-label="已承诺" />}
        </span>
        {variant === "inbox" && <span className={styles.unorganized}>Unorganized</span>}
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
                ? `Due ${task.date === "2026-09-09" ? "Today" : task.date === "2026-09-10" ? "Tomorrow" : task.date.slice(5).replace("-", "/")}${task.time ? `, ${task.time}` : ""}`
                : "No due date"}
            </span>
            {task.priority === 1 ? (
              <span>◷ {task.estimate} Pomodoros</span>
            ) : (
              task.tag && <span>#{task.tag}</span>
            )}
          </span>
        )}
      </button>
    </div>
  );
}
