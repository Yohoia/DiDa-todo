"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { PageHeader, SectionLabel, EmptyState } from "@/components/shared/workspace-ui";
import { useWorkspace } from "./workspace-provider";
import { cn } from "@/lib/utils";
import styles from "@/styles/workspace.module.css";

function completionDay(completedAt?: string) {
  return completedAt
    ? new Date(completedAt).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" })
    : "Earlier";
}

const PAGE_SIZE = 30;

export function CompletedPage() {
  const { t, label, locale } = useI18n();
  const { tasks, toggleTask, deleteTask, notify, loadCompletedTasks } = useWorkspace();
  const completed = tasks
    .filter((task) => task.completed)
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
  const dates = [...new Set(completed.map((task) => completionDay(task.completedAt)))];
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [serverTotal, setServerTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadCompletedTasks(0, PAGE_SIZE)
      .then((page) => {
        if (cancelled) return;
        setServerTotal(page.total);
        setHasMore(page.hasMore);
        setOffset(page.tasks.length);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadCompletedTasks]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await loadCompletedTasks(offset, PAGE_SIZE);
      setServerTotal(page.total);
      setHasMore(page.hasMore);
      setOffset((current) => current + page.tasks.length);
    } finally {
      setLoadingMore(false);
    }
  };
  const changeLocalTotal = (delta: number) =>
    setServerTotal((current) => Math.max(0, current + delta));

  return (
    <div className={cn(styles.page, styles.narrow)}>
      <PageHeader
        title={t("Archive")}
        subtitle={t("tasks.archiveCount", {
          count: hasMore ? serverTotal : completed.length,
        })}
      />
      {dates.map((date) => (
        <section key={date}>
          <SectionLabel>
            {date === "2026-09-08" ? t("Yesterday · Sep 8") : label(date)}
          </SectionLabel>
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {completed
                .filter((task) => completionDay(task.completedAt) === date)
                .map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={cn(styles.card, styles.row, "px-5 py-3.5")}
                  >
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
                      <motion.button
                        className={styles.button}
                        onClick={() => {
                          toggleTask(task.id);
                          changeLocalTotal(-1);
                          notify({
                            key: "tasks.restored",
                            values: { list: task.list, date: task.date ? ` · ${task.date}` : "" },
                          });
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                      >
                        {t("Restore")}
                      </motion.button>
                      <motion.button
                        className={cn(styles.button, styles.danger)}
                        onClick={() => {
                          deleteTask(task.id);
                          changeLocalTotal(-1);
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                      >
                        {t("Delete")}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </section>
      ))}
      {hasMore && (
        <button type="button" className={styles.button} onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? t("正在加载…") : t("加载更多")}
        </button>
      )}
      {!completed.length && !loading && (
        <EmptyState title={t("A fresh start")}>{t("Completed tasks will appear here.")}</EmptyState>
      )}
    </div>
  );
}
