"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import Link from "next/link";
import { HiClock } from "react-icons/hi2";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader, SectionLabel, EmptyState } from "@/components/shared/workspace-ui";
import { TaskRow } from "@/components/task/task-row";
import { SubtaskPopover } from "@/components/task/subtask-popover";
import { useWorkspace } from "./workspace-provider";
import { DEMO_TODAY } from "./demo-data";
import { cn } from "@/lib/utils";
import shared from "@/styles/workspace.module.css";
import styles from "./today.module.css";

export function TodayPage() {
  const { t, date: formatDate } = useI18n();
  const { tasks, preferences, selectTask, toggleTask, toggleSubtask, startFocus, updateTask } =
    useWorkspace();
  const today = tasks.filter((task) => task.date === DEMO_TODAY);
  const active = today.filter((task) => !task.completed);
  const featured = today.find((task) => task.featured && !task.completed);
  const now = new Date();
  const todayLine = `${now.getFullYear()} / ${now.getMonth() + 1} / ${now.getDate()} ${formatDate(now, { weekday: "long" })}`;
  return (
    <div className={styles.journal}>
      <div className={styles.left}>
        <PageHeader
          title={
            <>
              {t("Good morning,")} <em>Alex</em>
            </>
          }
          subtitle={todayLine}
        />
        <div
          className={styles.capacity}
          role="progressbar"
          aria-label={t("今日任务容量")}
          aria-valuenow={active.length}
          aria-valuemin={0}
          aria-valuemax={preferences.dailyCapacity}
        >
          <span>{t("Capacity")}</span>
          <span className={styles.dots}>
            {Array.from({ length: Math.max(preferences.dailyCapacity, active.length) }, (_, i) => (
              <span
                key={i}
                className={cn(
                  styles.dot,
                  i < active.length &&
                    (i < preferences.dailyCapacity ? styles.dotOn : styles.dotOver),
                )}
              />
            ))}
          </span>
          <strong>
            {active.length}/{preferences.dailyCapacity}
          </strong>
        </div>
        <section>
          <SectionLabel>{t("Today's Focus")}</SectionLabel>
          {featured ? (
            <article className={styles.oneThing}>
              <button
                className={styles.featureButton}
                onClick={() => selectTask(featured.id)}
                aria-label={t("tasks.open", { title: featured.title })}
              >
                <span className={shared.row}>
                  <span className={styles.badge}>{t("One Thing")}</span>
                  <HiClock size={18} className={shared.gold} />
                </span>
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
                className={shared.primary}
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
        <section>
          <SectionLabel>{t("Today's Must-Dos")}</SectionLabel>
          <AnimatePresence mode="popLayout">
            {today
              .filter((task) => task.frozen)
              .map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onOpen={() => selectTask(task.id)}
                  onToggle={() => toggleTask(task.id)}
                  onToggleSubtask={(subtaskId) => toggleSubtask(task.id, subtaskId)}
                  onToggleFeatured={() => updateTask(task.id, { featured: !task.featured })}
                />
              ))}
          </AnimatePresence>
        </section>
      </div>
      <div className={styles.right}>
        <section className={styles.timeline}>
          <SectionLabel>{t("Timeline")}</SectionLabel>
          <div className="flex flex-col gap-2.5">
            <AnimatePresence mode="popLayout">
              {today
                .filter((task) => !task.frozen && !task.featured)
                .map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onOpen={() => selectTask(task.id)}
                    onToggle={() => toggleTask(task.id)}
                    onToggleSubtask={(subtaskId) => toggleSubtask(task.id, subtaskId)}
                    onToggleFeatured={() => updateTask(task.id, { featured: !task.featured })}
                  />
                ))}
            </AnimatePresence>
          </div>
        </section>
        <div className={shared.actions}>
          <Link className={shared.textButton} href="/upcoming">
            {t("Upcoming →")}
          </Link>
          <Link className={shared.textButton} href="/list-detail">
            {t("Work & Projects →")}
          </Link>
        </div>
      </div>
    </div>
  );
}
