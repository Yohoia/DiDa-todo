"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HiSparkles } from "react-icons/hi2";

import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/features/preferences/preferences-provider";
import { useTodayKey } from "@/hooks/use-today-key";
import { useWorkspace } from "@/features/tasks/workspace-provider";
import { cn, createId } from "@/lib/utils";
import type { AiAdvisorDraft, AiAdvisorResult } from "@/types/ai-advisor";
import shared from "@/styles/workspace.module.css";
import styles from "./insights.module.css";
import { requestAiAdvisor } from "./ai-advisor-api";

type Phase = "idle" | "loading" | "ready" | "error";

export function AiAdvisorPanel({ history }: { history: { date: string; minutes: number }[] }) {
  const { t, locale } = useI18n();
  const todayKey = useTodayKey();
  const { tasks, preferences, updateTask, notify } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<AiAdvisorResult | null>(null);
  const [drafts, setDrafts] = useState<Record<string, AiAdvisorDraft>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [errorCode, setErrorCode] = useState("advisor_failed");
  const [applying, setApplying] = useState(false);
  const applyingRef = useRef(false);

  const candidates = useMemo(
    () =>
      tasks
        .filter((task) => !task.completed && task.date === todayKey)
        .slice(0, 40)
        .map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          list: task.list,
          priority: task.priority,
          estimate: task.estimate,
          subtaskCount: task.subtasks.length,
        })),
    [tasks, todayKey],
  );
  const requestHistory = useMemo(
    () =>
      history.slice(-7).map((day) => ({
        date: day.date,
        completed: 0,
        focusMinutes: day.minutes,
      })),
    [history],
  );

  useEffect(() => {
    if (!open || !candidates.length) return;
    const controller = new AbortController();
    requestAiAdvisor(
      {
        locale,
        pomodoroMinutes: preferences.duration,
        dailyCapacity: preferences.dailyCapacity,
        tasks: candidates,
        history: requestHistory,
      },
      controller.signal,
    )
      .then((next) => {
        if (controller.signal.aborted) return;
        setResult(next);
        setDrafts({});
        setSelected(new Set(next.taskSuggestions.map((item) => item.id)));
        setPhase("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setErrorCode(error instanceof Error ? error.message : "advisor_failed");
        setPhase("error");
      });
    return () => controller.abort();
  }, [candidates, locale, open, preferences.dailyCapacity, preferences.duration, requestHistory]);

  const selectedDrafts = result?.taskSuggestions.filter((item) => selected.has(item.id)) ?? [];
  const invalid = selectedDrafts.some((item) => {
    const draft = drafts[item.id] ?? item;
    return draft.estimate < 1 || draft.estimate > 16;
  });
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  async function apply() {
    if (!selectedDrafts.length || applyingRef.current) return;
    applyingRef.current = true;
    setApplying(true);
    try {
      for (const item of selectedDrafts) {
        const draft = drafts[item.id] ?? item;
        const current = taskById.get(item.id);
        if (!current) continue;
        updateTask(item.id, {
          estimate: draft.estimate,
          ...(current.subtasks.length === 0
            ? {
                subtasks: draft.subtasks.map((title) => ({
                  id: createId(),
                  title,
                  completed: false,
                })),
              }
            : {}),
        });
      }
      notify({ key: "advisor.applied", values: { count: selectedDrafts.length } });
      setOpen(false);
    } finally {
      applyingRef.current = false;
      setApplying(false);
    }
  }

  return (
    <section className={styles.advisor} aria-labelledby="ai-advisor-title">
      <div>
        <h2 id="ai-advisor-title">{t("advisor.title")}</h2>
        <p>{t("advisor.description")}</p>
      </div>
      <button
        type="button"
        className={shared.primary}
        disabled={!candidates.length}
        onClick={() => {
          setPhase("loading");
          setResult(null);
          setDrafts({});
          setSelected(new Set());
          setOpen(true);
        }}
      >
        <HiSparkles size={15} aria-hidden="true" />
        {t("advisor.generate")}
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!applyingRef.current) setOpen(next);
        }}
      >
        <DialogContent
          className={styles.advisorDialog}
          overlayClassName={shared.overlay}
          closeButtonClassName={shared.close}
        >
          <DialogTitle>{t("advisor.title")}</DialogTitle>
          <DialogDescription>{t("advisor.previewHint")}</DialogDescription>

          {phase === "loading" && (
            <div className={styles.advisorState} role="status">
              {t("advisor.loading")}
            </div>
          )}
          {phase === "error" && (
            <div className={styles.advisorState} role="alert">
              {errorCode === "auth_required"
                ? t("请先登录后再使用 AI 整理")
                : errorCode === "not_configured"
                  ? t("AI 整理服务未配置")
                  : errorCode === "rate_limited"
                    ? t("尝试太频繁，请稍后再试")
                    : t("AI 整理失败，请重试")}
            </div>
          )}
          {phase === "ready" && result && (
            <>
              <div className={styles.advisorSummary}>
                <strong>{result.capacity.message}</strong>
                <span>
                  {t("advisor.capacityCount", {
                    count: result.capacity.totalPomodoros,
                    capacity: preferences.dailyCapacity,
                  })}
                </span>
              </div>

              <div className={styles.advisorResults}>
                {result.taskSuggestions.map((suggestion) => {
                  const task = taskById.get(suggestion.id);
                  if (!task) return null;
                  const draft = drafts[suggestion.id] ?? suggestion;
                  const checked = selected.has(suggestion.id);
                  return (
                    <article key={suggestion.id} className={styles.advisorResult}>
                      <label className={styles.advisorCheck}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={applying}
                          onChange={() =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (next.has(suggestion.id)) next.delete(suggestion.id);
                              else next.add(suggestion.id);
                              return next;
                            })
                          }
                        />
                        <span>{task.title}</span>
                      </label>
                      <p>{suggestion.reason}</p>
                      <label className={styles.advisorField}>
                        {t("advisor.subtasks")}
                        <textarea
                          value={draft.subtasks.join("\n")}
                          rows={Math.max(2, draft.subtasks.length)}
                          disabled={applying || task.subtasks.length > 0}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [suggestion.id]: {
                                ...draft,
                                subtasks: event.target.value
                                  .split("\n")
                                  .map((line) => line.trim())
                                  .filter(Boolean)
                                  .slice(0, 6),
                              },
                            }))
                          }
                        />
                      </label>
                      {task.subtasks.length > 0 && (
                        <p className={styles.advisorMuted}>{t("advisor.keepSubtasks")}</p>
                      )}
                      <div className={styles.advisorEstimate}>
                        <span>{t("Estimate:")}</span>
                        <Select
                          ariaLabel={t("Estimate:")}
                          value={String(draft.estimate)}
                          disabled={applying}
                          options={Array.from({ length: 16 }, (_, index) => ({
                            value: String(index + 1),
                            label: String(index + 1),
                          }))}
                          onValueChange={(value) =>
                            setDrafts((current) => ({
                              ...current,
                              [suggestion.id]: { ...draft, estimate: Number(value) },
                            }))
                          }
                        />
                      </div>
                    </article>
                  );
                })}
              </div>

              <section className={styles.weeklyReview}>
                <h3>{t("advisor.weeklyReview")}</h3>
                <p>{result.weeklyReview.summary}</p>
                {(["wins", "risks", "nextActions"] as const).map((group) => (
                  <div key={group}>
                    <strong>{t(`advisor.${group}`)}</strong>
                    <ul>
                      {result.weeklyReview[group].map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>

              <footer className={styles.advisorActions}>
                <button type="button" className={shared.button} onClick={() => setOpen(false)}>
                  {t("取消")}
                </button>
                <button
                  type="button"
                  className={cn(shared.primary)}
                  disabled={applying || invalid || !selectedDrafts.length}
                  onClick={() => void apply()}
                >
                  {applying ? t("organize.saving") : t("advisor.apply")}
                </button>
              </footer>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
