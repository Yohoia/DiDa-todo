"use client";
import { useI18n } from "@/features/preferences/preferences-provider";
import { getTodayKey, isOverdue } from "@/lib/date-utils";

import { HiCheck, HiClock, HiLockClosed, HiOutlineTrash } from "react-icons/hi2";
import { motion } from "framer-motion";
import type { Task } from "@/types/task";
import { cn } from "@/lib/utils";
import taskStyles from "./task-row.module.css";
import workspaceStyles from "@/styles/workspace.module.css";
import { SubtaskPopover } from "./subtask-popover";

type Props = {
  task: Task;
  /** 不传（如 Inbox 收集场景）则整行不渲染完成勾选，子任务仅只读展示 */
  onToggle?: () => void;
  onToggleSubtask?: (subtaskId: string) => void;
  onOpen: () => void;
  /** 行内快捷删除：不传则不渲染删除按钮（详情页仍有删除入口） */
  onDelete?: () => void;
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
  onDelete,
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
  // 当日整理页中未指定具体时刻的任务属于“随时”，而不是占据全天的日程块。
  const groupTime = task.time || t("随时");
  // 「随时」没有时间锚点，时间槽用弱化样式与真实时间区分
  const isAnytime = when === t("Any");
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      // 数据立即移除，AnimatePresence 保留 DOM 完成唯一一次退场，避免二次删除与二段动画。
      exit={{ opacity: 0, x: 46, scale: 0.98 }}
      transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        taskStyles.row,
        isInbox && taskStyles.inboxRow,
        highlight && taskStyles.inboxRowNew,
        task.completed && taskStyles.completed,
        task.frozen && taskStyles.frozen,
        overdue && taskStyles.overdueRow,
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
      {onToggle && (
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
      )}
      <div className={taskStyles.content}>
        <button
          type="button"
          className={taskStyles.contentButton}
          onClick={onOpen}
          aria-label={t("tasks.open", { title: task.title })}
        >
          <span className={taskStyles.title}>{task.title}</span>
          {/* One Thing 仅为状态展示，跟在标题后；切换请进详情 */}
          {task.featured && (
            <span className={taskStyles.oneMark} title={t("One Thing")}>
              one
            </span>
          )}
          {/* 锁定仅为状态展示，跟在标题后；切换请进详情 */}
          {task.frozen && (
            <HiLockClosed size={13} className={taskStyles.lockMark} aria-hidden="true" />
          )}
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
      {overdue && <span className="sr-only">{t("Overdue")}</span>}
      {/* 删除：悬停浮现于右缘（触屏常驻），不占行内布局 */}
      {onDelete && (
        <motion.button
          type="button"
          className={taskStyles.deleteButton}
          aria-label={t("Delete Task")}
          onClick={onDelete}
          whileTap={{ scale: 0.86 }}
        >
          <HiOutlineTrash size={15} aria-hidden="true" />
        </motion.button>
      )}
    </motion.div>
  );
}
