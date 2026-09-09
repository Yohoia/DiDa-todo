"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { PageHeader, SectionLabel, EmptyState } from "@/components/shared/workspace-ui";
import { TaskRow } from "@/components/task/task-row";
import { useWorkspace } from "./workspace-provider";
import { DEMO_TODAY } from "./demo-data";
import styles from "@/styles/workspace.module.css";

export function UpcomingPage() {
  const { tasks, toggleTask, selectTask } = useWorkspace();
  const [filter, setFilter] = useState("All");
  const upcoming = tasks
    .filter(
      (task) =>
        task.date > DEMO_TODAY && !task.completed && (filter === "All" || task.list === filter),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const groups = Array.from(
    new Set(
      upcoming.map((task) =>
        task.date < "2026-09-14" ? task.date : task.date < "2026-09-21" ? "next-week" : task.date,
      ),
    ),
  );
  function groupLabel(key: string) {
    if (key === "next-week") return "Next Week";
    if (key === "2026-09-10") return "Tomorrow · Sep 10";
    return new Date(`${key}T12:00:00`)
      .toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
      .replace(",", " ·");
  }
  return (
    <div className={styles.page}>
      <PageHeader title="Upcoming" subtitle="September Horizon">
        <div className={styles.pills}>
          {["All", "Work", "Study", "Life"].map((item) => (
            <button
              key={item}
              className={styles.pill}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </PageHeader>
      {groups.map((group) => (
        <section key={group}>
          <SectionLabel gold>{groupLabel(group)}</SectionLabel>
          <div className="flex flex-col gap-2">
            {upcoming
              .filter(
                (task) =>
                  (task.date < "2026-09-14"
                    ? task.date
                    : task.date < "2026-09-21"
                      ? "next-week"
                      : task.date) === group,
              )
              .map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onOpen={() => selectTask(task.id)}
                  onToggle={() => toggleTask(task.id)}
                />
              ))}
          </div>
        </section>
      ))}
      {!groups.length && (
        <EmptyState title="A clear horizon">No upcoming tasks in this list.</EmptyState>
      )}
      <Link className={styles.textButton} href="/calendar">
        <CalendarDays size={15} /> View calendar →
      </Link>
    </div>
  );
}
