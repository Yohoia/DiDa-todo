"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

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
  const { t, label, locale } = useI18n();
  const { tasks, toggleTask, deleteTask, notify } = useWorkspace();
  const completed = tasks
    .filter((task) => task.completed)
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
  const dates = [...new Set(completed.map((task) => completionDay(task.completedAt)))];
  return (
    <div className={cn(styles.page, styles.narrow)}>
      <PageHeader
        title={t("Archive")}
        subtitle={t("tasks.archiveCount", { count: completed.length })}
      />
      {dates.map((date) => (
        <section key={date}>
          <SectionLabel>
            {date === "2026-09-08" ? t("Yesterday · Sep 8") : label(date)}
          </SectionLabel>
          <div className="flex flex-col gap-2">
            {completed
              .filter((task) => completionDay(task.completedAt) === date)
              .map((task) => (
                <div className={cn(styles.card, styles.row, "px-5 py-3.5")} key={task.id}>
                  <div>
                    <p className="text-sm text-[var(--task-done)] line-through">{task.title}</p>
                    <p className="mt-1 text-[11px] text-[var(--task-muted)]">
                      {t("Completed at")}{" "}
                      {task.completedAt
                        ? new Date(task.completedAt).toLocaleTimeString(locale, {
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
                        notify({
                          key: "tasks.restored",
                          values: { list: task.list, date: task.date ? ` · ${task.date}` : "" },
                        });
                      }}
                    >
                      {t("Restore")}
                    </button>
                    <button
                      className={cn(styles.button, styles.danger)}
                      onClick={() => deleteTask(task.id)}
                    >
                      {t("Delete")}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
      {!completed.length && (
        <EmptyState title={t("A fresh start")}>{t("Completed tasks will appear here.")}</EmptyState>
      )}
    </div>
  );
}
