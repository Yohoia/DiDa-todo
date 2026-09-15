import { getI18n } from "@/i18n/server";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  HiArrowUpRight,
  HiChartBar,
  HiBriefcase,
  HiCheckCircle,
  HiCog,
  HiCalendar,
  HiHome,
  HiClock,
  HiFire,
  HiSparkles,
} from "react-icons/hi2";
import { SectionLabel } from "@/components/shared/workspace-ui";
import { getProfile } from "./profile-service";
import shared from "@/styles/workspace.module.css";
import styles from "./profile.module.css";

const links = [
  { href: "/schedule", title: "Schedule", subtitle: "规划接下来的每一天", Icon: HiCalendar },
  {
    href: "/list-detail",
    title: "Lists",
    subtitle: "管理工作、学习与生活清单",
    Icon: HiBriefcase,
  },
  { href: "/completed", title: "Archive", subtitle: "回顾已完成的任务", Icon: HiCheckCircle },
  { href: "/insight", title: "Insights", subtitle: "看见专注与成长", Icon: HiChartBar },
  { href: "/settings", title: "Settings", subtitle: "让节奏适合自己", Icon: HiCog },
  { href: "/", title: "DiDa-todo", subtitle: "返回首页", Icon: HiHome },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
  return Array.from(parts[0] ?? "?")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export async function ProfilePage() {
  const [{ t, label, date, number, locale }, profile] = await Promise.all([
    getI18n(),
    getProfile(),
  ]);
  const { focusGarden } = profile;
  const planted = focusGarden.plants.length;
  const goalReached = planted >= focusGarden.weeklyGoal;
  const remainingMinutes = goalReached
    ? 0
    : focusGarden.minutesPerPlant - focusGarden.currentPlantMinutes;
  const currentProgress = Math.round(
    (focusGarden.currentPlantMinutes / focusGarden.minutesPerPlant) * 100,
  );
  const emptyPlots = Math.max(0, focusGarden.weeklyGoal - planted - (goalReached ? 0 : 1));
  const hours = Math.floor(focusGarden.weeklyMinutes / 60);
  const minutes = focusGarden.weeklyMinutes % 60;
  const focusedTime = locale === "zh-CN" ? `${hours} 小时 ${minutes} 分` : `${hours}h ${minutes}m`;

  return (
    <div className={shared.page}>
      <header className={styles.header}>
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- authenticated avatar URLs are dynamic
          <img className={styles.avatarImage} src={profile.avatarUrl} alt={profile.displayName} />
        ) : (
          <div
            className={styles.avatarPlaceholder}
            role="img"
            aria-label={t("profile.avatarPlaceholder", { name: profile.displayName })}
          >
            <span>{initials(profile.displayName)}</span>
          </div>
        )}
        <div>
          <h1>{profile.displayName}</h1>
          <div className={styles.meta}>
            <span>
              {t("profile.memberSince", {
                date: date(profile.joinedAt, { year: "numeric", month: "short" }),
              })}
            </span>
            <span className={shared.gold}>
              {t("profile.levelTitle", {
                level: profile.level,
                title: label(profile.levelTitle),
              })}
            </span>
          </div>
        </div>
      </header>
      <div className={styles.xp}>
        <div className={styles.xpHeader}>
          <span>{t("profile.level", { level: profile.level })}</span>
          <span>
            {t("profile.xpToNext", {
              current: number(profile.xp),
              next: number(profile.nextLevelXp),
            })}
          </span>
        </div>
        <progress value={profile.xp} max={profile.nextLevelXp} aria-label={t("等级经验值")} />
      </div>
      <section>
        <SectionLabel>{t("Focus Garden")}</SectionLabel>
        <article className={styles.garden}>
          <div className={styles.gardenHeading}>
            <div>
              <h3>{t("profile.weeklyGarden")}</h3>
              <p>{t('"Every 2 hours of deep work grows a new tree."')}</p>
            </div>
            <span className={styles.weeklyGoal}>
              {t("profile.weeklyGoal", { count: planted, goal: focusGarden.weeklyGoal })}
            </span>
          </div>
          <dl className={styles.gardenStats}>
            <div>
              <HiClock size={16} aria-hidden="true" />
              <dt>{t("profile.focusedThisWeek")}</dt>
              <dd>{focusedTime}</dd>
            </div>
            <div>
              <HiSparkles size={16} aria-hidden="true" />
              <dt>{t("profile.plantsGrown")}</dt>
              <dd>{t("profile.plantCount", { count: planted, goal: focusGarden.weeklyGoal })}</dd>
            </div>
            <div>
              <HiFire size={16} aria-hidden="true" />
              <dt>{t("profile.currentStreak")}</dt>
              <dd>{t("profile.dayCount", { count: focusGarden.streakDays })}</dd>
            </div>
          </dl>
          <ol className={styles.plots} aria-label={t("profile.gardenPlots")}>
            {focusGarden.plants.map((plant, index) => (
              <li className={styles.plot} key={plant.id}>
                <span
                  className={styles.tree}
                  role="img"
                  aria-label={t("profile.plant", { index: index + 1 })}
                >
                  {plant.symbol}
                </span>
                <small>{date(plant.plantedAt, { month: "numeric", day: "numeric" })}</small>
              </li>
            ))}
            {!goalReached && (
              <li className={`${styles.plot} ${styles.growingPlot}`}>
                <span
                  className={styles.growingRing}
                  style={{ "--progress": `${currentProgress * 3.6}deg` } as CSSProperties}
                >
                  <span role="img" aria-label={t("profile.growingPlant")}>
                    🌱
                  </span>
                </span>
                <small>{currentProgress}%</small>
              </li>
            )}
            {Array.from({ length: emptyPlots }, (_, index) => (
              <li className={`${styles.plot} ${styles.emptyPlot}`} key={`empty-${index}`}>
                <span aria-hidden="true" />
                <small>{t("profile.emptyPlot")}</small>
              </li>
            ))}
          </ol>
          {goalReached ? (
            <p className={styles.nextTree}>{t("profile.weeklyGoalReached")}</p>
          ) : (
            <div className={styles.nextTree}>
              <div className={styles.nextTreeCopy}>
                <span>{t("profile.nextPlant")}</span>
                <strong>{t("profile.minutesRemaining", { count: remainingMinutes })}</strong>
              </div>
              <div
                className={styles.gardenProgress}
                role="progressbar"
                aria-label={t("profile.nextPlantProgress")}
                aria-valuemin={0}
                aria-valuemax={focusGarden.minutesPerPlant}
                aria-valuenow={focusGarden.currentPlantMinutes}
              >
                <span style={{ width: `${currentProgress}%` }} />
              </div>
            </div>
          )}
        </article>
      </section>
      <nav className={styles.links} aria-label={t("更多工作台页面")}>
        {links.map(({ href, title, subtitle, Icon }) => (
          <Link href={href} key={href}>
            <Icon size={19} strokeWidth={1.5} />
            <span>
              <strong>{label(title)}</strong>
              <small>{label(subtitle)}</small>
            </span>
            <HiArrowUpRight size={15} />
          </Link>
        ))}
      </nav>
      <p className={shared.muted}>
        {profile.isDemo
          ? t("未登录时显示示例数据；登录后任务与专注记录会同步到你的账户。")
          : t("等级、花园和统计来自你的任务与专注记录。")}
      </p>
    </div>
  );
}
