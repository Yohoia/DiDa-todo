"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { HiArrowUturnLeft, HiSparkles } from "react-icons/hi2";
import { PageHeader, SectionLabel } from "@/components/shared/workspace-ui";
import { TaskRow } from "@/components/task/task-row";
import { useTodayKey } from "@/hooks/use-today-key";
import { useWorkspace } from "./workspace-provider";
import { DayCalendar } from "./day-calendar";
import { CaptureDialog } from "./capture-dialog";
import shared from "@/styles/workspace.module.css";
import styles from "./schedule.module.css";

/** 收件箱 = 日程页：日历按天查看当天任务；「/」捕获直接记到今天，AI 整理入口在头部 */
export function InboxPage() {
  const { t, date: formatDate } = useI18n();
  const { tasks, addTask, toggleTask, toggleSubtask, deleteTask, selectTask, preferences, notify } =
    useWorkspace();
  const todayKey = useTodayKey();
  const [selected, setSelected] = useState(todayKey);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  // 「记一笔」捕获弹窗：按 / 或点头部 / 图标呼出，条目按今天日期保存
  const [captureOpen, setCaptureOpen] = useState(false);

  // 「/」随手呼出捕获弹窗（不打断正在输入的其它控件）
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/") return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      event.preventDefault();
      setCaptureOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const datesWithTodos = useMemo(
    () => new Set(tasks.filter((task) => task.date).map((task) => task.date)),
    [tasks],
  );
  const dayTasks = tasks
    .filter((task) => task.date === selected)
    .sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        (a.time || "24:00").localeCompare(b.time || "24:00") ||
        a.created - b.created,
    );

  const dayLabel = `${formatDate(selected, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })} · ${formatDate(selected, { weekday: "long" })}`;

  // 捕获直接记到今天（收件箱清单）：跳回今天，让新条目带高亮立即可见
  const handleCapture = (title: string) => {
    const id = addTask(title, "Inbox", todayKey);
    if (id) setJustAddedId(id);
    setSelected(todayKey);
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
              onClick={() => notify({ key: "AI 整理功能开发中" })}
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
            <div className={styles.list}>
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
            </div>
            {!dayTasks.length && (
              <div className={shared.inboxEmpty}>
                <Image
                  className={shared.inboxEmptyImage}
                  src="/noschedule.png"
                  alt={t("schedule.emptyDay")}
                  width={1312}
                  height={1199}
                  sizes="(max-width: 640px) 64vw, 340px"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
      <CaptureDialog open={captureOpen} onOpenChange={setCaptureOpen} onCapture={handleCapture} />
    </div>
  );
}
