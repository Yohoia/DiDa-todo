"use client";

import { PageHeader, SectionLabel, EmptyState } from "@/components/shared/workspace-ui";
import { useWorkspace } from "./workspace-provider";
import { cn } from "@/lib/utils";
import styles from "@/styles/workspace.module.css";

function completionDay(completedAt?: string) {
  return completedAt
    ? new Date(completedAt).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" })
    : "Earlier";
}

export function CompletedPage() {
  const { tasks, toggleTask, deleteTask, notify } = useWorkspace();
  const completed = tasks
    .filter((task) => task.completed)
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
  const dates = [...new Set(completed.map((task) => completionDay(task.completedAt)))];
  return (
    <div className={cn(styles.page, styles.narrow)}>
      <PageHeader title="Archive" subtitle={`Completed History (${completed.length} Items)`} />
      {dates.map((date) => (
        <section key={date}>
          <SectionLabel>{date === "2026-09-08" ? "Yesterday · Sep 8" : date}</SectionLabel>
          <div className="flex flex-col gap-2">
            {completed
              .filter((task) => completionDay(task.completedAt) === date)
              .map((task) => (
                <div className={cn(styles.card, styles.row, "px-5 py-3.5")} key={task.id}>
                  <div>
                    <p className="text-sm text-[var(--task-done)] line-through">{task.title}</p>
                    <p className="mt-1 text-[11px] text-[var(--task-muted)]">
                      Completed at{" "}
                      {task.completedAt
                        ? new Date(task.completedAt).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Shanghai",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      className={styles.button}
                      onClick={() => {
                        toggleTask(task.id);
                        notify(`已恢复到 ${task.list}${task.date ? ` · ${task.date}` : ""}`);
                      }}
                    >
                      Restore
                    </button>
                    <button
                      className={cn(styles.button, styles.danger)}
                      onClick={() => deleteTask(task.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
      {!completed.length && (
        <EmptyState title="A fresh start">Completed tasks will appear here.</EmptyState>
      )}
    </div>
  );
}
