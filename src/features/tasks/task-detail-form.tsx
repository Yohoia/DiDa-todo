"use client";

import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import { HiBars3, HiChevronDown, HiLockClosed, HiPlus, HiTrash, HiXMark } from "react-icons/hi2";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ReminderBell } from "@/components/ui/reminder-bell";
import { TaskLockButton } from "@/components/task/task-lock-button";
import { useI18n } from "@/features/preferences/preferences-provider";
import { useTodayKey } from "@/hooks/use-today-key";
import { cn, createId } from "@/lib/utils";
import type { Task, TaskList } from "@/types/task";
import { canSetTodayFocus } from "./task-focus";
import { RepeatTaskPicker } from "./repeat-task-picker";
import { TaskOrganizationFields } from "./task-organization-fields";
import { TaskContentFields } from "./task-content-fields";
import shared from "@/styles/workspace.module.css";
import styles from "./task-detail.module.css";

export type TaskDetailFormProps = {
  task: Task;
  onChange: (patch: Partial<Task>) => void;
  recurrenceAvailable: boolean;
  dateLocked?: boolean;
  draft?: boolean;
  onDelete?: () => void;
  onStartFocus?: () => void;
  onListChange?: (list: TaskList) => void;
  children?: ReactNode;
};

/** The complete detail form, with writes and immediate actions supplied by the caller. */
export function TaskDetailForm(props: TaskDetailFormProps) {
  const { t } = useI18n();
  const todayKey = useTodayKey();
  const { task, onChange, draft = false } = props;
  const canPromote = canSetTodayFocus(task, todayKey);
  return (
    <>
      <div className={styles.header}>
        <DialogTitle className={styles.badge}>{t("Task Detail")}</DialogTitle>
        <div className={styles.stateActions}>
          <button
            type="button"
            className={styles.oneAction}
            aria-pressed={!!task.featured}
            disabled={draft || (!task.featured && !canPromote)}
            aria-label={task.featured ? t("取消今日专注") : t("Set as today's focus")}
            title={
              draft
                ? t("organize.applyBeforeActions")
                : canPromote || task.featured
                  ? t("One Thing")
                  : t("today.focusTodayOnly")
            }
            onClick={() => onChange({ featured: !task.featured })}
          >
            one
          </button>
          {task.frozen ? (
            <TaskLockButton onUnlock={() => onChange({ frozen: false })} />
          ) : (
            <button
              type="button"
              className={styles.lockAction}
              aria-label={t("Lock task")}
              title={t("Lock task")}
              onClick={() => onChange({ frozen: true })}
            >
              <HiLockClosed size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <DialogDescription className="sr-only">
        {draft ? t("organize.draftHint") : t("编辑任务信息、子任务，或开始专注。")}
      </DialogDescription>
      <TaskEditor {...props} />
    </>
  );
}

export function preserveSubtaskEditOnEscape(event: { preventDefault: () => void }) {
  const active = document.activeElement;
  if (active instanceof HTMLInputElement && active.className.includes("subtaskEdit"))
    event.preventDefault();
}

function TaskEditor({
  task,
  onChange,
  recurrenceAvailable,
  dateLocked = false,
  draft = false,
  onDelete,
  onStartFocus,
  onListChange,
  children,
}: TaskDetailFormProps) {
  const { t } = useI18n();
  const [subtask, setSubtask] = useState("");
  const subtaskInputRef = useRef<HTMLInputElement>(null);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  return (
    <>
      <TaskContentFields
        value={task}
        onChange={(patch) => {
          if (!draft && patch.title !== undefined && !patch.title.trim()) return;
          onChange(patch);
        }}
      />
      <div className={styles.properties}>
        <div className={styles.property}>
          <span>{t("repeat.label")}</span>
          <RepeatTaskPicker
            disabled={!recurrenceAvailable}
            value={task.repeatIntervalDays}
            onChange={(repeatIntervalDays) => onChange({ repeatIntervalDays })}
          />
        </div>
        <TaskOrganizationFields
          value={task}
          dateLocked={dateLocked}
          allowInbox={draft}
          onChange={(patch) => {
            if (patch.list === task.list) return;
            onChange(patch);
            if (patch.list) onListChange?.(patch.list);
          }}
        />
        <div className={styles.property}>
          {t("Reminder")}{" "}
          <ReminderBell value={task.reminder} onChange={(reminder) => onChange({ reminder })} />
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
                onReorder={(next) => onChange({ subtasks: next })}
              >
                {task.subtasks.map((item) => (
                  <SubtaskRow key={item.id} task={task} item={item} onChange={onChange} />
                ))}
              </Reorder.Group>
              <form
                className={styles.subtaskForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!subtask.trim()) return;
                  onChange({
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
          disabled={!onDelete}
          title={!onDelete ? t("organize.applyBeforeActions") : undefined}
          onClick={onDelete}
        >
          <HiTrash size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={cn(shared.primary, styles.focusButton)}
          disabled={!onStartFocus}
          title={!onStartFocus ? t("organize.applyBeforeActions") : undefined}
          onClick={onStartFocus}
        >
          {t("Start Focus Session")}
        </button>
      </footer>
      {children}
    </>
  );
}

function SubtaskRow({
  task,
  item,
  onChange,
}: {
  task: Task;
  item: Task["subtasks"][number];
  onChange: TaskDetailFormProps["onChange"];
}) {
  const { t } = useI18n();
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
      onChange({
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
            onChange({
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
          onChange({
            subtasks: task.subtasks.filter((sub) => sub.id !== item.id),
          })
        }
      >
        <HiXMark size={12} aria-hidden="true" />
      </button>
    </Reorder.Item>
  );
}
