"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { useDialogFocus } from "@/hooks/use-dialog-focus";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useWorkspace } from "@/features/tasks/workspace-provider";
import styles from "./focus-session.module.css";
import shared from "@/styles/workspace.module.css";
import { createId } from "@/lib/utils";
import type { FocusSessionRecord } from "@/types/focus";
import {
  newFocusRun,
  focusRemaining,
  pauseFocusRun,
  resumeFocusRun,
  focusRunRecord,
  startFocusBreak,
  nextFocusRound,
  settleFocusRun,
  readActiveFocus,
  saveActiveFocus,
  clearActiveFocus,
  type FocusRun,
} from "./focus-run";

export function FocusSession() {
  const { t } = useI18n();
  const focusReturn = useDialogFocus();
  const {
    focusId,
    startFocus,
    stopFocus,
    tasks,
    preferences,
    recordFocusSession,
    toggleTask,
    user,
  } = useWorkspace();
  const timerExitRef = useRef<(() => void) | null>(null);
  const recoveredRef = useRef(false);
  useEffect(() => {
    if (recoveredRef.current) return;
    recoveredRef.current = true;
    const active = readActiveFocus(user.id);
    if (!active) return;
    if (tasks.some((item) => item.id === active.taskId && !item.completed))
      startFocus(active.taskId);
    else clearActiveFocus(user.id);
  }, [user.id, tasks, startFocus]);
  const task = tasks.find((item) => item.id === focusId);
  return (
    <Dialog
      open={!!task}
      onOpenChange={(open) => {
        if (!open) {
          if (timerExitRef.current) timerExitRef.current();
          else stopFocus();
        }
      }}
    >
      <DialogContent
        {...focusReturn}
        className={styles.focus}
        overlayClassName={shared.overlay}
        closeButtonClassName={shared.close}
      >
        <DialogTitle className={styles.title}>
          {t("Focusing on:")}
          <strong>{task?.title}</strong>
        </DialogTitle>
        <DialogDescription className="sr-only">{t("focus.lifecycleHint")}</DialogDescription>
        {task && (
          <Timer
            key={task.id}
            taskId={task.id}
            minutes={preferences.duration}
            userId={user.id}
            autoBreak={preferences.autoBreak}
            exitRef={timerExitRef}
            onCompleteTask={() => {
              toggleTask(task.id);
              stopFocus();
            }}
            onExit={stopFocus}
            onRecord={recordFocusSession}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
function Timer({
  taskId,
  minutes,
  onExit,
  onRecord,
  userId,
  autoBreak,
  exitRef,
  onCompleteTask,
}: {
  taskId: string;
  minutes: number;
  onExit: () => void;
  onRecord: (input: FocusSessionRecord) => void;
  userId: string;
  autoBreak: boolean;
  exitRef: { current: (() => void) | null };
  onCompleteTask: () => void;
}) {
  const { t } = useI18n();
  const [run, setRun] = useState(() => {
    const saved = readActiveFocus(userId);
    return saved?.taskId === taskId ? saved : newFocusRun(taskId, createId(), minutes, autoBreak);
  });
  const runRef = useRef(run);
  const [remaining, setRemaining] = useState(() => focusRemaining(run));
  const lastRecordRef = useRef("");
  const endedRef = useRef(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const recordCallbackRef = useRef(onRecord);
  useEffect(() => {
    recordCallbackRef.current = onRecord;
  }, [onRecord]);

  const recordSession = useCallback(() => {
    if (endedRef.current) return;
    const record = focusRunRecord(runRef.current);
    if (!record) return;
    const fingerprint = `${record.id}:${record.durationSeconds}:${record.completed}`;
    if (lastRecordRef.current === fingerprint) return;
    lastRecordRef.current = fingerprint;
    recordCallbackRef.current(record);
  }, []);
  const commit = useCallback(
    (next: FocusRun) => {
      runRef.current = next;
      setRun(next);
      setRemaining(focusRemaining(next));
      if (!saveActiveFocus(userId, next)) setStorageUnavailable(true);
    },
    [userId],
  );
  const exit = useCallback(() => {
    recordSession();
    endedRef.current = true;
    clearActiveFocus(userId);
    onExit();
  }, [onExit, recordSession, userId]);
  useEffect(() => {
    exitRef.current = exit;
    return () => {
      exitRef.current = null;
    };
  }, [exit, exitRef]);
  useEffect(() => {
    const checkpoint = () => {
      if (endedRef.current) return;
      saveActiveFocus(userId, runRef.current);
      recordSession();
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") checkpoint();
    };
    window.addEventListener("pagehide", checkpoint);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      checkpoint();
      window.removeEventListener("pagehide", checkpoint);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [recordSession, userId]);
  useEffect(() => {
    const tick = () => {
      if (endedRef.current) return;
      const current = runRef.current;
      const seconds = focusRemaining(current);
      setRemaining(seconds);
      if (seconds === 0 && current.phase !== "focusComplete" && current.phase !== "breakComplete") {
        recordSession();
        commit(settleFocusRun(current, createId()));
      } else if (current.phase === "focus" && (current.totalSeconds - seconds) % 30 === 0)
        recordSession();
    };
    // Schedule the initial sample too: a restored elapsed deadline must settle once.
    const timer = window.setInterval(tick, 250);
    const initial = window.setTimeout(() => {
      if (!saveActiveFocus(userId, runRef.current)) setStorageUnavailable(true);
      tick();
    }, 0);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [commit, recordSession, userId]);
  const resting =
    run.phase === "shortBreak" || run.phase === "longBreak" || run.phase === "breakComplete";
  const done = run.phase === "focusComplete" || run.phase === "breakComplete";
  return (
    <>
      <p className={shared.muted} role="status">
        {t(
          resting
            ? run.phase === "breakComplete"
              ? "focus.breakComplete"
              : run.phase === "longBreak"
                ? "focus.longBreak"
                : "focus.shortBreak"
            : "focus.round",
          { count: String(run.completedRounds + (run.phase === "focus" ? 1 : 0)) },
        )}
      </p>
      <div
        className={styles.timer}
        role="timer"
        aria-label={t(resting ? "focus.remainingBreak" : "剩余专注时间")}
      >
        {String(Math.floor(remaining / 60)).padStart(2, "0")}:
        {String(remaining % 60).padStart(2, "0")}
      </div>
      {done && (
        <p role="status">
          {t(
            run.phase === "breakComplete"
              ? "focus.breakComplete"
              : "Session complete. Take a gentle break.",
          )}
        </p>
      )}
      {storageUnavailable && (
        <p className={shared.muted} role="alert">
          {t("focus.storageUnavailable")}
        </p>
      )}
      <label className={shared.muted}>
        <input
          type="checkbox"
          checked={run.autoNext}
          onChange={(event) => commit({ ...runRef.current, autoNext: event.target.checked })}
        />{" "}
        {t("focus.autoNext")}
      </label>
      <div className={shared.actions}>
        {!done && remaining > 0 && (
          <button
            className={styles.stop}
            onClick={() => {
              commit(
                runRef.current.deadline === null
                  ? resumeFocusRun(runRef.current)
                  : pauseFocusRun(runRef.current),
              );
              recordSession();
            }}
          >
            {run.deadline !== null ? t("Pause") : t("Resume")}
          </button>
        )}
        {run.phase === "focusComplete" && (
          <button className={styles.stop} onClick={() => commit(startFocusBreak(runRef.current))}>
            {t("focus.startBreak")}
          </button>
        )}
        {(done || resting) && (
          <button
            className={styles.stop}
            onClick={() => commit(nextFocusRound(runRef.current, createId()))}
          >
            {t(resting && !done ? "focus.skipBreak" : "focus.nextRound")}
          </button>
        )}
        {done && (
          <button
            className={styles.stop}
            onClick={() => {
              recordSession();
              endedRef.current = true;
              clearActiveFocus(userId);
              onCompleteTask();
            }}
          >
            {t("focus.completeTask")}
          </button>
        )}
        <button className={styles.stop} onClick={exit}>
          {t("focus.saveExit")}
        </button>
      </div>
      <p className={shared.muted}>{t("focus.lifecycleHint")}</p>
    </>
  );
}
