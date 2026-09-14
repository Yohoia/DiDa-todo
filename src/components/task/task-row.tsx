"use client";
import { useI18n } from "@/features/preferences/preferences-provider";
import { getTodayKey, isOverdue } from "@/lib/date-utils";

import { HiCheck, HiClock } from "react-icons/hi2";
import { motion } from "framer-motion";
import type { Task } from "@/types/task";
import { cn } from "@/lib/utils";
import taskStyles from "./task-row.module.css";
import workspaceStyles from "@/styles/workspace.module.css";
import { SubtaskPopover } from "./subtask-popover";
import { TaskLockButton } from "./task-lock-button";

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
  /** Today 仅显示时刻；分组页显示全天；跨日期清单显示完整日期和时刻。 */
  whenMode?: "contextual" | "time" | "detailed";
};
export function TaskRow({
  task,
  onToggle,
  onToggleSubtask,
  onOpen,
  onUnlock,
  variant = "default",
  highlight = false,
  whenMode = "contextual",
}: Props) {
  const { t, date: formatDate } = useI18n();
  const isInbox = variant === "inbox";
  const hasSubtasks = task.subtasks.length > 0;
  const hasMeta = task.priority === 1 || task.tags.length > 0 || hasSubtasks;
  const overdue = isOverdue(task.date, task.completed);
  const isToday = task.date === getTodayKey();
  const when = !task.date
    ? t("Any")
    : isToday
      ? task.time || t("Any")
      : formatDate(task.date, { month: "numeric", day: "numeric" });
  const detailedDate = task.date
    ? `${formatDate(task.date, { year: "numeric", month: "short", day: "numeric" })} · ${formatDate(task.date, { weekday: "short" })}`
    : t("No due date");
  const detailedTime = task.date ? task.time || t("All day") : undefined;
  const groupTime = task.time || t("All day");
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
      {!isInbox &&
        (whenMode === "detailed" ? (
          <span className={taskStyles.schedule}>
            <span className={taskStyles.scheduleDate}>{detailedDate}</span>
            {detailedTime && (
              <span className={taskStyles.scheduleTime}>
                <HiClock size={11} aria-hidden="true" /> {detailedTime}
              </span>
            )}
          </span>
        ) : (
          <span
            className={cn(
              taskStyles.time,
              (whenMode === "time" ? !task.time : isAnytime) && taskStyles.timeAny,
            )}
          >
            {whenMode === "time" ? groupTime : when}
          </span>
        ))}
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
      {(overdue || (task.frozen && onUnlock)) && (
        <div className={taskStyles.statuses}>
          {overdue && <span className={taskStyles.overdue}>{t("Overdue")}</span>}
          {task.frozen && onUnlock && <TaskLockButton onUnlock={onUnlock} />}
        </div>
      )}
    </motion.div>
  );
}
