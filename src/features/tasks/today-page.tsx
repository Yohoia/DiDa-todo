"use client";

import Link from "next/link";
import { Clock3, Search, Sparkles } from "lucide-react";
import { PageHeader, SectionLabel, EmptyState } from "@/components/shared/workspace-ui";
import { TaskRow } from "@/components/task/task-row";
import { useWorkspace } from "./workspace-provider";
import { DEMO_TODAY } from "./demo-data";
import shared from "@/styles/workspace.module.css";
import styles from "./today.module.css";

export function TodayPage() {
  const { tasks, preferences, selectTask, toggleTask, startFocus, setQuickAdd } = useWorkspace();
  const today = tasks.filter((task) => task.date === DEMO_TODAY);
  const active = today.filter((task) => !task.completed);
  const featured = today.find((task) => task.featured && !task.completed);
  return (
    <div className={styles.journal}>
      <div className={styles.left}>
        <PageHeader
          title={
            <>
              Good morning,
              <br />
              <em>Alex</em>
            </>
          }
          subtitle="Wednesday, September 9"
        />
        <div className={styles.greeting}>
          <Sparkles size={14} className="mr-1 inline" aria-hidden="true" />{" "}
          <strong>AI Insight:</strong> You have {active.length} tasks today. Energy levels are
          optimal for deep work right now. Consider tackling your One Thing before 11:00 AM.
        </div>
        <section>
          <SectionLabel>Today&apos;s Focus</SectionLabel>
          {featured ? (
            <article className={styles.oneThing}>
              <button
                className={styles.featureButton}
                onClick={() => selectTask(featured.id)}
                aria-label={`查看任务：${featured.title}`}
              >
                <span className={shared.row}>
                  <span className={styles.badge}>One Thing</span>
                  <Clock3 size={18} className={shared.gold} />
                </span>
                <h2>
                  {featured.title === "完成 DiDa 登录系统核心业务逻辑与鉴权" ? (
                    <>
                      完成 DiDa 登录系统
                      <br />
                      核心业务逻辑与鉴权
                    </>
                  ) : (
                    featured.title
                  )}
                </h2>
                <span className={styles.meta}>
                  <span>Estimate: {featured.estimate} Pomodoros</span>
                  <span>Project: Development</span>
                </span>
              </button>
              <button className={shared.primary} onClick={() => startFocus(featured.id)}>
                Start Deep Work
              </button>
            </article>
          ) : (
            <EmptyState title="A little room to breathe">
              Your focus is complete. Enjoy the progress.
            </EmptyState>
          )}
        </section>
      </div>
      <div className={styles.right}>
        <div className={shared.row}>
          <div className={styles.capacity}>
            Capacity {active.length}/{preferences.dailyCapacity}
            <progress
              aria-label="今日任务容量"
              max={preferences.dailyCapacity}
              value={active.length}
            />
          </div>
          <button
            className={shared.iconButton}
            aria-label="搜索与快速添加"
            onClick={() => setQuickAdd("Inbox")}
          >
            <Search size={19} />
          </button>
        </div>
        <section>
          <SectionLabel>Committed (Frozen)</SectionLabel>
          {today
            .filter((task) => task.frozen)
            .map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                variant="timeline"
                onOpen={() => selectTask(task.id)}
                onToggle={() => toggleTask(task.id)}
              />
            ))}
        </section>
        <section className={styles.timeline}>
          <SectionLabel>Timeline</SectionLabel>
          <div className="flex flex-col gap-2.5">
            {today
              .filter((task) => !task.frozen && !task.featured)
              .map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  variant="timeline"
                  onOpen={() => selectTask(task.id)}
                  onToggle={() => toggleTask(task.id)}
                />
              ))}
          </div>
        </section>
        <div className={shared.actions}>
          <Link className={shared.textButton} href="/upcoming">
            Upcoming →
          </Link>
          <Link className={shared.textButton} href="/list-detail">
            Work & Projects →
          </Link>
        </div>
      </div>
    </div>
  );
}
