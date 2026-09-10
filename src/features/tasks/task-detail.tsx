"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { useDialogFocus } from "@/hooks/use-dialog-focus";

import { useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SectionLabel } from "@/components/shared/workspace-ui";
import { useWorkspace } from "./workspace-provider";
import type { Task, TaskList } from "@/types/task";
import shared from "@/styles/workspace.module.css";
import styles from "./task-detail.module.css";

export function TaskDetail() {
  const { t } = useI18n();
  const focusReturn = useDialogFocus();
  const { selectedId, selectTask, tasks } = useWorkspace();
  const task = tasks.find((item) => item.id === selectedId);
  return (
    <Dialog
      open={!!task}
      onOpenChange={(open) => {
        if (!open) selectTask(null);
      }}
    >
      <DialogContent
        {...focusReturn}
        className={styles.drawer}
        overlayClassName={shared.overlay}
        closeButtonClassName={shared.close}
      >
        <DialogTitle className={styles.badge}>{t("Task Detail")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("编辑任务信息、子任务，或开始专注。")}
        </DialogDescription>
        {task && <TaskEditor key={task.id} task={task} />}
      </DialogContent>
    </Dialog>
  );
}
function TaskEditor({ task }: { task: Task }) {
  const { t, label } = useI18n();
  const { updateTask, toggleTask, deleteTask, startFocus, selectTask } = useWorkspace();
  const [subtask, setSubtask] = useState("");
  return (
    <>
      <label className="sr-only" htmlFor="detail-title">
        {t("任务标题")}
      </label>
      <input
        id="detail-title"
        className={styles.title}
        value={task.title}
        maxLength={200}
        onChange={(event) => {
          if (event.target.value.trim()) updateTask(task.id, { title: event.target.value });
        }}
      />
      <label className="sr-only" htmlFor="detail-description">
        {t("任务描述")}
      </label>
      <textarea
        id="detail-description"
        className={styles.description}
        value={task.description}
        placeholder={t("Add a description...")}
        onChange={(event) => updateTask(task.id, { description: event.target.value })}
      />
      <div className={styles.properties}>
        <label className={styles.property}>
          {t("Date")}{" "}
          <input
            type="date"
            value={task.date}
            onChange={(event) => updateTask(task.id, { date: event.target.value })}
          />
        </label>
        <label className={styles.property}>
          {t("Priority")}{" "}
          <select
            value={task.priority}
            onChange={(event) =>
              updateTask(task.id, { priority: Number(event.target.value) as Task["priority"] })
            }
          >
            <option value={1}>{t("P1 · High")}</option>
            <option value={2}>{t("P2 · Medium")}</option>
            <option value={3}>{t("P3 · Low")}</option>
          </select>
        </label>
        <label className={styles.property}>
          {t("List")}{" "}
          <select
            value={task.list}
            onChange={(event) =>
              updateTask(task.id, {
                list: event.target.value as TaskList,
                inWorkList: event.target.value === "Work",
              })
            }
          >
            {["Inbox", "Work", "Study", "Life"].map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.property}>
          {t("Tags")}{" "}
          <input
            value={task.tag || ""}
            placeholder={t("Add a tag")}
            onChange={(event) => updateTask(task.id, { tag: event.target.value })}
          />
        </label>
        <label className={styles.property}>
          {t("Estimate")}{" "}
          <span>
            <input
              aria-label={t("预计番茄钟数量")}
              className={styles.number}
              type="number"
              min={1}
              max={16}
              value={task.estimate}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (value >= 1 && value <= 16) updateTask(task.id, { estimate: value });
              }}
            />{" "}
            {t("Pomodoros")}
          </span>
        </label>
        <label className={styles.property}>
          {t("Reminder")}{" "}
          <select
            value={task.reminder}
            onChange={(event) => updateTask(task.id, { reminder: event.target.value })}
          >
            <option value="None">{t("None")}</option>
            <option value="10 min before">{t("10 min before")}</option>
            <option value="30 min before">{t("30 min before")}</option>
          </select>
        </label>
      </div>
      <section>
        <SectionLabel>{t("Subtasks")}</SectionLabel>
        {task.subtasks.map((item) => (
          <label className={styles.subtask} key={item.id}>
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() =>
                updateTask(task.id, {
                  subtasks: task.subtasks.map((sub) =>
                    sub.id === item.id ? { ...sub, completed: !sub.completed } : sub,
                  ),
                })
              }
            />
            <span className={item.completed ? styles.done : undefined}>{item.title}</span>
          </label>
        ))}
        <form
          className={styles.subtask}
          onSubmit={(event) => {
            event.preventDefault();
            if (!subtask.trim()) return;
            updateTask(task.id, {
              subtasks: [
                ...task.subtasks,
                { id: crypto.randomUUID(), title: subtask.trim(), completed: false },
              ],
            });
            setSubtask("");
          }}
        >
          <input
            className="min-w-0 flex-1"
            aria-label={t("新子任务")}
            placeholder={t("Add a subtask...")}
            value={subtask}
            onChange={(event) => setSubtask(event.target.value)}
            maxLength={200}
          />
          <button type="submit" className={shared.textButton}>
            {t("＋ Add")}
          </button>
        </form>
      </section>
      <section className={styles.focusBox}>
        <div className={shared.row}>
          <span className={shared.muted}>{t("FOCUS PROGRESS")}</span>
          <span className={shared.gold}>{t("tasks.pomodoros", { count: task.estimate })}</span>
        </div>
        <button className={shared.primary} onClick={() => startFocus(task.id)}>
          {t("Start Focus Session")}
        </button>
      </section>
      <div className={shared.row}>
        <button className={shared.button} onClick={() => toggleTask(task.id)}>
          {task.completed ? t("Restore Task") : t("Complete Task")}
        </button>
        <Link href="/list-detail" onClick={() => selectTask(null)} className={shared.textButton}>
          {t("View lists →")}
        </Link>
      </div>
      <footer className={styles.footer}>
        <button className={shared.danger} onClick={() => deleteTask(task.id)}>
          {t("Delete Task")}
        </button>
        <span className={shared.muted}>{t("Changes saved in this preview")}</span>
      </footer>
    </>
  );
}
