import { getI18n } from "@/i18n/server";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCheck,
  Settings2,
  CalendarDays,
  House,
} from "lucide-react";
import { SectionLabel } from "@/components/shared/workspace-ui";
import shared from "@/styles/workspace.module.css";
import styles from "./profile.module.css";

const links = [
  { href: "/upcoming", title: "Upcoming", subtitle: "规划接下来的每一天", Icon: CalendarDays },
  {
    href: "/list-detail",
    title: "Work & Projects",
    subtitle: "工作与项目清单",
    Icon: BriefcaseBusiness,
  },
  { href: "/completed", title: "Archive", subtitle: "回顾已完成的任务", Icon: CheckCheck },
  { href: "/insight", title: "Insights", subtitle: "看见专注与成长", Icon: BarChart3 },
  { href: "/settings", title: "Settings", subtitle: "让节奏适合自己", Icon: Settings2 },
  { href: "/", title: "DiDa-todo", subtitle: "返回首页", Icon: House },
];
export async function ProfilePage() {
  const { t, label } = await getI18n();
  return (
    <div className={shared.page}>
      <header className={styles.header}>
        <div className={styles.avatar}>A</div>
        <div>
          <h1>Alex</h1>
          <div className={styles.meta}>
            <span>{t("Member since Sep 2026")}</span>
            <span className={shared.gold}>{t("Level 5 Architect")}</span>
          </div>
        </div>
      </header>
      <div className={styles.xp}>
        <div className={styles.xpHeader}>
          <span>{t("LVL 5")}</span>
          <span>{t("3,450 / 5,000 XP to next level")}</span>
        </div>
        <progress value={3450} max={5000} aria-label={t("等级经验值")} />
      </div>
      <section>
        <SectionLabel>{t("Focus Garden")}</SectionLabel>
        <div className={styles.garden}>
          <p>{t('"Every 2 hours of deep work grows a new tree."')}</p>
          <div className={styles.trees}>
            {["🌲", "🌳", "🪴", "🌲", "🌱"].map((tree, index) => (
              <span
                className={styles.tree}
                key={index}
                role="img"
                aria-label={t("profile.plant", { index: index + 1 })}
              >
                {tree}
              </span>
            ))}
            {[1, 2, 3].map((slot) => (
              <span className={styles.emptySlot} aria-hidden="true" key={slot} />
            ))}
          </div>
        </div>
      </section>
      <nav className={styles.links} aria-label={t("更多工作台页面")}>
        {links.map(({ href, title, subtitle, Icon }) => (
          <Link href={href} key={href}>
            <Icon size={19} strokeWidth={1.5} />
            <span>
              <strong>{label(title)}</strong>
              <small>{label(subtitle)}</small>
            </span>
            <ArrowUpRight size={15} />
          </Link>
        ))}
      </nav>
      <p className={shared.muted}>
        {t("前端预览 · 任务修改仅保留在本次浏览中，刷新后恢复示例；等级、花园和统计为展示数据。")}
      </p>
    </div>
  );
}
