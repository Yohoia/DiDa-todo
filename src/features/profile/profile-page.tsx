import { getI18n } from "@/i18n/server";
import Link from "next/link";
import { HiAdjustmentsHorizontal, HiClock, HiFire, HiSparkles, HiTrophy } from "react-icons/hi2";
import { SectionLabel } from "@/components/shared/workspace-ui";
import { AvatarView } from "@/components/shared/avatar-view";
import { avatarImageSrc, avatarSeed } from "@/lib/avatar";
import { getProfile } from "./profile-service";
import shared from "@/styles/workspace.module.css";
import styles from "./profile.module.css";

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
  const hours = Math.floor(focusGarden.weeklyMinutes / 60);
  const minutes = focusGarden.weeklyMinutes % 60;
  const focusedTime = locale === "zh-CN" ? `${hours} 小时 ${minutes} 分` : `${hours}h ${minutes}m`;
  // 头像解析：niceavatar:// 种子在客户端生成；空值用邮箱种子兜底；预览账号保留首字母占位
  const imageSrc = avatarImageSrc(profile.avatarUrl);
  const seed = avatarSeed(profile.avatarUrl, profile.isDemo ? null : profile.email);

  return (
    <div className={shared.page}>
      <header className={styles.header}>
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- authenticated avatar URLs are dynamic
          <img className={styles.avatarImage} src={imageSrc} alt={profile.displayName} />
        ) : seed ? (
          <AvatarView seed={seed} className={styles.avatarImage} />
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
        <Link
          href="/settings"
          className={styles.settingsLink}
          aria-label={t("Settings")}
          title={t("Settings")}
        >
          <HiAdjustmentsHorizontal size={19} aria-hidden="true" />
        </Link>
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
              <h3>{t("profile.permanentGarden")}</h3>
              <p>{t("profile.permanentGardenHint")}</p>
            </div>
            <span className={styles.weeklyGoal}>
              {t("profile.plantCount", { count: planted, goal: planted })}
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
              <dd>{number(planted)}</dd>
            </div>
            <div>
              <HiTrophy size={16} aria-hidden="true" />
              <dt>{t("profile.coins")}</dt>
              <dd>{number(profile.coins)}</dd>
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
            {!planted && (
              <li className={`${styles.plot} ${styles.emptyPlot}`}>
                <span aria-hidden="true" />
                <small>{t("profile.firstPlantHint")}</small>
              </li>
            )}
          </ol>
          {profile.gamificationEnabled ? (
            <>
              {profile.achievements.length > 0 && (
                <ul className={styles.achievements} aria-label={t("profile.achievements")}>
                  {profile.achievements.map((achievement) => (
                    <li key={achievement.key}>
                      <HiTrophy size={14} aria-hidden="true" />
                      <span>{label(`growth.achievement.${achievement.key}`)}</span>
                      <small>{date(achievement.earnedAt, { dateStyle: "medium" })}</small>
                    </li>
                  ))}
                </ul>
              )}
              <p className={styles.nextTree}>{t("profile.gardenFactSource")}</p>
            </>
          ) : (
            <p className={styles.nextTree}>{t("profile.gamificationDisabled")}</p>
          )}
          <div className={styles.streakRow}>
            <HiFire size={14} aria-hidden="true" />
            {t("profile.currentStreak")}:
            <strong>{t("profile.dayCount", { count: focusGarden.streakDays })}</strong>
          </div>
        </article>
      </section>
    </div>
  );
}
