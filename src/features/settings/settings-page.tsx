"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useWorkspace } from "@/features/tasks/workspace-provider";
import { cn } from "@/lib/utils";
import shared from "@/styles/workspace.module.css";
import styles from "./settings.module.css";

const sections = [
  "General",
  "Tasks & Rules",
  "Focus (Pomodoro)",
  "Notifications",
  "Appearance",
  "Account & Sync",
];
function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <div>
        <div className={styles.title}>{title}</div>
        <div className={styles.description}>{description}</div>
      </div>
      {children}
    </div>
  );
}
function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      className={styles.switch}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
export function SettingsPage() {
  const { preferences, setPreferences, notify } = useWorkspace();
  const [section, setSection] = useState("General");
  function save(patch: Parameters<typeof setPreferences>[0]) {
    setPreferences(patch);
    notify("已更新本次预览的偏好设置");
  }
  return (
    <div className={styles.page}>
      <h1 className="sr-only">Settings</h1>
      <nav className={styles.sidebar} aria-label="设置分类">
        {sections.map((item) => (
          <button
            className={cn(styles.sidebarItem, section === item && styles.active)}
            aria-current={section === item ? "page" : undefined}
            onClick={() => setSection(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </nav>
      <div className={styles.content}>
        {section === "General" && (
          <section className={styles.section}>
            <h2>General Preferences</h2>
            <SettingRow
              title="First Day of Week"
              description="Set the starting day for calendar and weekly views."
            >
              <select
                aria-label="First Day of Week"
                value={preferences.firstDay}
                onChange={(event) => save({ firstDay: event.target.value as "Monday" | "Sunday" })}
              >
                <option>Monday</option>
                <option>Sunday</option>
              </select>
            </SettingRow>
            <SettingRow
              title="Sound Effects"
              description="Play gentle chime upon completing a task."
            >
              <Switch
                label="Sound Effects"
                checked={preferences.sound}
                onChange={(value) => save({ sound: value })}
              />
            </SettingRow>
          </section>
        )}
        {["General", "Focus (Pomodoro)"].includes(section) && (
          <section className={styles.section}>
            <h2>Focus (Pomodoro) Settings</h2>
            <SettingRow
              title="Pomodoro Duration"
              description="Standard deep work session length in minutes."
            >
              <input
                aria-label="Pomodoro Duration"
                type="number"
                min={1}
                max={120}
                value={preferences.duration}
                onChange={(event) => {
                  const duration = Number(event.target.value);
                  if (duration >= 1 && duration <= 120) setPreferences({ duration });
                }}
              />
            </SettingRow>
            <SettingRow
              title="Auto-start Breaks"
              description="Automatically start break timer when focus session finishes."
            >
              <Switch
                label="Auto-start Breaks"
                checked={preferences.autoBreak}
                onChange={(value) => save({ autoBreak: value })}
              />
            </SettingRow>
          </section>
        )}
        {section === "Tasks & Rules" && (
          <section className={styles.section}>
            <h2>Tasks &amp; Rules</h2>
            <SettingRow
              title="Daily Capacity"
              description="Choose a comfortable number of tasks for your day."
            >
              <input
                aria-label="Daily Capacity"
                type="number"
                min={1}
                max={30}
                value={preferences.dailyCapacity}
                onChange={(event) => {
                  const dailyCapacity = Number(event.target.value);
                  if (dailyCapacity >= 1 && dailyCapacity <= 30) setPreferences({ dailyCapacity });
                }}
              />
            </SettingRow>
            <Link href="/today" className={shared.textButton}>
              View today&apos;s capacity →
            </Link>
          </section>
        )}
        {section === "Notifications" && (
          <section className={styles.section}>
            <h2>Notifications</h2>
            <SettingRow
              title="Task Reminders"
              description="Keep track of upcoming tasks and focus sessions."
            >
              <Switch
                label="Task Reminders"
                checked={preferences.reminders}
                onChange={(value) => save({ reminders: value })}
              />
            </SettingRow>
            <p className={shared.muted}>提醒偏好仅用于页面预览，通知服务尚未接入。</p>
          </section>
        )}
        {section === "Appearance" && (
          <section className={styles.section}>
            <h2>Appearance</h2>
            <SettingRow title="Theme" description="A quiet, warm space for focused work.">
              <span className={shared.tag}>Warm Light</span>
            </SettingRow>
            <p className={shared.muted}>当前设计稿为浅色主题。</p>
          </section>
        )}
        {section === "Account & Sync" && (
          <section className={styles.section}>
            <h2>Account &amp; Sync</h2>
            <SettingRow title="Alex" description="Preview account">
              <Link href="/profile" className={shared.button}>
                View Profile
              </Link>
            </SettingRow>
            <p className={shared.muted}>当前使用前端示例数据。账号、同步与云端保存尚未接入。</p>
          </section>
        )}
      </div>
    </div>
  );
}
