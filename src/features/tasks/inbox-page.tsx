"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import noScheduleImage from "../../../public/noschedule.png";
import { AnimatePresence, motion } from "framer-motion";
import { HiArrowUturnLeft, HiSparkles } from "react-icons/hi2";
import { PageHeader, SectionLabel } from "@/components/shared/workspace-ui";
import { TaskRow } from "@/components/task/task-row";
import { useTodayKey } from "@/hooks/use-today-key";
import { useWorkspace } from "./workspace-provider";
import { DayCalendar } from "./day-calendar";
import { CaptureDialog } from "./capture-dialog";
import { AiOrganizeDialog } from "./ai-organize-dialog";
import type { TaskCaptureDraft } from "./task-capture";
import type { TaskOrganizationDraft } from "@/types/task-organization";
import shared from "@/styles/workspace.module.css";
import styles from "./schedule.module.css";

/** 收件箱按天浏览；「/」默认记到今天，明确的自然语言日期覆盖默认值。 */
export function InboxPage() {
  const { t, date: formatDate } = useI18n();
  const {
    tasks,
    saveCapturedTasks,
    applyTaskOrganization,
    toggleTask,
    toggleSubtask,
    deleteTask,
    selectTask,
    preferences,
    notify,
    focusId,
    voiceCapture,
  } = useWorkspace();
  const todayKey = useTodayKey();
  const [selected, setSelected] = useState(todayKey);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  // 「记一笔」默认今天，明确日期/时间先展示预览，保存成功后才显示回执。
  const [captureOpen, setCaptureOpen] = useState(false);
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [organizeCandidates, setOrganizeCandidates] = useState<typeof tasks>([]);

  // 「/」随手呼出捕获弹窗（不打断正在输入的其它控件）
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/") return;
      if (
        event.isComposing ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.defaultPrevented ||
        focusId ||
        voiceCapture ||
        document.querySelector('[role="dialog"]')
      )
        return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      event.preventDefault();
      setCaptureOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusId, voiceCapture]);

  const datesWithTodos = useMemo(
    () => new Set(tasks.filter((task) => task.date).map((task) => task.date)),
    [tasks],
  );
  const dayTasks = tasks
    .filter((task) => task.date === selected)
    .sort((a, b) => {
      const completionOrder = Number(a.completed) - Number(b.completed);
      if (completionOrder) return completionOrder;
      if (a.time && b.time) return a.time.localeCompare(b.time) || a.priority - b.priority;
      if (a.time) return -1;
      if (b.time) return 1;
      return a.priority - b.priority || a.created - b.created;
    });

  const dayLabel = `${formatDate(selected, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })} · ${formatDate(selected, { weekday: "long" })}`;
  const hasDayTasks = dayTasks.length > 0;
  const unscheduled = tasks
    .filter((task) => !task.date && !task.completed)
    .sort((a, b) => a.priority - b.priority || a.created - b.created);

  // 捕获成功后跳到最终日期并高亮新条目，失败保留输入供重试。
  const handleCapture = async (draft: TaskCaptureDraft) => {
    const result = await saveCapturedTasks([draft]);
    if (!result.savedIds.length) return false;
    setJustAddedId(draft.id);
    setSelected(draft.date || todayKey);
    return true;
  };

  const startOrganizing = () => {
    const candidates = dayTasks.filter((task) => !task.completed);
    if (!candidates.length) {
      notify({ key: "这一天没有需要整理的待办" });
      return;
    }
    // 固定本轮快照：AI 返回前用户切换日期，也不会误改另一天的任务。
    setOrganizeCandidates(candidates);
    setOrganizeOpen(true);
  };

  const applyOrganization = async (suggestions: TaskOrganizationDraft[]) => {
    const result = await applyTaskOrganization(organizeCandidates, suggestions);
    setOrganizeOpen(false);
    notify({
      key: "organize.applicationResult",
      values: { applied: result.applied, skipped: result.skipped, failed: result.failed },
    });
  };

  return (
    <div className={shared.page}>
      <PageHeader title={t("Inbox")} subtitle={t("收集想法，随录随整理。")}>
        <div className={styles.headerActions}>
          {selected !== todayKey && (
            <button
              type="button"
              className={shared.textButton}
              onClick={() => setSelected(todayKey)}
            >
              <HiArrowUturnLeft size={14} aria-hidden="true" /> {t("回到今天")}
            </button>
          )}
          <div className={styles.iconGroup}>
            <motion.button
              type="button"
              className={styles.iconTrigger}
              onClick={() => setCaptureOpen(true)}
              aria-label={t("记一笔")}
              aria-keyshortcuts="/"
              title={`${t("记一笔")} ( / )`}
              whileTap={{ scale: 0.94 }}
            >
              <span className={styles.slashGlyph} aria-hidden="true">
                /
              </span>
            </motion.button>
            <motion.button
              type="button"
              className={styles.iconTrigger}
              onClick={startOrganizing}
              aria-label={t("AI 整理")}
              title={t("AI 整理")}
              whileTap={{ scale: 0.94 }}
            >
              <HiSparkles size={15} aria-hidden="true" />
            </motion.button>
          </div>
        </div>
      </PageHeader>
      <DayCalendar
        selectedKey={selected}
        onSelect={setSelected}
        firstDay={preferences.firstDay}
        datesWithTodos={datesWithTodos}
      />
      <section>
        {/* 切换日期时整块（日期标签 + 列表 + 空态）交叉淡入淡出，行级增删由内层 popLayout 接管 */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <SectionLabel gold>{dayLabel}</SectionLabel>
            <div className={styles.contentStage}>
              {/* 空状态始终在背景中预加载；最后一行退场后再延迟淡入，避免图片解码与布局跳变撞帧。 */}
              <motion.div
                className={styles.emptyLayer}
                aria-hidden={hasDayTasks || undefined}
                initial={false}
                animate={
                  hasDayTasks ? { opacity: 0, y: 8, scale: 0.985 } : { opacity: 1, y: 0, scale: 1 }
                }
                transition={
                  hasDayTasks
                    ? { duration: 0.14, ease: "easeOut" }
                    : { duration: 0.28, delay: 0.16, ease: [0.22, 1, 0.36, 1] }
                }
              >
                <Image
                  className={shared.inboxEmptyImage}
                  src={noScheduleImage}
                  alt={t("schedule.emptyDay")}
                  placeholder="blur"
                  loading="eager"
                  sizes="(max-width: 640px) 64vw, 340px"
                />
              </motion.div>
              <AnimatePresence initial={false}>
                {hasDayTasks && (
                  <motion.div
                    key="task-list"
                    className={styles.list}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -7 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {dayTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          highlight={task.id === justAddedId}
                          onOpen={() => selectTask(task.id)}
                          onToggle={() => toggleTask(task.id)}
                          onToggleSubtask={(subtaskId) => toggleSubtask(task.id, subtaskId)}
                          onDelete={() => deleteTask(task.id)}
                          whenMode="time"
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
      {unscheduled.length > 0 && (
        <section className="mt-10">
          <SectionLabel>{t("tasks.unscheduled")}</SectionLabel>
          <p className={shared.muted}>{t("tasks.unscheduledHint")}</p>
          <AnimatePresence mode="popLayout" initial={false}>
            {unscheduled.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onOpen={() => selectTask(task.id)}
                onToggle={() => toggleTask(task.id)}
                onToggleSubtask={(id) => toggleSubtask(task.id, id)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </AnimatePresence>
        </section>
      )}
      <CaptureDialog
        today={todayKey}
        open={captureOpen}
        onOpenChange={setCaptureOpen}
        onCapture={handleCapture}
      />
      {organizeOpen && (
        <AiOrganizeDialog
          open
          onOpenChange={setOrganizeOpen}
          date={selected}
          tasks={organizeCandidates}
          pomodoroMinutes={preferences.duration}
          onApply={applyOrganization}
        />
      )}
    </div>
  );
}
