import { getI18n } from "@/i18n/server";
import { PageHeader, SectionLabel } from "@/components/shared/workspace-ui";
import shared from "@/styles/workspace.module.css";
import styles from "./insights.module.css";
import { getInsights } from "./insights-service";

export async function InsightsPage() {
  const [{ t, date, number }, insights] = await Promise.all([getI18n(), getInsights()]);
  const hours = Math.round((insights.focusMinutes / 60) * 10) / 10;
  return (
    <div className={shared.page}>
      <PageHeader
        title={t("Insights")}
        subtitle={date(new Date(), { year: "numeric", month: "long" })}
      />
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.number}>{number(insights.completedTasks)}</div>
          <div className={styles.description}>{t("Tasks Completed")}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.number}>
            {number(hours)}
            <span>{t("h")}</span>
          </div>
          <div className={styles.description}>{t("Deep Work Focused")}</div>
        </div>
      </div>
      <section>
        <SectionLabel>{t("Consistency Map")}</SectionLabel>
        <div className={styles.map}>
          <div
            className={styles.grid}
            role="img"
            aria-label={t("insights.mapLabel", { count: insights.streakDays })}
          >
            {insights.days.map((day) => (
              <span
                className={styles.cell}
                data-level={day.level}
                key={day.date}
                title={t("insights.cellDetail", {
                  date: date(day.date, { month: "numeric", day: "numeric" }),
                  count: day.minutes,
                })}
              />
            ))}
          </div>
          <p>
            {t("Current Streak:")}
            <strong>{t("profile.dayCount", { count: insights.streakDays })}</strong>
          </p>
        </div>
      </section>
      <p className={shared.muted}>
        {insights.isDemo ? t("Sample activity · 示例统计") : t("统计来自你的专注与任务记录")}
      </p>
    </div>
  );
}
