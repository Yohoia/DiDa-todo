"use client";
import { useI18n } from "@/features/preferences/preferences-provider";
import { isDemoToday } from "@/lib/date-utils";

import { HiCheck, HiClock, HiLockClosed, HiLockOpen } from "react-icons/hi2";
import { motion } from "framer-motion";
import type { Task } from "@/types/task";
import { cn } from "@/lib/utils";
import taskStyles from "./task-row.module.css";
import workspaceStyles from "@/styles/workspace.module.css";
import { SubtaskPopover } from "./subtask-popover";

type Props = {
  task: Task;
  onToggle: () => void;
  onToggleSubtask: (subtaskId: string) => void;
  onOpen: () => void;
  onUnlock?: () => void;
  /** 收件箱变体：无时间锚点，用「草稿/便签」样式区分未整理项 */
  variant?: "default" | "inbox";
  /** 刚捕获的条目播放一次高亮动画 */
  highlight?: boolean;
};
export function TaskRow({
  task,
  onToggle,
  onToggleSubtask,
  onOpen,
  onUnlock,
  variant = "default",
  highlight = false,
}: Props) {
  const { t, date: formatDate } = useI18n();
  const isInbox = variant === "inbox";
  const hasSubtasks = task.subtasks.length > 0;
  const hasMeta = task.priority === 1 || task.tags.length > 0 || hasSubtasks;
  const isToday = task.date && isDemoToday(task.date);
  const when = !task.date
    ? t("Any")
    : isToday
      ? task.time || t("Any")
      : formatDate(task.date, { month: "numeric", day: "numeric" });
  // 「随时」没有时间锚点，时间槽用弱化样式与真实时间区分
  const isAnytime = when === t("Any");
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        taskStyles.row,
        isInbox && taskStyles.inboxRow,
        highlight && taskStyles.inboxRowNew,
        task.completed && taskStyles.completed,
        task.frozen && taskStyles.frozen,
      )}
    >
      {!isInbox && !task.frozen && (
        <span className={cn(taskStyles.time, isAnytime && taskStyles.timeAny)}>{when}</span>
      )}
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={t("tasks.complete", { title: task.title })}
        onClick={onToggle}
        className={taskStyles.checkButton}
      >
        <span className={taskStyles.checkbox}>{task.completed && <HiCheck size={12} />}</span>
      </button>
      <div className={taskStyles.content}>
        <button
          type="button"
          className={taskStyles.contentButton}
          onClick={onOpen}
          aria-label={t("tasks.open", { title: task.title })}
        >
          <span className={taskStyles.title}>{task.title}</span>
        </button>
        {hasMeta && (
          <div className={taskStyles.meta}>
            {task.priority === 1 ? (
              <span className="inline-flex items-center gap-1">
                <HiClock size={13} aria-hidden="true" />
                {task.estimate}
              </span>
            ) : (
              task.tags.map((tag) => (
                <span key={tag} className={workspaceStyles.tag}>
                  #{tag}
                </span>
              ))
            )}
            {hasSubtasks && <SubtaskPopover subtasks={task.subtasks} onToggle={onToggleSubtask} />}
          </div>
        )}
      </div>
      {task.frozen && onUnlock && (
        <button
          type="button"
          className={taskStyles.commitmentButton}
          aria-label={t("解除今日必做")}
          title={t("解除今日必做")}
          onClick={(event) => {
            event.stopPropagation();
            onUnlock();
          }}
        >
          <span className={taskStyles.commitmentIcons} aria-hidden="true">
            <HiLockClosed size={17} className={taskStyles.lockedIcon} />
            <HiLockOpen size={17} className={taskStyles.unlockedIcon} />
          </span>
        </button>
      )}
    </motion.div>
  );
}
