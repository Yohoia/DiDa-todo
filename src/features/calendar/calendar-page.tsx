"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/workspace-ui";
import { useWorkspace } from "@/features/tasks/workspace-provider";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";
import shared from "@/styles/workspace.module.css";
import styles from "./calendar.module.css";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}
function weekStart(date: Date, sunday: boolean) {
  return addDays(date, -((date.getDay() + (sunday ? 0 : 6)) % 7));
}

export function CalendarPage() {
  const { t, label, locale } = useI18n();
  const { tasks, selectTask, preferences, setQuickAdd } = useWorkspace();
  const [view, setView] = useState("Week");
  const [anchor, setAnchor] = useState(new Date(2026, 8, 9, 12));
  const sunday = preferences.firstDay === "Sunday";
  const start = weekStart(anchor, sunday);
  const days =
    view === "Day"
      ? [anchor]
      : Array.from({ length: sunday ? 7 : 5 }, (_, index) => addDays(start, index));
  const datedTasks = tasks.filter((task) => !task.completed && task.date);
  const events = datedTasks.flatMap((task) =>
    task.schedule ? [{ task, ...task.schedule, label: task.schedule.label || task.title }] : [],
  );
  function move(direction: number) {
    setAnchor(
      view === "Month"
        ? new Date(anchor.getFullYear(), anchor.getMonth() + direction, 9, 12)
        : addDays(anchor, direction * (view === "Week" ? 7 : 1)),
    );
  }
  const shownEvents = events.filter((event) => days.some((day) => dateKey(day) === event.date));
  const firstHour = Math.min(9, ...shownEvents.map((event) => event.hour));
  const lastHour = Math.max(11, ...shownEvents.map((event) => event.hour));
  const monthStart = weekStart(new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12), sunday);
  const monthLength = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const leadingDays =
    (new Date(anchor.getFullYear(), anchor.getMonth(), 1).getDay() + (sunday ? 0 : 6)) % 7;
  const monthCells = Math.ceil((leadingDays + monthLength) / 7) * 7;
  const weekdays = sunday
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  function eventButton(task: Task, label: string, time?: string, height?: number) {
    return (
      <button
        key={task.id}
        className={cn(styles.event, task.priority === 1 && styles.highPriority)}
        style={height ? { height } : undefined}
        onClick={() => selectTask(task.id)}
        aria-label={t("calendar.open", { title: task.title })}
      >
        {time && <span className={styles.eventTime}>{time}</span>}
        <strong>{label}</strong>
      </button>
    );
  }
  return (
    <div className={cn(shared.page, styles.page)}>
      <PageHeader
        title={t("Schedule")}
        subtitle={anchor.toLocaleDateString(locale, { month: "long", year: "numeric" })}
      >
        <div className={styles.switcher}>
          {["Day", "Week", "Month"].map((item) => (
            <button
              key={item}
              className={cn(styles.viewButton, item === view && styles.active)}
              aria-pressed={item === view}
              onClick={() => setView(item)}
            >
              {label(item)}
            </button>
          ))}
        </div>
      </PageHeader>
      <div className={styles.viewContent}>
        {view === "Month" ? (
          <div className={styles.month}>
            {weekdays.map((day) => (
              <div className={styles.dayHeader} key={day}>
                {new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
                  new Date(
                    Date.UTC(
                      2026,
                      8,
                      6 + ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day),
                    ),
                  ),
                )}
              </div>
            ))}
            {Array.from({ length: monthCells }, (_, index) => {
              const day = addDays(monthStart, index);
              const key = dateKey(day);
              return (
                <div
                  className={cn(
                    styles.monthDay,
                    day.getMonth() !== anchor.getMonth() && styles.outside,
                  )}
                  key={key}
                >
                  <button
                    className={cn(styles.dayNumber, key === "2026-09-09" && styles.today)}
                    aria-label={t("calendar.day", { date: key })}
                    onClick={() => {
                      setAnchor(day);
                      setView("Day");
                    }}
                  >
                    {day.getDate()}
                  </button>
                  {datedTasks
                    .filter((task) => task.date === key)
                    .map((task) => eventButton(task, task.title))}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className={styles.week}
            style={{ gridTemplateColumns: `60px repeat(${days.length}, minmax(110px, 1fr))` }}
          >
            <div />
            <>
              {days.map((day) => (
                <div
                  className={cn(
                    styles.dayHeader,
                    dateKey(day) === "2026-09-09" && styles.todayHeader,
                  )}
                  key={dateKey(day)}
                >
                  {day.toLocaleDateString(locale, { weekday: "short" })}
                  <strong>{day.getDate()}</strong>
                </div>
              ))}
            </>
            {Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index).map(
              (hour) => (
                <Fragment key={hour}>
                  <div className={styles.time}>{String(hour).padStart(2, "0")}:00</div>
                  {days.map((day) => (
                    <div className={styles.cell} key={dateKey(day)}>
                      {events
                        .filter((event) => event.date === dateKey(day) && event.hour === hour)
                        .map((event) =>
                          eventButton(
                            event.task,
                            event.label,
                            `${String(hour).padStart(2, "0")}:00 - ${String(hour + Math.floor(event.duration / 60)).padStart(2, "0")}:${String(event.duration % 60).padStart(2, "0")}`,
                            event.duration > 60 ? 110 : event.duration === 45 ? 50 : 55,
                          ),
                        )}
                    </div>
                  ))}
                </Fragment>
              ),
            )}
          </div>
        )}
      </div>
      <div className={shared.row}>
        <div className={shared.actions}>
          <button
            className={shared.iconButton}
            aria-label={t("上一时间段")}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button className={shared.textButton} onClick={() => setAnchor(new Date(2026, 8, 9, 12))}>
            {t("Today · Sep 9")}
          </button>
          <button
            className={shared.iconButton}
            aria-label={t("下一时间段")}
            onClick={() => move(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className={shared.actions}>
          <button className={shared.textButton} onClick={() => setQuickAdd("Work")}>
            {t("＋ Add Task")}
          </button>
          <Link className={shared.textButton} href="/upcoming">
            {t("Upcoming →")}
          </Link>
        </div>
      </div>
    </div>
  );
}
