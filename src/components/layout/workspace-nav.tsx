"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiCalendar, HiClock, HiInbox, HiPlus, HiUser } from "react-icons/hi2";
import { useWorkspace } from "@/features/tasks/workspace-provider";
import { cn } from "@/lib/utils";
import styles from "./workspace-nav.module.css";

export const workspaceLinks = [
  { href: "/today", label: "Today", description: "今日计划" },
  { href: "/inbox", label: "Inbox", description: "收集想法" },
  { href: "/upcoming", label: "Upcoming", description: "即将到来" },
  { href: "/calendar", label: "Calendar", description: "日历视图" },
  { href: "/list-detail", label: "Work & Projects", description: "工作清单" },
  { href: "/completed", label: "Archive", description: "已完成任务" },
  { href: "/insight", label: "Insights", description: "效率统计" },
  { href: "/settings", label: "Settings", description: "偏好设置" },
  { href: "/profile", label: "Profile", description: "个人主页" },
];

export function WorkspaceNav() {
  const { t, label: translateLabel } = useI18n();
  const pathname = usePathname();
  const { setQuickAdd, tasks } = useWorkspace();
  const items = [
    { href: "/today", label: "今日待办", Icon: HiClock, active: pathname === "/today" },
    { href: "/inbox", label: "Inbox", Icon: HiInbox, active: pathname === "/inbox" },
    {
      href: "/calendar",
      label: "日程安排",
      Icon: HiCalendar,
      active: ["/calendar", "/upcoming"].includes(pathname),
    },
    {
      href: "/profile",
      label: "个人中心",
      Icon: HiUser,
      active: ["/profile", "/settings", "/insight", "/completed", "/list-detail"].includes(
        pathname,
      ),
    },
  ];
  return (
    <nav className={styles.dock} aria-label={t("工作台导航")}>
      {items.map(({ href, label, Icon, active }, index) => (
        <span className={styles.slot} key={href}>
          {index === 2 && (
            <button
              type="button"
              className={styles.add}
              data-quick-add
              aria-label={t("快速添加任务")}
              title={t("快速添加 · ⌘K / Ctrl+K")}
              onClick={() => setQuickAdd("Inbox")}
            >
              <HiPlus size={22} />
            </button>
          )}
          <Link
            href={href}
            aria-label={translateLabel(label)}
            aria-current={active ? "page" : undefined}
            className={cn(styles.item, active && styles.active)}
          >
            <span className={styles.label}>{translateLabel(label)}</span>
            <Icon size={22} />
            {href === "/inbox" &&
              tasks.some((task) => task.list === "Inbox" && !task.completed) && (
                <span className={styles.dot} />
              )}
          </Link>
        </span>
      ))}
    </nav>
  );
}
