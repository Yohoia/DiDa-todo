"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock3, Inbox, Plus } from "lucide-react";
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
  const pathname = usePathname();
  const { setQuickAdd, tasks } = useWorkspace();
  const items = [
    { href: "/today", label: "Today", Icon: Clock3, active: pathname === "/today" },
    { href: "/inbox", label: "Inbox", Icon: Inbox, active: pathname === "/inbox" },
    {
      href: "/calendar",
      label: "Calendar",
      Icon: CalendarDays,
      active: ["/calendar", "/upcoming"].includes(pathname),
    },
    {
      href: "/profile",
      label: "Profile",
      Icon: null,
      active: ["/profile", "/settings", "/insight", "/completed", "/list-detail"].includes(
        pathname,
      ),
    },
  ];
  return (
    <nav className={styles.dock} aria-label="工作台导航">
      {items.map(({ href, label, Icon, active }, index) => (
        <span className={styles.slot} key={href}>
          {index === 2 && (
            <button
              type="button"
              className={styles.add}
              data-quick-add
              aria-label="快速添加任务"
              title="快速添加 · ⌘K / Ctrl+K"
              onClick={() => setQuickAdd("Inbox")}
            >
              <Plus size={22} strokeWidth={1.5} />
            </button>
          )}
          <Link
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(styles.item, active && styles.active)}
          >
            <span className={styles.label}>{label}</span>
            {Icon ? <Icon size={22} strokeWidth={1.5} /> : <span className={styles.avatar}>A</span>}
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
