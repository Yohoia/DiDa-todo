"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HiCheck, HiListBullet } from "react-icons/hi2";

import { useI18n } from "@/features/preferences/preferences-provider";
import { cn } from "@/lib/utils";
import type { Subtask } from "@/types/task";

import styles from "./subtask-popover.module.css";

type SubtaskPopoverProps = {
  subtasks: Subtask[];
  onToggle: (subtaskId: string) => void;
  className?: string;
};

export function SubtaskPopover({ subtasks, onToggle, className }: SubtaskPopoverProps) {
  const { t } = useI18n();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinned = useRef(false);

  const completed = subtasks.filter((subtask) => subtask.completed).length;
  const progressLabel = t("tasks.subtaskProgress", { completed, count: subtasks.length });

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const scheduleClose = () => {
    if (pinned.current) return;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  useEffect(() => {
    const closePinnedPanel = (event: PointerEvent) => {
      if (!pinned.current || rootRef.current?.contains(event.target as Node)) return;
      pinned.current = false;
      cancelClose();
      setOpen(false);
    };
    document.addEventListener("pointerdown", closePinnedPanel);
    return () => {
      document.removeEventListener("pointerdown", closePinnedPanel);
      cancelClose();
    };
  }, []);

  if (subtasks.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-state={open ? "open" : "closed"}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        cancelClose();
        setOpen(true);
      }}
      onPointerLeave={() => {
        if (pinned.current || rootRef.current?.contains(document.activeElement)) return;
        scheduleClose();
      }}
      onFocusCapture={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlurCapture={(event) => {
        if (!pinned.current && !event.currentTarget.contains(event.relatedTarget)) scheduleClose();
      }}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape") return;
        pinned.current = false;
        cancelClose();
        setOpen(false);
      }}
    >
      <button
        type="button"
        className={cn(styles.trigger, className)}
        aria-label={progressLabel}
        aria-haspopup="dialog"
        aria-controls={panelId}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          cancelClose();
          pinned.current = !pinned.current;
          setOpen(pinned.current);
        }}
      >
        <HiListBullet size={14} aria-hidden="true" />
        <span>{subtasks.length}</span>
      </button>
      <div id={panelId} role="dialog" className={styles.panel} aria-label={t("Subtasks")}>
        <div className={styles.header}>
          <span>{t("Subtasks")}</span>
          <span className={styles.progress}>{progressLabel}</span>
        </div>
        <ul className={styles.list}>
          {subtasks.map((subtask) => (
            <li key={subtask.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={subtask.completed}
                aria-label={t(subtask.completed ? "tasks.reopenSubtask" : "tasks.completeSubtask", {
                  title: subtask.title,
                })}
                className={styles.item}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle(subtask.id);
                }}
              >
                <span className={cn(styles.checkbox, subtask.completed && styles.checked)}>
                  {subtask.completed && <HiCheck size={10} aria-hidden="true" />}
                </span>
                <span className={cn(styles.title, subtask.completed && styles.completed)}>
                  {subtask.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <span className={styles.arrow} aria-hidden="true" />
      </div>
    </div>
  );
}
