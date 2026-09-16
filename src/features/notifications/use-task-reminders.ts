"use client";

import { useEffect, useRef } from "react";

import { useI18n } from "@/features/preferences/preferences-provider";
import { useWorkspace } from "@/features/tasks/workspace-provider";

import { playNotificationChime } from "./notification-chime";

/**
 * 站内任务提醒（无系统通知、无后台任务）：
 * - 页面打开期间每 60 秒扫描一次，进入提醒窗口的任务生成站内通知（持久化）；
 * - 回访补扫：提醒时间已过但不足 24h 的未完成任务同样补生成，
 *   因此关闭页面期间「错过」的提醒会在下次打开应用时出现在通知中心。
 * 去重由 WorkspaceProvider（本地按 taskId）+ 数据库唯一索引双重保证。
 */
const TICK_MS = 60_000;
const CATCHUP_WINDOW_MS = 24 * 60 * 60 * 1000;

function parseOffsetMinutes(reminder: string): number | null {
  const match = /^(\d+) min before$/.exec(reminder);
  return match ? Number(match[1]) : null;
}

export function useTaskReminders() {
  const workspace = useWorkspace();
  const { tasks, preferences, recordTaskDueNotification, notify } = workspace;
  const { date } = useI18n();
  // 任务编辑高频触发渲染：ref 镜像让 interval 只依赖全局开关，避免反复重建。
  const latest = useRef({ tasks, preferences, recordTaskDueNotification, notify, date });
  useEffect(() => {
    latest.current = { tasks, preferences, recordTaskDueNotification, notify, date };
  });

  useEffect(() => {
    if (!preferences.reminders) return;
    const tick = () => {
      const now = Date.now();
      const { tasks, preferences, recordTaskDueNotification, notify, date } = latest.current;
      if (!preferences.reminders) return;
      for (const task of tasks) {
        const offset = parseOffsetMinutes(task.reminder);
        if (task.completed || !task.date || !task.time || offset === null) continue;
        // date/time 为本地时间语义（与日历/时间轴一致）
        const due = new Date(`${task.date}T${task.time}:00`);
        const remindAt = due.getTime() - offset * 60_000;
        if (now < remindAt || now >= remindAt + CATCHUP_WINDOW_MS) continue;
        const created = recordTaskDueNotification({
          taskId: task.id,
          title: task.title,
          remindAt: new Date(remindAt).toISOString(),
        });
        if (!created) continue;
        // 轻反馈：toast + 提示音（跟随全局音效偏好）；持久提醒见通知中心
        notify({
          key: "notifications.taskDueBody",
          values: {
            title: task.title,
            time: date(due, { hour: "numeric", minute: "2-digit" }),
          },
        });
        if (preferences.sound) playNotificationChime();
      }
    };
    tick();
    const timer = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(timer);
  }, [preferences.reminders]);
}
