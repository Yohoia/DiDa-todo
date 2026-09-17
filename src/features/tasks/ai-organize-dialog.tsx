"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { HiSparkles } from "react-icons/hi2";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/features/preferences/preferences-provider";
import type { Task } from "@/types/task";
import type { TaskOrganizationDraft, TaskOrganizationSuggestion } from "@/types/task-organization";
import { organizeDayTasks } from "./ai-organize-api";
import { OrganizationDraftRow } from "./organization-draft-row";
import { organizationDraftError } from "./organization-editor";
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
  onApply: (suggestions: TaskOrganizationDraft[]) => Promise<void>;
}) {
  const { t, locale, date: formatDate } = useI18n();
  const [phase, setPhase] = useState<Phase>("loading");
  const [suggestions, setSuggestions] = useState<TaskOrganizationSuggestion[]>([]);
  const [drafts, setDrafts] = useState<Record<string, TaskOrganizationDraft>>({});
  const [responseKey, setResponseKey] = useState<string | null>(null);
  const [applyError, setApplyError] = useState(false);
  const requestKey = JSON.stringify({ date, locale, pomodoroMinutes, tasks });
  const currentPhase = responseKey === requestKey ? phase : "loading";
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [errorCode, setErrorCode] = useState("organize_failed");
  const [attempt, setAttempt] = useState(0);
  const [applying, setApplying] = useState(false);
  const applyingRef = useRef(false);

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
        if (controller.signal.aborted) return;
        setSuggestions(next);
        setDrafts({});
        setSelected(new Set(next.map((item) => item.id)));
        setResponseKey(requestKey);
        setPhase("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setErrorCode(error instanceof Error ? error.message : "organize_failed");
        setResponseKey(requestKey);
        setPhase("error");
      });
    return () => controller.abort();
  }, [attempt, date, locale, open, pomodoroMinutes, tasks, requestKey]);

  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const selectedSuggestions = suggestions
    .filter((item) => selected.has(item.id))
    .map((item) => drafts[item.id] ?? item);
  const invalidSelection = selectedSuggestions.some((draft) => organizationDraftError(draft));
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!applyingRef.current) onOpenChange(next);
      }}
    >
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

        {currentPhase === "loading" && (
          <div className={styles.loading} role="status">
            <span className={styles.spinner} aria-hidden="true" />
            <strong>{t("正在理解这一天要做的事…")}</strong>
            <span>{t("保留明确时间，其余任务保持随时")}</span>
          </div>
        )}

        {currentPhase === "error" && (
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

        {currentPhase === "ready" && (
          <>
            <div className={styles.summary} role="status">
              <span>{t("已生成 {count} 项整理建议", { count: String(suggestions.length) })}</span>
              <span>{t("organize.reviewHint")}</span>
            </div>
            <div className={styles.results}>
              {suggestions.map((suggestion) => {
                const task = taskById.get(suggestion.id);
                if (!task) return null;
                const checked = selected.has(suggestion.id);
                return (
                  <OrganizationDraftRow
                    key={`${suggestion.id}-${attempt}-${locale}-${pomodoroMinutes}`}
                    task={task}
                    original={suggestion}
                    draft={drafts[suggestion.id] ?? suggestion}
                    checked={checked}
                    disabled={applying}
                    onChange={(draft) =>
                      setDrafts((current) => ({ ...current, [suggestion.id]: draft }))
                    }
                    onToggle={() =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (next.has(suggestion.id)) next.delete(suggestion.id);
                        else next.add(suggestion.id);
                        return next;
                      })
                    }
                  />
                );
              })}
            </div>
            <footer className={styles.actions}>
              {applyError && (
                <p className={styles.validation} role="alert">
                  {t("sync.failed")}
                </p>
              )}
              <button
                type="button"
                className={shared.button}
                disabled={applying}
                onClick={() => onOpenChange(false)}
              >
                {t("取消")}
              </button>
              <button
                type="button"
                className={styles.apply}
                disabled={applying || invalidSelection || !selectedSuggestions.length}
                onClick={async () => {
                  if (applyingRef.current) return;
                  applyingRef.current = true;
                  setApplying(true);
                  setApplyError(false);
                  try {
                    await onApply(selectedSuggestions);
                  } catch {
                    setApplyError(true);
                  } finally {
                    applyingRef.current = false;
                    setApplying(false);
                  }
                }}
              >
                <HiSparkles size={14} aria-hidden="true" />
                {applying
                  ? t("organize.saving")
                  : t("应用 {count} 项整理", { count: String(selectedSuggestions.length) })}
              </button>
            </footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
