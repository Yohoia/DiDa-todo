"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { useDialogFocus } from "@/hooks/use-dialog-focus";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useWorkspace } from "@/features/tasks/workspace-provider";
import styles from "./focus-session.module.css";
import shared from "@/styles/workspace.module.css";

export function FocusSession() {
  const { t } = useI18n();
  const focusReturn = useDialogFocus();
  const { focusId, stopFocus, tasks, preferences, recordFocusSession } = useWorkspace();
  const task = tasks.find((item) => item.id === focusId);
  return (
    <Dialog
      open={!!task}
      onOpenChange={(open) => {
        if (!open) stopFocus();
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
        <DialogDescription className="sr-only">
          {t("沉浸式番茄钟，关闭后结束本次计时。")}
        </DialogDescription>
        {task && (
          <Timer
            key={task.id}
            taskId={task.id}
            minutes={preferences.duration}
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
}: {
  taskId: string;
  minutes: number;
  onExit: () => void;
  onRecord: (input: {
    taskId: string;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    completed: boolean;
  }) => void;
}) {
  const { t } = useI18n();
  const totalSeconds = minutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(true);
  const secondsRef = useRef(totalSeconds);
  const startedAtRef = useRef(new Date().toISOString());
  const recordedRef = useRef(false);
  const recordCallbackRef = useRef(onRecord);
  useEffect(() => {
    recordCallbackRef.current = onRecord;
  }, [onRecord]);

  const recordSession = useCallback(() => {
    if (recordedRef.current) return;
    const durationSeconds = totalSeconds - secondsRef.current;
    if (durationSeconds <= 0) return;
    recordedRef.current = true;
    recordCallbackRef.current({
      taskId,
      startedAt: startedAtRef.current,
      endedAt: new Date().toISOString(),
      durationSeconds,
      completed: secondsRef.current === 0,
    });
  }, [taskId, totalSeconds]);

  // 标题栏关闭、Esc 或路由切换都会卸载计时器，仍保存已经发生的专注时长。
  useEffect(() => () => recordSession(), [recordSession]);
  useEffect(() => {
    if (!running || secondsRef.current === 0) return;
    const deadline = Date.now() + secondsRef.current * 1000;
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      secondsRef.current = seconds;
      setRemaining(seconds);
      if (seconds === 0) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [running]);
  return (
    <>
      <div className={styles.timer} role="timer" aria-label={t("剩余专注时间")}>
        {String(Math.floor(remaining / 60)).padStart(2, "0")}:
        {String(remaining % 60).padStart(2, "0")}
      </div>
      {remaining === 0 && <p role="status">{t("Session complete. Take a gentle break.")}</p>}
      <div className={shared.actions}>
        {remaining > 0 && (
          <button className={styles.stop} onClick={() => setRunning(!running)}>
            {running ? t("Pause") : t("Resume")}
          </button>
        )}
        <button
          className={styles.stop}
          onClick={() => {
            recordSession();
            onExit();
          }}
        >
          {remaining === 0 ? t("Finish Session") : t("Pause & Exit")}
        </button>
      </div>
    </>
  );
}
