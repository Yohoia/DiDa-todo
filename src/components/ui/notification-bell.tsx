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

/** 通知中心入口：作为底部导航 dock 的一个常规项，面板向上弹出。 */
export function NotificationBell() {
  const { t, locale } = useI18n();
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    selectTask,
  } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const unread = notifications.filter((item) => !item.read).length;

  function openTask(notification: AppNotification) {
    markNotificationRead(notification.id);
    if (notification.taskId) selectTask(notification.taskId);
    setOpen(false);
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setConfirmClear(false);
      }}
    >
      <Popover.Trigger
        className={cn(styles.dockTrigger, open && styles.dockTriggerActive)}
        aria-label={t("Notifications")}
      >
        <span className={styles.dockLabel} aria-hidden="true">
          {t("Notifications")}
        </span>
        <HiBell size={22} aria-hidden="true" />
        {unread > 0 && (
          <span className={styles.dockBadge} aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={styles.panel} side="top" align="center" sideOffset={16}>
          <div className={styles.header}>
            <strong>{t("Notifications")}</strong>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.markAll}
                onClick={markAllNotificationsRead}
                disabled={unread === 0}
              >
                {t("全部已读")}
              </button>
              <button
                type="button"
                className={styles.markAll}
                disabled={notifications.length === 0}
                onClick={() => setConfirmClear(true)}
              >
                {t("notifications.clear")}
              </button>
            </div>
          </div>
          {confirmClear && notifications.length > 0 && (
            <div className={styles.confirmClear} role="group" aria-label={t("notifications.clear")}>
              <p>{t("notifications.clearConfirm")}</p>
              <div className={styles.headerActions}>
                <button
                  type="button"
                  className={styles.markAll}
                  onClick={() => setConfirmClear(false)}
                >
                  {t("取消")}
                </button>
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => {
                    clearNotifications();
                    setConfirmClear(false);
                  }}
                >
                  {t("notifications.confirmClear")}
                </button>
              </div>
            </div>
          )}
          {notifications.length === 0 ? (
            <p className={styles.empty} role="status">
              {t("暂无提醒")}
            </p>
          ) : (
            <ul className={styles.list}>
              {notifications.map((notification) => {
                const count = notification.dailyDigest?.count;
                const title =
                  count === undefined
                    ? notification.title
                    : count > 0
                      ? t("notifications.dailyDigestPlanned", { count })
                      : t("notifications.dailyDigestEmpty");
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={styles.item}
                      onClick={() => openTask(notification)}
                    >
                      <span className={styles.dot} data-unread={!notification.read || undefined} />
                      <span className={styles.itemBody}>
                        <span className={styles.itemTitle}>{title}</span>
                        <span className={styles.itemTime}>
                          {relativeTime(notification.createdAt, locale)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className={styles.retentionHint}>{t("notifications.retentionHint")}</p>
          <Popover.Arrow className={styles.arrow} height={7} width={12} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
