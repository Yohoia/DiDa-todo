"use client";

import { useEffect, useMemo, useState } from "react";
import { HiCheck, HiClock, HiSparkles } from "react-icons/hi2";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/features/preferences/preferences-provider";
import type { Task } from "@/types/task";
import type { TaskOrganizationSuggestion } from "@/types/task-organization";
import { organizeDayTasks } from "./ai-organize-api";
import shared from "@/styles/workspace.module.css";
import styles from "./ai-organize-dialog.module.css";

type Phase = "loading" | "ready" | "error";

export function AiOrganizeDialog({
  open,
  onOpenChange,
  date,
  tasks,
  pomodoroMinutes,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  tasks: Task[];
  pomodoroMinutes: number;
  onApply: (suggestions: TaskOrganizationSuggestion[]) => void;
}) {
  const { t, label, locale, date: formatDate } = useI18n();
  const [phase, setPhase] = useState<Phase>("loading");
  const [suggestions, setSuggestions] = useState<TaskOrganizationSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [errorCode, setErrorCode] = useState("organize_failed");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open || !tasks.length) return;
    const controller = new AbortController();
    void organizeDayTasks(
      {
        date,
        locale,
        pomodoroMinutes,
        tasks: tasks.map(({ id, title, description, list, tags, time, priority, estimate }) => ({
          id,
          title,
          description,
          list,
          tags,
          time,
          priority,
          estimate,
        })),
      },
      controller.signal,
    )
      .then((next) => {
        setSuggestions(next);
        setSelected(new Set(next.map((item) => item.id)));
        setPhase("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setErrorCode(error instanceof Error ? error.message : "organize_failed");
        setPhase("error");
      });
    return () => controller.abort();
  }, [attempt, date, locale, open, pomodoroMinutes, tasks]);

  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const selectedSuggestions = suggestions.filter((item) => selected.has(item.id));
  const dayLabel = formatDate(date, { year: "numeric", month: "long", day: "numeric" });
  const errorMessage =
    errorCode === "auth_required"
      ? t("请先登录后再使用 AI 整理")
      : errorCode === "not_configured"
        ? t("AI 整理服务未配置")
        : errorCode === "rate_limited"
          ? t("尝试太频繁，请稍后再试")
          : t("AI 整理失败，请重试");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={styles.dialog}
        overlayClassName={shared.overlay}
        closeButtonClassName={shared.close}
      >
        <div className={styles.heading}>
          <span className={styles.sparkle} aria-hidden="true">
            <HiSparkles size={18} />
          </span>
          <div>
            <DialogTitle className={styles.title}>{t("AI 整理当天待办")}</DialogTitle>
            <DialogDescription className={styles.description}>
              {t("正在整理 {date} 的 {count} 项未完成待办", {
                date: dayLabel,
                count: String(tasks.length),
              })}
            </DialogDescription>
          </div>
        </div>

        {phase === "loading" && (
          <div className={styles.loading} role="status">
            <span className={styles.spinner} aria-hidden="true" />
            <strong>{t("正在理解这一天要做的事…")}</strong>
            <span>{t("保留明确时间，其余任务保持随时")}</span>
          </div>
        )}

        {phase === "error" && (
          <div className={styles.error} role="alert">
            <strong>{errorMessage}</strong>
            <span>{t("你的任务没有被修改")}</span>
            <button
              type="button"
              className={shared.button}
              onClick={() => {
                setPhase("loading");
                setSuggestions([]);
                setSelected(new Set());
                setAttempt((n) => n + 1);
              }}
            >
              {t("重试")}
            </button>
          </div>
        )}

        {phase === "ready" && (
          <>
            <div className={styles.summary} role="status">
              <span>{t("已生成 {count} 项整理建议", { count: String(suggestions.length) })}</span>
              <span>{t("可取消勾选不想应用的项目")}</span>
            </div>
            <div className={styles.results}>
              {suggestions.map((suggestion) => {
                const task = taskById.get(suggestion.id);
                if (!task) return null;
                const checked = selected.has(suggestion.id);
                return (
                  <article className={styles.result} key={suggestion.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      aria-label={t("应用任务整理：{title}", { title: task.title })}
                      className={styles.check}
                      onClick={() =>
                        setSelected((current) => {
                          const next = new Set(current);
                          if (next.has(suggestion.id)) next.delete(suggestion.id);
                          else next.add(suggestion.id);
                          return next;
                        })
                      }
                    >
                      {checked && <HiCheck size={12} aria-hidden="true" />}
                    </button>
                    <div className={styles.resultBody}>
                      <h3>{task.title}</h3>
                      <div className={styles.meta}>
                        <span className={styles.time}>
                          <HiClock size={13} aria-hidden="true" />
                          {suggestion.time ?? t("随时")}
                        </span>
                        <span>{label(suggestion.list)}</span>
                        <span className={styles[`priority${suggestion.priority}`]}>
                          P{suggestion.priority}
                        </span>
                        <span>{t("{count} 个番茄钟", { count: String(suggestion.estimate) })}</span>
                      </div>
                      <div className={styles.tags}>
                        {suggestion.tags.map((tag) => (
                          <span key={tag}>#{tag}</span>
                        ))}
                      </div>
                      {suggestion.reason && <p>{suggestion.reason}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
            <footer className={styles.actions}>
              <button type="button" className={shared.button} onClick={() => onOpenChange(false)}>
                {t("取消")}
              </button>
              <button
                type="button"
                className={styles.apply}
                disabled={!selectedSuggestions.length}
                onClick={() => onApply(selectedSuggestions)}
              >
                <HiSparkles size={14} aria-hidden="true" />
                {t("应用 {count} 项整理", { count: String(selectedSuggestions.length) })}
              </button>
            </footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
