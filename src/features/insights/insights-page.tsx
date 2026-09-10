import { getI18n } from "@/i18n/server";
import { PageHeader, SectionLabel } from "@/components/shared/workspace-ui";
import shared from "@/styles/workspace.module.css";
import styles from "./insights.module.css";

const levels = [
  0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 0, 2, 1, 0, 1, 2, 1, 0, 2, 2, 1, 0, 1, 2, 1, 1, 0, 2, 1, 2, 0, 3, 2,
  1, 3, 0, 2, 3, 1, 3, 2, 3,
];
export async function InsightsPage() {
  const { t } = await getI18n();
  return (
    <div className={shared.page}>
      <PageHeader title={t("Insights")} subtitle={t("September 2026")} />
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.number}>42</div>
          <div className={styles.description}>{t("Tasks Completed")}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.number}>
            18<span>{t("h")}</span>
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
            aria-label={t("42 天专注热力图，金色越深表示专注越多，当前连续 5 天")}
          >
            {levels.map((level, index) => (
              <span
                className={styles.cell}
                data-level={level}
                key={index}
                title={t("insights.cell", { day: index + 1, count: level })}
              />
            ))}
          </div>
          <p>
            {t("Current Streak:")}
            <strong>{t("5 Days")}</strong>
          </p>
        </div>
      </section>
      <p className={shared.muted}>{t("Sample activity · 示例统计")}</p>
    </div>
  );
}
