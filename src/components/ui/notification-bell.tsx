"use client";

import * as Popover from "@radix-ui/react-popover";
import { HiBell } from "react-icons/hi2";
import { useState } from "react";

import { useI18n } from "@/features/preferences/preferences-provider";
import { useWorkspace } from "@/features/tasks/workspace-provider";
import type { AppNotification } from "@/types/notification";
import { cn } from "@/lib/utils";

import styles from "./notification-bell.module.css";

/** 相对时间：刚刚 / 5 分钟前 / 3 小时前 / 2 天前 */
function relativeTime(value: string, locale: string): string {
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const seconds = (Date.now() - new Date(value).getTime()) / 1000;
  if (seconds < 60) return formatter.format(0, "second");
  const minutes = seconds / 60;
  if (minutes < 60) return formatter.format(-Math.round(minutes), "minute");
  const hours = minutes / 60;
  if (hours < 24) return formatter.format(-Math.round(hours), "hour");
  return formatter.format(-Math.round(hours / 24), "day");
}

export function NotificationBell({ className }: { className?: string }) {
  const { t, locale } = useI18n();
  const { notifications, markNotificationRead, markAllNotificationsRead, selectTask } =
    useWorkspace();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((item) => !item.read).length;

  function openTask(notification: AppNotification) {
    markNotificationRead(notification.id);
    selectTask(notification.taskId);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(styles.trigger, className)}
        aria-label={t("Notifications")}
        title={t("Notifications")}
      >
        <HiBell size={17} aria-hidden="true" />
        {unread > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={styles.panel} align="end" sideOffset={10}>
          <div className={styles.header}>
            <strong>{t("Notifications")}</strong>
            <button
              type="button"
              className={styles.markAll}
              onClick={markAllNotificationsRead}
              disabled={unread === 0}
            >
              {t("全部已读")}
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className={styles.empty}>{t("暂无提醒")}</p>
          ) : (
            <ul className={styles.list}>
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    className={styles.item}
                    onClick={() => openTask(notification)}
                  >
                    <span className={styles.dot} data-unread={!notification.read || undefined} />
                    <span className={styles.itemBody}>
                      <span className={styles.itemTitle}>{notification.title}</span>
                      <span className={styles.itemTime}>
                        {relativeTime(notification.createdAt, locale)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Popover.Arrow className={styles.arrow} height={7} width={12} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
