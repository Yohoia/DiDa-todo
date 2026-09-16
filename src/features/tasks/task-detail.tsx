"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { useDialogFocus } from "@/hooks/use-dialog-focus";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import { HiBars3, HiChevronDown, HiLockClosed, HiPlus, HiTrash, HiXMark } from "react-icons/hi2";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { ReminderBell } from "@/components/ui/reminder-bell";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Stepper } from "@/components/ui/stepper";
import { Select } from "@/components/ui/select";
import { TaskLockButton } from "@/components/task/task-lock-button";
import { useWorkspace } from "./workspace-provider";
import { ORGANIZED_LISTS, type Task, type TaskList } from "@/types/task";
import { cn, createId } from "@/lib/utils";
import shared from "@/styles/workspace.module.css";
import styles from "./task-detail.module.css";

export function TaskDetail() {
  const { t } = useI18n();
  const focusReturn = useDialogFocus();
  const { selectedId, selectTask, tasks, updateTask } = useWorkspace();
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
        variant="drawer"
        className={styles.drawer}
        overlayClassName={shared.overlay}
        closeButtonClassName={shared.close}
        onEscapeKeyDown={(event) => {
          // While a subtask title is being edited, Escape cancels the edit
          // (handled by the input) instead of closing the whole drawer.
          const active = document.activeElement;
          if (active instanceof HTMLInputElement && active.className.includes("subtaskEdit")) {
            event.preventDefault();
          }
        }}
      >
        <div className={styles.header}>
          <DialogTitle className={styles.badge}>{t("Task Detail")}</DialogTitle>
          {task && (
            <div className={styles.stateActions}>
              <button
                type="button"
                className={styles.oneAction}
                aria-pressed={!!task.featured}
                aria-label={t("Set as today's focus")}
                title={t("Set as today's focus")}
                onClick={() => updateTask(task.id, { featured: !task.featured })}
              >
                one
              </button>
              {task.frozen ? (
                <TaskLockButton onUnlock={() => updateTask(task.id, { frozen: false })} />
              ) : (
                <button
                  type="button"
                  className={styles.lockAction}
                  aria-label={t("Lock task")}
                  title={t("Lock task")}
                  onClick={() => updateTask(task.id, { frozen: true })}
                >
                  <HiLockClosed size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>
        <DialogDescription className="sr-only">
          {t("编辑任务信息、子任务，或开始专注。")}
        </DialogDescription>
        {task && <TaskEditor key={task.id} task={task} />}
      </DialogContent>
    </Dialog>
  );
}
const DESCRIPTION_LIMIT = 50;
const TAG_LIMIT = 3;

function TaskEditor({ task }: { task: Task }) {
  const { t, label } = useI18n();
  const { updateTask, deleteTask, startFocus, notify, selectTask } = useWorkspace();
  const pathname = usePathname();
  const [subtask, setSubtask] = useState("");
  const subtaskInputRef = useRef<HTMLInputElement>(null);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);
  const addTag = () => {
    const value = tagDraft.trim().replace(/^#/, "");
    setTagDraft("");
    if (!value || task.tags.includes(value) || task.tags.length >= TAG_LIMIT) return;
    updateTask(task.id, { tags: [...task.tags, value] });
  };
  const removeTag = (tag: string) =>
    updateTask(task.id, { tags: task.tags.filter((item) => item !== tag) });
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
      <div className={styles.descriptionWrap}>
        <label className="sr-only" htmlFor="detail-description">
          {t("任务描述")}
        </label>
        <textarea
          id="detail-description"
          className={styles.description}
          value={task.description}
          placeholder={t("Add a description...")}
          maxLength={DESCRIPTION_LIMIT}
          onChange={(event) => updateTask(task.id, { description: event.target.value })}
        />
        <span
          className={cn(
            styles.counter,
            task.description.length >= DESCRIPTION_LIMIT && styles.counterMax,
          )}
          aria-hidden="true"
        >
          {task.description.length}/{DESCRIPTION_LIMIT}
        </span>
      </div>
      <div className={styles.properties}>
        <div className={styles.property}>
          {t("Date")}{" "}
          <DateTimePicker
            value={{ date: task.date, time: task.time }}
            onChange={(next) => updateTask(task.id, { date: next.date, time: next.time })}
          />
        </div>
        <div className={styles.property}>
          {t("Priority")}{" "}
          <SegmentedControl
            ariaLabel={t("Priority")}
            value={task.priority}
            onChange={(priority) => updateTask(task.id, { priority })}
            options={[
              { value: 1 as const, label: t("P1 · High"), dot: "var(--destructive)" },
              { value: 2 as const, label: t("P2 · Medium"), dot: "var(--brand-gold)" },
              { value: 3 as const, label: t("P3 · Low"), dot: "var(--muted-foreground)" },
            ]}
          />
        </div>
        <div className={styles.property}>
          <span>{t("List")}</span>
          <Select
            ariaLabel={t("List")}
            value={task.list}
            placeholder={t("待整理")}
            onValueChange={(value) => {
              const movedFromInbox = task.list === "Inbox";
              if (value === task.list) return;
              updateTask(task.id, { list: value });
              notify({ key: "tasks.movedToList", values: { list: value } });
              if (movedFromInbox && pathname === "/inbox") {
                selectTask(null);
              }
            }}
            align="end"
            options={(ORGANIZED_LISTS as readonly TaskList[]).map((value) => ({
              value,
              label: label(value),
            }))}
          />
        </div>
        <div className={styles.property}>
          {t("Tags")}{" "}
          <div
            className={styles.tagField}
            onClick={(event) => {
              if ((event.target as HTMLElement).tagName !== "BUTTON") tagInputRef.current?.focus();
            }}
          >
            {task.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={cn(shared.tag, styles.tagChip)}
                aria-label={t("tasks.removeTag", { tag })}
                onClick={() => removeTag(tag)}
              >
                <span className={styles.tagChipLabel}>#{tag}</span>
                <span className={styles.tagChipX} aria-hidden="true">
                  <HiXMark size={11} />
                </span>
              </button>
            ))}
            {task.tags.length < TAG_LIMIT && (
              <input
                ref={tagInputRef}
                className={styles.tagInput}
                value={tagDraft}
                placeholder={task.tags.length === 0 ? t("Add a tag") : ""}
                maxLength={12}
                aria-label={t("Add a tag")}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
              />
            )}
          </div>
        </div>
        <div className={styles.property}>
          {t("Estimate")}{" "}
          <span>
            <Stepper
              label={t("预计番茄钟数量")}
              decreaseLabel={t("减少")}
              increaseLabel={t("增加")}
              value={task.estimate}
              min={1}
              max={16}
              onChange={(estimate) => updateTask(task.id, { estimate })}
            />{" "}
            {t("Pomodoros")}
          </span>
        </div>
        <div className={styles.property}>
          {t("Reminder")}{" "}
          <ReminderBell
            value={task.reminder}
            onChange={(reminder) => updateTask(task.id, { reminder })}
          />
        </div>
      </div>
      <section className={styles.subtaskSection}>
        <div className={styles.subtaskHeader}>
          <h2 className={styles.subtaskHeading}>{t("Subtasks")}</h2>
          <span className={styles.subtaskRule} aria-hidden="true" />
          {task.subtasks.length > 0 ? (
            <button
              type="button"
              className={styles.subtaskToggle}
              aria-expanded={subtasksOpen}
              aria-controls={`task-subtasks-${task.id}`}
              aria-label={subtasksOpen ? t("折叠子任务") : t("展开子任务")}
              onClick={() => setSubtasksOpen((open) => !open)}
            >
              <span className={styles.subtaskCount}>{task.subtasks.length}</span>
              <HiChevronDown size={14} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className={styles.subtaskToggle}
              aria-label={t("添加子任务")}
              onClick={() => {
                setSubtasksOpen(true);
                setTimeout(() => subtaskInputRef.current?.focus(), 280);
              }}
            >
              <HiPlus size={13} aria-hidden="true" />
            </button>
          )}
        </div>
        {!subtasksOpen && task.subtasks.length === 0 && (
          <p className={styles.subtaskEmpty}>{t("无子任务")}</p>
        )}
        <AnimatePresence initial={false}>
          {subtasksOpen && (
            <motion.div
              id={`task-subtasks-${task.id}`}
              className={styles.subtaskBody}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <Reorder.Group
                axis="y"
                values={task.subtasks}
                onReorder={(next) => updateTask(task.id, { subtasks: next })}
              >
                {task.subtasks.map((item) => (
                  <SubtaskRow key={item.id} task={task} item={item} />
                ))}
              </Reorder.Group>
              <form
                className={styles.subtaskForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!subtask.trim()) return;
                  updateTask(task.id, {
                    subtasks: [
                      ...task.subtasks,
                      { id: createId(), title: subtask.trim(), completed: false },
                    ],
                  });
                  setSubtask("");
                }}
              >
                <input
                  ref={subtaskInputRef}
                  className={cn("min-w-0 flex-1", styles.subtaskInput)}
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
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.deleteButton}
          aria-label={t("Delete Task")}
          onClick={() => deleteTask(task.id)}
        >
          <HiTrash size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={cn(shared.primary, styles.focusButton)}
          onClick={() => startFocus(task.id)}
        >
          {t("Start Focus Session")}
        </button>
      </footer>
    </>
  );
}

function SubtaskRow({ task, item }: { task: Task; item: Task["subtasks"][number] }) {
  const { t } = useI18n();
  const { updateTask } = useWorkspace();
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);
  // Guard against the blur-commit and row click sharing one gesture.
  const lastCommit = useRef(0);

  const commit = () => {
    const title = draft.trim();
    if (!title || title === item.title) {
      setDraft(item.title);
    } else {
      updateTask(task.id, {
        subtasks: task.subtasks.map((sub) => (sub.id === item.id ? { ...sub, title } : sub)),
      });
    }
    lastCommit.current = Date.now();
    setEditing(false);
  };

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className={cn(styles.subtask, dragging && styles.subtaskDragging)}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      onClick={(event) => {
        // Checkbox, delete and grip keep their own clicks; everything else edits.
        if (editing || (event.target as HTMLElement).closest("button, input")) return;
        if (Date.now() - lastCommit.current < 200) return;
        setDraft(item.title);
        setEditing(true);
      }}
    >
      <button
        type="button"
        className={styles.grip}
        aria-label={t("拖拽排序")}
        tabIndex={-1}
        onPointerDown={(event) => controls.start(event)}
      >
        <HiBars3 size={12} aria-hidden="true" />
      </button>
      <div className={styles.subtaskMain}>
        <input
          type="checkbox"
          checked={item.completed}
          aria-label={t("完成子任务")}
          onChange={() =>
            updateTask(task.id, {
              subtasks: task.subtasks.map((sub) =>
                sub.id === item.id ? { ...sub, completed: !sub.completed } : sub,
              ),
            })
          }
        />
        {editing ? (
          <input
            className={styles.subtaskEdit}
            value={draft}
            aria-label={t("新子任务")}
            maxLength={200}
            autoFocus
            onFocus={(event) => event.target.select()}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              } else if (event.key === "Escape") {
                // Cancel editing without closing the whole detail dialog.
                event.stopPropagation();
                setDraft(item.title);
                setEditing(false);
              }
            }}
          />
        ) : (
          <span className={cn(styles.subtaskTitle, item.completed && styles.done)}>
            {item.title}
          </span>
        )}
      </div>
      <button
        type="button"
        className={styles.subtaskRemove}
        aria-label={t("删除子任务")}
        onClick={() =>
          updateTask(task.id, {
            subtasks: task.subtasks.filter((sub) => sub.id !== item.id),
          })
        }
      >
        <HiXMark size={12} aria-hidden="true" />
      </button>
    </Reorder.Item>
  );
}
