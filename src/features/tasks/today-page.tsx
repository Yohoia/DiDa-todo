"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import Link from "next/link";
import { HiClock, HiSparkles } from "react-icons/hi2";
import { HiSearch } from "react-icons/hi";
import { PageHeader, SectionLabel, EmptyState } from "@/components/shared/workspace-ui";
import { TaskRow } from "@/components/task/task-row";
import { useWorkspace } from "./workspace-provider";
import { DEMO_TODAY } from "./demo-data";
import shared from "@/styles/workspace.module.css";
import styles from "./today.module.css";

export function TodayPage() {
  const { t } = useI18n();
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
              {t("Good morning,")}
              <br />
              <em>Alex</em>
            </>
          }
          subtitle={t("Wednesday, September 9")}
        />
        <div className={styles.greeting}>
          <HiSparkles size={14} className="mr-1 inline" aria-hidden="true" />{" "}
          <strong>{t("AI Insight:")}</strong> {t("tasks.todayInsight", { count: active.length })}
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
                  <span>
                    {t("Estimate:")} {t("tasks.pomodoros", { count: featured.estimate })}
                  </span>
                  <span>{t("Project: Development")}</span>
                </span>
              </button>
              <button className={shared.primary} onClick={() => startFocus(featured.id)}>
                {t("Start Deep Work")}
              </button>
            </article>
          ) : (
            <EmptyState title={t("A little room to breathe")}>
              {t("Your focus is complete. Enjoy the progress.")}
            </EmptyState>
          )}
        </section>
      </div>
      <div className={styles.right}>
        <div className={shared.row}>
          <div className={styles.capacity}>
            {t("Capacity")} {active.length}/{preferences.dailyCapacity}
            <progress
              aria-label={t("今日任务容量")}
              max={preferences.dailyCapacity}
              value={active.length}
            />
          </div>
          <button
            className={shared.iconButton}
            aria-label={t("搜索与快速添加")}
            onClick={() => setQuickAdd("Inbox")}
          >
            <HiSearch size={19} />
          </button>
        </div>
        <section>
          <SectionLabel>{t("Committed (Frozen)")}</SectionLabel>
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
          <SectionLabel>{t("Timeline")}</SectionLabel>
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
