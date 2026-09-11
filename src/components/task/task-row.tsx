"use client";
import { useI18n } from "@/features/preferences/preferences-provider";
import { isDemoToday } from "@/lib/date-utils";

import { HiCheck, HiClock, HiLockClosed, HiChevronRight } from "react-icons/hi2";
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
  onToggleFeatured?: () => void;
};
export function TaskRow({ task, onToggle, onToggleSubtask, onOpen, onToggleFeatured }: Props) {
  const { t, date: formatDate } = useI18n();
  const hasSubtasks = task.subtasks.length > 0;
  const hasMeta = task.tags.length > 0 || hasSubtasks;
  const isToday = task.date && isDemoToday(task.date);
  const when = !task.date
    ? t("Any")
    : isToday
      ? task.time || t("Any")
      : formatDate(task.date, { month: "numeric", day: "numeric" });
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        taskStyles.row,
        task.completed && taskStyles.completed,
        task.frozen && taskStyles.frozen,
      )}
    >
      {!task.frozen && <span className={taskStyles.time}>{when}</span>}
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
          <span className={taskStyles.title}>
            {task.title}{" "}
            {task.frozen && <HiLockClosed size={12} className="inline" aria-label={t("已承诺")} />}
          </span>
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
      {isToday && onToggleFeatured && (
        <motion.button
          type="button"
          className={cn(taskStyles.oneThingTrigger, task.featured && taskStyles.featured)}
          aria-label={task.featured ? t("取消今日专注") : t("设为今日专注")}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFeatured();
          }}
          initial={{ x: 20 }}
          animate={{ x: task.featured ? 0 : 20 }}
          whileHover={{ x: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <span className={taskStyles.oneThingLabel}>One Thing</span>
          <HiChevronRight size={16} className={taskStyles.oneThingArrow} />
        </motion.button>
      )}
    </motion.div>
  );
}
