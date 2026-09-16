"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { useEffect, useRef, useState } from "react";
import { HiChevronDown, HiChevronLeft, HiChevronRight, HiClock, HiXMark } from "react-icons/hi2";
import { AnimatePresence, motion } from "framer-motion";
import { SectionLabel, EmptyState } from "@/components/shared/workspace-ui";
import { TaskRow } from "@/components/task/task-row";
import { SubtaskPopover } from "@/components/task/subtask-popover";
import { useTodayKey } from "@/hooks/use-today-key";
import { useWorkspace } from "./workspace-provider";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";
import shared from "@/styles/workspace.module.css";
import styles from "./today.module.css";

/** 分页切换：根据方向左右滑入滑出 */
const pageVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};

export function TodayPage() {
  const { t, date: formatDate } = useI18n();
  const { tasks, preferences, selectTask, toggleTask, toggleSubtask, startFocus, updateTask } =
    useWorkspace();
  const todayKey = useTodayKey();
  const today = tasks.filter((task) => task.date === todayKey);
  const active = today.filter((task) => !task.completed);
  const featured = today.find((task) => task.featured && !task.completed);
  const [year, month, day] = todayKey.split("-").map(Number);
  const todayLine = `${year} / ${month} / ${day} ${formatDate(todayKey, { weekday: "long" })}`;
  const timelineTasks = today.filter((task) => !task.frozen && !task.featured);
  const timedTasks = timelineTasks
    .filter((task) => task.time)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const anytimeTasks = timelineTasks.filter((task) => !task.time);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);
  const [atBottom, setAtBottom] = useState(false);
  const syncScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollMore(el.scrollHeight > el.clientHeight + 2);
    setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
  };
  useEffect(syncScrollState, [timedTasks.length]);
  // 随时 / 今日必做：每页三条，左右方向感知的分页切换
  const PAGE_SIZE = 3;
  const mustDoTasks = today.filter((task) => task.frozen);
  const [anyPage, setAnyPage] = useState(0);
  const [anyDir, setAnyDir] = useState(1);
  const [mustPage, setMustPage] = useState(0);
  const [mustDir, setMustDir] = useState(1);
  const anyPages = Math.max(1, Math.ceil(anytimeTasks.length / PAGE_SIZE));
  const anyPageSafe = Math.min(anyPage, anyPages - 1);
  const anyPaged = anytimeTasks.slice(anyPageSafe * PAGE_SIZE, anyPageSafe * PAGE_SIZE + PAGE_SIZE);
  const mustPages = Math.max(1, Math.ceil(mustDoTasks.length / PAGE_SIZE));
  const mustPageSafe = Math.min(mustPage, mustPages - 1);
  const mustPaged = mustDoTasks.slice(
    mustPageSafe * PAGE_SIZE,
    mustPageSafe * PAGE_SIZE + PAGE_SIZE,
  );
  const renderRow = (task: Task) => (
    <TaskRow
      key={task.id}
      task={task}
      onOpen={() => selectTask(task.id)}
      onToggle={() => toggleTask(task.id)}
      onToggleSubtask={(subtaskId) => toggleSubtask(task.id, subtaskId)}
    />
  );
  return (
    <div className={styles.journal}>
      <header>
        <h1 className={shared.subtitle}>
          {todayLine}
          <span
            className={styles.capacity}
            role="progressbar"
            aria-label={t("今日任务容量")}
            aria-valuenow={active.length}
            aria-valuemin={0}
            aria-valuemax={preferences.dailyCapacity}
          >
            <span>{t("Capacity")}</span>
            <span className={styles.dots}>
              {Array.from(
                { length: Math.max(preferences.dailyCapacity, active.length) },
                (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      styles.dot,
                      i < active.length &&
                        (i < preferences.dailyCapacity ? styles.dotOn : styles.dotOver),
                    )}
                  />
                ),
              )}
            </span>
            <strong>
              {active.length}/{preferences.dailyCapacity}
            </strong>
          </span>
        </h1>
      </header>
      <section className={styles.focusSection}>
        <SectionLabel>{t("Today's Focus")}</SectionLabel>
        {featured ? (
          <article className={styles.oneThing}>
            <div className={styles.focusHeader}>
              <span className={styles.badge}>{t("Today's Focus")}</span>
              <button
                type="button"
                className={styles.clearFocus}
                aria-label={t("取消今日专注")}
                title={t("取消今日专注")}
                onClick={() => updateTask(featured.id, { featured: false })}
              >
                <HiXMark size={19} aria-hidden="true" />
              </button>
            </div>
            <button
              className={styles.featureButton}
              onClick={() => selectTask(featured.id)}
              aria-label={t("tasks.open", { title: featured.title })}
            >
              <h2>{featured.title}</h2>
            </button>
            <div className={styles.meta}>
              {featured.tags.map((tag) => (
                <span key={tag} className={shared.tag}>
                  #{tag}
                </span>
              ))}
              {featured.priority === 1 && (
                <span className="inline-flex items-center gap-1">
                  <HiClock size={13} aria-hidden="true" />
                  {featured.estimate}
                </span>
              )}
              {featured.subtasks.length > 0 && (
                <SubtaskPopover
                  subtasks={featured.subtasks}
                  onToggle={(subtaskId) => toggleSubtask(featured.id, subtaskId)}
                />
              )}
            </div>
            <motion.button
              className={cn(shared.primary, styles.focusStart)}
              onClick={() => startFocus(featured.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {t("Start Deep Work")}
            </motion.button>
          </article>
        ) : (
          <EmptyState title={t("A little room to breathe")}>
            {t("Your focus is complete. Enjoy the progress.")}
          </EmptyState>
        )}
      </section>
      <section className={styles.mustDoSection}>
        <SectionLabel>{t("Today's Must-Dos")}</SectionLabel>
        <div className={styles.pageViewport}>
          <AnimatePresence mode="popLayout" custom={mustDir} initial={false}>
            <motion.div
              key={mustPageSafe}
              custom={mustDir}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="flex flex-col"
            >
              {mustPaged.map(renderRow)}
            </motion.div>
          </AnimatePresence>
        </div>
        {mustPages > 1 && (
          <div className={styles.pageNav}>
            <button
              type="button"
              className={styles.pageArrow}
              aria-label={t("上一页")}
              disabled={mustPageSafe === 0}
              onClick={() => {
                setMustDir(-1);
                setMustPage(Math.max(0, mustPageSafe - 1));
              }}
            >
              <HiChevronLeft size={16} />
            </button>
            <span className={styles.pageIndicator}>
              {mustPageSafe + 1}/{mustPages}
            </span>
            <button
              type="button"
              className={styles.pageArrow}
              aria-label={t("下一页")}
              disabled={mustPageSafe === mustPages - 1}
              onClick={() => {
                setMustDir(1);
                setMustPage(Math.min(mustPages - 1, mustPageSafe + 1));
              }}
            >
              <HiChevronRight size={16} />
            </button>
          </div>
        )}
      </section>
      <section className={styles.anySection}>
        {anytimeTasks.length > 0 && (
          <>
            <SectionLabel>{t("Any")}</SectionLabel>
            <div className={styles.pageViewport}>
              <AnimatePresence mode="popLayout" custom={anyDir} initial={false}>
                <motion.div
                  key={anyPageSafe}
                  custom={anyDir}
                  variants={pageVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                  className="flex flex-col"
                >
                  {anyPaged.map(renderRow)}
                </motion.div>
              </AnimatePresence>
              {anyPages > 1 && (
                <div className={styles.pageDots}>
                  {Array.from({ length: anyPages }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`${i + 1} / ${anyPages}`}
                      className={cn(styles.pageDot, i === anyPageSafe && styles.pageDotOn)}
                      onClick={() => {
                        setAnyDir(i > anyPageSafe ? 1 : -1);
                        setAnyPage(i);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
      <section className={styles.timeline}>
        <SectionLabel>{t("Timeline")}</SectionLabel>
        {timedTasks.length === 0 && (
          <div className={styles.timelineEmpty}>
            {anytimeTasks.length === 0 && (
              <span className={styles.emptyMark}>
                <HiClock size={15} aria-hidden="true" />
              </span>
            )}
            <p>{t("暂无编排")}</p>
            {anytimeTasks.length === 0 && (
              <span className={styles.emptyHint}>{t("今天的时间轴还空着")}</span>
            )}
          </div>
        )}
        <div ref={scrollRef} className={styles.timedScroll} onScroll={syncScrollState}>
          <div className={styles.timedGroup}>
            <span className={cn(styles.railCap, styles.railCapTop)} aria-hidden="true" />
            <AnimatePresence mode="popLayout">
              {timedTasks.map((task) => (
                <div key={task.id} className={styles.timedItem}>
                  {renderRow(task)}
                </div>
              ))}
            </AnimatePresence>
            <span className={cn(styles.railCap, styles.railCapBottom)} aria-hidden="true" />
          </div>
        </div>
        <AnimatePresence>
          {canScrollMore && !atBottom && (
            <motion.div
              className={styles.scrollHint}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <motion.div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                }}
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              >
                <span>{t("向下滚动")}</span>
                <span className={styles.scrollHintArrow} aria-hidden="true">
                  <HiChevronDown size={14} />
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
