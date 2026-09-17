import { HiCheckCircle, HiFire, HiSparkles, HiTrophy } from "react-icons/hi2";

import { getI18n } from "@/i18n/server";
import { PageHeader, SectionLabel } from "@/components/shared/workspace-ui";
import shared from "@/styles/workspace.module.css";
import styles from "./insights.module.css";
import { getInsights, type InsightDay } from "./insights-service";
import { FocusRhythm, type RhythmDay } from "./focus-rhythm";
import { AiAdvisorPanel } from "./ai-advisor-panel";

/** 2023-01-02 是周一：用固定锚点生成周一到周日的本地化缩写。 */
function weekdayLabels(
  format: (value: string, options: { weekday: "narrow" }) => string,
): string[] {
  return Array.from({ length: 7 }, (_, offset) => {
    const anchor = new Date("2023-01-02T12:00:00Z");
    anchor.setUTCDate(anchor.getUTCDate() + offset);
    return format(anchor.toISOString().slice(0, 10), { weekday: "narrow" });
  });
}

export async function InsightsPage() {
  const [{ t, date, number, label }, insights] = await Promise.all([getI18n(), getInsights()]);
  const hours = Math.round((insights.focusMinutes / 60) * 10) / 10;

  const activeDays = insights.days.filter((day) => day.minutes > 0);
  const bestDay = activeDays.reduce<InsightDay | null>(
    (best, day) => (!best || day.minutes > best.minutes ? day : best),
    null,
  );
  const averageMinutes = activeDays.length
    ? Math.round(activeDays.reduce((total, day) => total + day.minutes, 0) / activeDays.length)
    : 0;

  const rhythmDays: RhythmDay[] = insights.days.slice(-7).map((day, index, week) => ({
    key: day.date,
    label: date(day.date, { weekday: "narrow" }),
    valueLabel: t("insights.focusMinutes", { count: day.minutes }),
    title: t("insights.cellDetail", {
      date: date(day.date, { month: "numeric", day: "numeric" }),
      count: day.minutes,
    }),
    minutes: day.minutes,
    level: day.level,
    isToday: index === week.length - 1,
  }));

  // 热力图按「周一到周日」分行；首日前补空白让列对齐自然周。
  const firstDate = new Date(`${insights.days[0].date}T12:00:00Z`);
  const leadingEmpty = (firstDate.getUTCDay() + 6) % 7;
  const goalProgress = Math.min(
    100,
    Math.round((insights.focusMinutesThisMonth / insights.dailyFocusGoalMinutes) * 100),
  );
  const effortDelta = insights.actualTaskMinutesThisMonth - insights.estimatedMinutesThisMonth;

  return (
    <div className={shared.page}>
      <PageHeader
        title={t("Insights")}
        subtitle={date(new Date(), { year: "numeric", month: "long" })}
      />

      <section className={styles.hero} aria-label={t("Deep Work Focused")}>
        <div className={styles.heroMain}>
          <div className={styles.heroNumber}>
            {number(hours)}
            <span className={styles.heroUnit}>{t("h")}</span>
          </div>
          <div className={styles.heroLabel}>{t("Deep Work Focused")}</div>
        </div>
        <div className={styles.heroDivider} aria-hidden="true" />
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroIcon}>
              <HiCheckCircle size={15} aria-hidden="true" />
            </span>
            <div className={styles.heroCopy}>
              <strong>{number(insights.completedTasks)}</strong>
              <span>{t("Tasks Completed")}</span>
            </div>
          </div>
          <div className={styles.heroStat}>
            <span className={styles.heroIcon}>
              <HiFire size={15} aria-hidden="true" />
            </span>
            <div className={styles.heroCopy}>
              <strong>{t("profile.dayCount", { count: insights.streakDays })}</strong>
              <span>{t("Current Streak")}</span>
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>{t("Focus Rhythm")}</SectionLabel>
        <FocusRhythm days={rhythmDays} ariaLabel={t("Focus Rhythm")} />
      </section>

      <AiAdvisorPanel history={insights.days} />

      <section>
        <SectionLabel>{t("Consistency Map")}</SectionLabel>
        <div className={styles.mapCard}>
          <div className={styles.mapToolbar}>
            <span className={styles.mapRange}>{t("Last 42 days")}</span>
            <div className={styles.legend} aria-hidden="true">
              <span>{t("Less")}</span>
              {[0, 1, 2, 3].map((level) => (
                <span key={level} className={styles.cell} data-level={level} />
              ))}
              <span>{t("More")}</span>
            </div>
          </div>
          <div className={styles.mapBody}>
            <div className={styles.weekdays} aria-hidden="true">
              {weekdayLabels(date).map((label, index) => (
                <span key={index}>{label}</span>
              ))}
            </div>
            <div
              className={styles.grid}
              role="img"
              aria-label={t("insights.mapLabel", { count: insights.streakDays })}
            >
              {Array.from({ length: leadingEmpty }, (_, index) => (
                <span
                  key={`empty-${index}`}
                  className={styles.cellPlaceholder}
                  aria-hidden="true"
                />
              ))}
              {insights.days.map((day, index) => (
                <span
                  className={styles.cell}
                  data-level={day.level}
                  data-today={index === insights.days.length - 1 || undefined}
                  key={day.date}
                  title={t("insights.cellDetail", {
                    date: date(day.date, { month: "numeric", day: "numeric" }),
                    count: day.minutes,
                  })}
                />
              ))}
            </div>
          </div>
          <div className={styles.mapFooter}>
            <HiFire size={14} aria-hidden="true" />
            {t("Current Streak")}
            <strong>{t("profile.dayCount", { count: insights.streakDays })}</strong>
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>{t("insights.monthlyFacts")}</SectionLabel>
        <div className={styles.goalCard}>
          <div>
            <strong>{t("insights.dailyFocusGoal")}</strong>
            <p>{t("insights.goalDefinition")}</p>
          </div>
          <div
            className={styles.goalProgress}
            role="progressbar"
            aria-label={t("insights.dailyFocusGoal")}
            aria-valuemin={0}
            aria-valuemax={insights.dailyFocusGoalMinutes}
            aria-valuenow={Math.min(insights.focusMinutesThisMonth, insights.dailyFocusGoalMinutes)}
          >
            <span style={{ width: `${goalProgress}%` }} />
          </div>
          <dl>
            <div>
              <dt>{t("insights.monthFocus")}</dt>
              <dd>{t("insights.focusMinutes", { count: insights.focusMinutesThisMonth })}</dd>
            </div>
            <div>
              <dt>{t("insights.dailyGoal")}</dt>
              <dd>{t("insights.focusMinutes", { count: insights.dailyFocusGoalMinutes })}</dd>
            </div>
            <div>
              <dt>{t("insights.checkInDays")}</dt>
              <dd>{number(insights.checkInDaysThisMonth)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={styles.highlights}>
        <div className={styles.highlight}>
          <HiTrophy size={18} className={styles.highlightIcon} aria-hidden="true" />
          <div className={styles.highlightNumber}>
            {number(insights.estimatedMinutesThisMonth)} /{" "}
            {number(insights.actualTaskMinutesThisMonth)}
          </div>
          <div className={styles.highlightLabel}>{t("insights.estimatedVsActual")}</div>
          <div className={styles.highlightMeta}>
            {effortDelta === 0
              ? t("insights.effortMatched")
              : t("insights.effortDelta", {
                  count: Math.abs(effortDelta),
                  direction:
                    effortDelta > 0 ? t("insights.overEstimate") : t("insights.underEstimate"),
                })}
          </div>
        </div>
        <div className={styles.highlight}>
          <HiSparkles size={18} className={styles.highlightIcon} aria-hidden="true" />
          <div className={styles.highlightNumber}>
            {["Work", "Study", "Life", "Inbox"]
              .map((list) => `${label(list)} ${number(insights.listDistribution[list] ?? 0)}`)
              .join(" / ")}
          </div>
          <div className={styles.highlightLabel}>{t("insights.listDistribution")}</div>
          <div className={styles.highlightMeta}>{t("insights.completedThisMonth")}</div>
        </div>
        <div className={styles.highlight}>
          <HiFire size={18} className={styles.highlightIcon} aria-hidden="true" />
          <div className={styles.highlightNumber}>
            {t("insights.focusMinutes", { count: insights.unlinkedFocusMinutesThisMonth })}
          </div>
          <div className={styles.highlightLabel}>{t("insights.unlinkedFocus")}</div>
          <div className={styles.highlightMeta}>{t("insights.unlinkedFocusHint")}</div>
        </div>
        <div className={styles.highlight}>
          <HiTrophy size={18} className={styles.highlightIcon} aria-hidden="true" />
          <div className={styles.highlightNumber}>
            {t("insights.focusMinutes", { count: bestDay?.minutes ?? 0 })}
          </div>
          <div className={styles.highlightLabel}>{t("Best Day")}</div>
          <div className={styles.highlightMeta}>
            {bestDay ? date(bestDay.date, { month: "numeric", day: "numeric" }) : t("Last 42 days")}
          </div>
        </div>
        <div className={styles.highlight}>
          <HiSparkles size={18} className={styles.highlightIcon} aria-hidden="true" />
          <div className={styles.highlightNumber}>{number(activeDays.length)}</div>
          <div className={styles.highlightLabel}>{t("Active Days")}</div>
          <div className={styles.highlightMeta}>{t("Last 42 days")}</div>
        </div>
        <div className={styles.highlight}>
          <HiFire size={18} className={styles.highlightIcon} aria-hidden="true" />
          <div className={styles.highlightNumber}>
            {t("insights.focusMinutes", { count: averageMinutes })}
          </div>
          <div className={styles.highlightLabel}>{t("Daily Average")}</div>
          <div className={styles.highlightMeta}>{t("Active Days")}</div>
        </div>
      </section>

      <p className={shared.muted}>
        {insights.isDemo ? t("Sample activity · 示例统计") : t("统计来自你的专注与任务记录")}
      </p>
    </div>
  );
}
