"use client";

import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { HiCheck, HiChevronLeft, HiChevronRight, HiPlus } from "react-icons/hi2";
import { PageHeader } from "@/components/shared/workspace-ui";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useI18n } from "@/features/preferences/preferences-provider";
import { DEMO_TODAY } from "@/features/tasks/demo-data";
import { useWorkspace } from "@/features/tasks/workspace-provider";
import { cn } from "@/lib/utils";
import type { Task, TaskList } from "@/types/task";
import {
  addDays,
  dateKey,
  endMinutes,
  fromDateKey,
  HOUR_HEIGHT,
  HOURS,
  layoutEvents,
  pad,
  taskDate,
  taskMinutes,
  taskTime,
  timeLabel,
  weekStart,
} from "./calendar-layout";
import shared from "@/styles/workspace.module.css";
import styles from "./calendar.module.css";

type CalendarView = "Day" | "Week" | "Month";
const FILTERS: ("All" | TaskList)[] = ["All", "Work", "Study", "Life", "Inbox"];

function CalendarTask({
  task,
  compact = false,
  short = false,
}: {
  task: Task;
  compact?: boolean;
  short?: boolean;
}) {
  const { t } = useI18n();
  const { selectTask, toggleTask } = useWorkspace();
  const time = taskTime(task);
  const range = time ? `${time} – ${timeLabel(endMinutes(task))}` : "";
  return (
    <article
      className={cn(
        styles.calendarTask,
        compact && styles.compactTask,
        short && styles.shortTask,
        task.completed && styles.taskDone,
      )}
      data-list={task.list}
      title={`${range ? range + " · " : ""}${task.title}`}
      draggable={!task.completed}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/task-id", task.id);
      }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        className={styles.taskCheck}
        aria-label={t("tasks.complete", { title: task.title })}
        onClick={() => toggleTask(task.id)}
      >
        <span>{task.completed && <HiCheck size={11} aria-hidden="true" />}</span>
      </button>
      <button
        type="button"
        className={styles.taskOpen}
        aria-label={t("calendar.open", { title: task.title })}
        onClick={() => selectTask(task.id)}
      >
        {time && <span className={styles.taskTime}>{compact || short ? time : range}</span>}
        <strong>{task.title}</strong>
      </button>
    </article>
  );
}

export function CalendarPage() {
  const { t, label, date: formatDate } = useI18n();
  const { tasks, updateTask, preferences, setQuickAdd } = useWorkspace();
  const [view, setView] = useState<CalendarView>("Week");
  const [anchor, setAnchor] = useState(() => fromDateKey(DEMO_TODAY));
  const [selectedDate, setSelectedDate] = useState(DEMO_TODAY);
  const [filter, setFilter] = useState<"All" | TaskList>("All");
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedAllDay, setExpandedAllDay] = useState(false);
  const [dropTarget, setDropTarget] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const sunday = preferences.firstDay === "Sunday";
  const week = weekStart(anchor, sunday);
  const visibleDays =
    view === "Day" ? [anchor] : Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const datedTasks = tasks
    .filter(
      (task) =>
        taskDate(task) &&
        (showCompleted || !task.completed) &&
        (filter === "All" || task.list === filter),
    )
    .sort(
      (a, b) =>
        (taskTime(a) || "00:00").localeCompare(taskTime(b) || "00:00") || a.created - b.created,
    );
  const monthStart = weekStart(new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12), sunday);
  const leadingDays =
    (new Date(anchor.getFullYear(), anchor.getMonth(), 1).getDay() + (sunday ? 0 : 6)) % 7;
  const monthLength = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const monthCellCount = Math.ceil((leadingDays + monthLength) / 7) * 7;
  const monthDays = Array.from({ length: monthCellCount }, (_, i) => addDays(monthStart, i));

  // Keep a normal working hour in view while still making all 24 hours reachable.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
  }, [view]);
  useEffect(() => {
    const scroller = scrollRef.current;
    const board = boardRef.current;
    if (!scroller || !board) return;
    const alignColumns = () => {
      board.style.setProperty(
        "--scrollbar-width",
        `${scroller.offsetWidth - scroller.clientWidth}px`,
      );
    };
    alignColumns();
    const observer = new ResizeObserver(alignColumns);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [view]);
  useEffect(() => {
    const board = boardRef.current;
    if (!board || view !== "Week") return;
    const header = board.querySelector<HTMLElement>('[data-selected="true"]');
    if (header && board.scrollWidth > board.clientWidth) {
      const left =
        header.getBoundingClientRect().left - board.getBoundingClientRect().left + board.scrollLeft;
      board.scrollLeft = Math.max(0, left - (board.clientWidth - header.offsetWidth) / 2);
    }
  }, [view, selectedDate, sunday]);

  const rangeTitle =
    view === "Month"
      ? formatDate(anchor, { year: "numeric", month: "long" })
      : view === "Day"
        ? formatDate(anchor, { year: "numeric", month: "long", day: "numeric", weekday: "short" })
        : `${formatDate(week, { year: "numeric", month: "short", day: "numeric" })} — ${formatDate(addDays(week, 6), { month: "short", day: "numeric" })}`;

  function openAdd(date = selectedDate, time?: string) {
    setSelectedDate(date);
    setQuickAdd({ list: filter === "All" ? "Inbox" : filter, date, time });
  }
  function move(direction: number) {
    const next =
      view === "Month"
        ? new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1, 12)
        : addDays(anchor, direction * (view === "Week" ? 7 : 1));
    setAnchor(next);
    setSelectedDate(dateKey(next));
    setExpandedAllDay(false);
  }
  function openDay(day: Date) {
    setAnchor(day);
    setSelectedDate(dateKey(day));
    setView("Day");
    setExpandedAllDay(false);
  }
  function allowDrop(event: DragEvent, target: string) {
    if (!event.dataTransfer.types.includes("text/task-id")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(target);
  }
  function dropTask(event: DragEvent, date: string, time?: string, preserveTime = false) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/task-id");
    if (tasks.some((task) => task.id === id && !task.completed)) {
      updateTask(id, preserveTime ? { date } : { date, time });
      setSelectedDate(date);
    }
    setDropTarget("");
  }

  return (
    <div className={cn(shared.page, styles.page)} onDragEnd={() => setDropTarget("")}>
      <PageHeader title={t("Schedule")} subtitle={rangeTitle}>
        <button className={styles.addTaskButton} onClick={() => openAdd()}>
          <HiPlus size={17} aria-hidden="true" />
          {t("Add Task")}
        </button>
      </PageHeader>
      <div className={styles.toolbar}>
        <div className={styles.navigation}>
          <button
            className={styles.iconButton}
            aria-label={t("上一时间段")}
            onClick={() => move(-1)}
          >
            <HiChevronLeft size={18} />
          </button>
          <button
            className={styles.todayButton}
            onClick={() => {
              setAnchor(fromDateKey(DEMO_TODAY));
              setSelectedDate(DEMO_TODAY);
              setExpandedAllDay(false);
            }}
          >
            {t("Today")}
          </button>
          <button
            className={styles.iconButton}
            aria-label={t("下一时间段")}
            onClick={() => move(1)}
          >
            <HiChevronRight size={18} />
          </button>
        </div>
        <div className={styles.filters} aria-label={t("calendar.filter")}>
          {FILTERS.map((item) => (
            <button
              key={item}
              className={styles.filterButton}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {label(item)}
            </button>
          ))}
        </div>
        <SegmentedControl<CalendarView>
          className={styles.switcher}
          ariaLabel={t("calendar.board")}
          value={view}
          options={(["Day", "Week", "Month"] as const).map((item) => ({
            value: item,
            label: label(item),
          }))}
          onChange={(next) => {
            setView(next);
            setAnchor(fromDateKey(selectedDate));
            setExpandedAllDay(false);
          }}
        />
      </div>

      <section className={styles.calendarSurface} aria-label={t("calendar.board")}>
        {view === "Month" ? (
          <div className={styles.month}>
            {monthDays.slice(0, 7).map((day) => (
              <div className={styles.weekday} key={dateKey(day)}>
                {formatDate(day, { weekday: "short" })}
              </div>
            ))}
            {monthDays.map((day) => {
              const key = dateKey(day);
              const dayTasks = datedTasks.filter((task) => taskDate(task) === key);
              return (
                <div
                  key={key}
                  className={cn(
                    styles.monthDay,
                    day.getMonth() !== anchor.getMonth() && styles.outside,
                    key === selectedDate && styles.selectedDay,
                    dropTarget === key && styles.dropActive,
                  )}
                  onDragOver={(event) => allowDrop(event, key)}
                  onDragLeave={() => setDropTarget("")}
                  onDrop={(event) => dropTask(event, key, undefined, true)}
                >
                  <div className={styles.monthDayHeader}>
                    <button
                      className={cn(styles.dayNumber, key === DEMO_TODAY && styles.today)}
                      aria-label={t("calendar.day", { date: key })}
                      onClick={() => openDay(day)}
                    >
                      {day.getDate()}
                    </button>
                    <button
                      className={styles.dayAdd}
                      aria-label={t("calendar.addOn", { date: key })}
                      onClick={() => openAdd(key)}
                    >
                      <HiPlus size={14} />
                    </button>
                  </div>
                  <div className={styles.monthTasks}>
                    {dayTasks.slice(0, 3).map((task) => (
                      <CalendarTask key={task.id} task={task} compact />
                    ))}
                    {dayTasks.length > 3 && (
                      <button className={styles.moreTasks} onClick={() => openDay(day)}>
                        {t("calendar.more", { count: dayTasks.length - 3 })}
                      </button>
                    )}
                  </div>
                  {dayTasks.length > 0 && (
                    <button
                      className={styles.mobileCount}
                      onClick={() => openDay(day)}
                      aria-label={t("calendar.taskCount", { count: dayTasks.length })}
                    >
                      <span className={styles.monthDots} aria-hidden="true">
                        {dayTasks.slice(0, 3).map((task) => (
                          <i key={task.id} data-list={task.list} />
                        ))}
                      </span>
                      {dayTasks.length}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.boardViewport} ref={boardRef}>
            <div
              className={cn(styles.board, view === "Week" && styles.weekBoard)}
              style={
                {
                  "--calendar-days": visibleDays.length,
                  "--hour-height": `${HOUR_HEIGHT}px`,
                } as CSSProperties
              }
            >
              <div className={styles.headerGrid}>
                <div className={styles.corner} />
                {visibleDays.map((day) => {
                  const key = dateKey(day);
                  return (
                    <button
                      key={key}
                      className={cn(styles.dayHeading, key === DEMO_TODAY && styles.todayHeading)}
                      data-selected={key === selectedDate}
                      aria-label={t("calendar.day", { date: key })}
                      onClick={() => openDay(day)}
                    >
                      <span>{formatDate(day, { weekday: "short" })}</span>
                      <strong>{day.getDate()}</strong>
                    </button>
                  );
                })}
              </div>
              <div className={styles.allDayGrid}>
                <div className={styles.allDayLabel}>{t("calendar.anytime")}</div>
                {visibleDays.map((day) => {
                  const key = dateKey(day);
                  const allDay = datedTasks.filter(
                    (task) => taskDate(task) === key && taskMinutes(task) === null,
                  );
                  return (
                    <div
                      key={key}
                      className={cn(styles.allDayCell, dropTarget === key && styles.dropActive)}
                      onDragOver={(event) => allowDrop(event, key)}
                      onDragLeave={() => setDropTarget("")}
                      onDrop={(event) => dropTask(event, key)}
                    >
                      <div className={styles.allDayTasks}>
                        {(expandedAllDay ? allDay : allDay.slice(0, 2)).map((task) => (
                          <CalendarTask key={task.id} task={task} compact />
                        ))}
                      </div>
                      {allDay.length > 2 && (
                        <button
                          className={styles.moreTasks}
                          aria-expanded={expandedAllDay}
                          onClick={() => setExpandedAllDay((value) => !value)}
                        >
                          {expandedAllDay
                            ? t("calendar.collapse")
                            : t("calendar.more", { count: allDay.length - 2 })}
                        </button>
                      )}
                      <button
                        className={styles.inlineAdd}
                        aria-label={t("calendar.addOn", { date: key })}
                        onClick={() => openAdd(key)}
                      >
                        <HiPlus size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className={styles.timeScroll} ref={scrollRef}>
                <div className={styles.timeGrid}>
                  <div className={styles.timeRail}>
                    {HOURS.map((hour) => (
                      <div key={hour} className={styles.hourLabel}>
                        {pad(hour)}:00
                      </div>
                    ))}
                  </div>
                  {visibleDays.map((day) => {
                    const key = dateKey(day);
                    const events = layoutEvents(
                      datedTasks.filter((task) => taskDate(task) === key),
                    );
                    return (
                      <div key={key} className={styles.dayColumn}>
                        {HOURS.map((hour) => (
                          <div key={hour} className={styles.hourSlots}>
                            {[0, 30].map((minute) => {
                              const time = `${pad(hour)}:${pad(minute)}`;
                              const target = `${key}/${time}`;
                              return (
                                <button
                                  key={minute}
                                  className={cn(
                                    styles.slotAdd,
                                    dropTarget === target && styles.dropActive,
                                  )}
                                  aria-label={t("calendar.addAt", { date: key, time })}
                                  onClick={() => openAdd(key, time)}
                                  onDragOver={(event) => allowDrop(event, target)}
                                  onDragLeave={() => setDropTarget("")}
                                  onDrop={(event) => dropTask(event, key, time)}
                                />
                              );
                            })}
                          </div>
                        ))}
                        {events.map((event) => {
                          const height =
                            (Math.min(1440 - event.start, Math.max(24, event.end - event.start)) /
                              60) *
                            HOUR_HEIGHT;
                          return (
                            <div
                              key={event.task.id}
                              className={styles.timedTask}
                              style={{
                                top: (event.start / 60) * HOUR_HEIGHT,
                                height,
                                left: `calc(${(event.column / event.columns) * 100}% + 3px)`,
                                width: `calc(${100 / event.columns}% - 6px)`,
                              }}
                            >
                              <CalendarTask task={event.task} short={height < 58} />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        <footer className={styles.calendarFooter}>
          <span className={styles.dragHint}>{t("calendar.dragHint")}</span>
          <label className={styles.completedToggle}>
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(event) => setShowCompleted(event.target.checked)}
            />
            {t("calendar.showCompleted")}
          </label>
        </footer>
      </section>
    </div>
  );
}
