"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { useMemo, useState } from "react";
import { HiArrowUturnLeft, HiPlus } from "react-icons/hi2";
import { AnimatePresence } from "framer-motion";
import { PageHeader, SectionLabel, EmptyState } from "@/components/shared/workspace-ui";
import { TaskRow } from "@/components/task/task-row";
import { useTodayKey } from "@/hooks/use-today-key";
import type { TaskList } from "@/types/task";
import { useWorkspace } from "./workspace-provider";
import { DayCalendar } from "./day-calendar";
import shared from "@/styles/workspace.module.css";
import styles from "./schedule.module.css";

const FILTERS = ["All", "Work", "Study", "Life"] as const;

export function SchedulePage() {
  const { t, label, date: formatDate } = useI18n();
  const { tasks, toggleTask, toggleSubtask, updateTask, selectTask, preferences, setQuickAdd } =
    useWorkspace();
  const todayKey = useTodayKey();
  const [selected, setSelected] = useState(todayKey);
  const [filter, setFilter] = useState<string>("All");

  const datesWithTodos = useMemo(
    () => new Set(tasks.filter((task) => task.date).map((task) => task.date)),
    [tasks],
  );
  const dayTasks = tasks
    .filter((task) => task.date === selected && (filter === "All" || task.list === filter))
    .sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        (a.time || "24:00").localeCompare(b.time || "24:00") ||
        a.created - b.created,
    );
  // 区分「这一天没有任务」和「此清单在这一天被筛空」两种空态
  const dayTaskTotal = tasks.filter((task) => task.date === selected).length;

  const dayLabel = `${formatDate(selected, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })} · ${formatDate(selected, { weekday: "long" })}`;

  return (
    <div className={shared.page}>
      <PageHeader title={t("Schedule")}>
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
          <div className={shared.pills}>
            {FILTERS.map((item) => (
              <button
                key={item}
                className={shared.pill}
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
              >
                {label(item)}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.addButton}
            onClick={() =>
              setQuickAdd({
                list: filter === "All" ? "Inbox" : (filter as TaskList),
                date: selected,
              })
            }
          >
            <HiPlus size={14} aria-hidden="true" /> {t("Add Task")}
          </button>
        </div>
      </PageHeader>
      <DayCalendar
        selectedKey={selected}
        onSelect={setSelected}
        firstDay={preferences.firstDay}
        datesWithTodos={datesWithTodos}
      />
      <section>
        <SectionLabel gold>{dayLabel}</SectionLabel>
        <div className={styles.list}>
          <AnimatePresence mode="popLayout">
            {dayTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onOpen={() => selectTask(task.id)}
                onToggle={() => toggleTask(task.id)}
                onToggleSubtask={(subtaskId) => toggleSubtask(task.id, subtaskId)}
                onUnlock={() => updateTask(task.id, { frozen: false })}
                whenMode="time"
              />
            ))}
          </AnimatePresence>
        </div>
        {!dayTasks.length && (
          <EmptyState title={t("schedule.emptyDay")}>
            {dayTaskTotal > 0 ? t("schedule.emptyFilteredHint") : t("schedule.emptyHint")}
          </EmptyState>
        )}
      </section>
    </div>
  );
}
