"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { LanguageSelect, ThemeSelect } from "@/features/preferences/preference-controls";
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
  const { t, label } = useI18n();
  const { preferences, setPreferences, notify } = useWorkspace();
  const [section, setSection] = useState("General");
  function save(patch: Parameters<typeof setPreferences>[0]) {
    setPreferences(patch);
    notify({ key: "已更新本次预览的偏好设置" });
  }
  return (
    <div className={styles.page}>
      <h1 className="sr-only">{t("Settings")}</h1>
      <nav className={styles.sidebar} aria-label={t("设置分类")}>
        {sections.map((item) => (
          <button
            className={cn(styles.sidebarItem, section === item && styles.active)}
            aria-current={section === item ? "page" : undefined}
            onClick={() => setSection(item)}
            key={item}
          >
            {label(item)}
          </button>
        ))}
      </nav>
      <div className={styles.content}>
        {section === "General" && (
          <section className={styles.section}>
            <h2>{t("General Preferences")}</h2>
            <SettingRow
              title={t("Language")}
              description={t("Select your preferred interface language.")}
            >
              <LanguageSelect />
            </SettingRow>
            <SettingRow
              title={t("First Day of Week")}
              description={t("Set the starting day for calendar and weekly views.")}
            >
              <select
                aria-label={t("First Day of Week")}
                value={preferences.firstDay}
                onChange={(event) => save({ firstDay: event.target.value as "Monday" | "Sunday" })}
              >
                <option value="Monday">{t("Monday")}</option>
                <option value="Sunday">{t("Sunday")}</option>
              </select>
            </SettingRow>
            <SettingRow
              title={t("Sound Effects")}
              description={t("Play gentle chime upon completing a task.")}
            >
              <Switch
                label={t("Sound Effects")}
                checked={preferences.sound}
                onChange={(value) => save({ sound: value })}
              />
            </SettingRow>
          </section>
        )}
        {["General", "Focus (Pomodoro)"].includes(section) && (
          <section className={styles.section}>
            <h2>{t("Focus (Pomodoro) Settings")}</h2>
            <SettingRow
              title={t("Pomodoro Duration")}
              description={t("Standard deep work session length in minutes.")}
            >
              <input
                aria-label={t("Pomodoro Duration")}
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
              title={t("Auto-start Breaks")}
              description={t("Automatically start break timer when focus session finishes.")}
            >
              <Switch
                label={t("Auto-start Breaks")}
                checked={preferences.autoBreak}
                onChange={(value) => save({ autoBreak: value })}
              />
            </SettingRow>
          </section>
        )}
        {section === "Tasks & Rules" && (
          <section className={styles.section}>
            <h2>{t("Tasks & Rules")}</h2>
            <SettingRow
              title={t("Daily Capacity")}
              description={t("Choose a comfortable number of tasks for your day.")}
            >
              <input
                aria-label={t("Daily Capacity")}
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
              {t("View today's capacity →")}
            </Link>
          </section>
        )}
        {section === "Notifications" && (
          <section className={styles.section}>
            <h2>{t("Notifications")}</h2>
            <SettingRow
              title={t("Task Reminders")}
              description={t("Keep track of upcoming tasks and focus sessions.")}
            >
              <Switch
                label={t("Task Reminders")}
                checked={preferences.reminders}
                onChange={(value) => save({ reminders: value })}
              />
            </SettingRow>
            <p className={shared.muted}>{t("提醒偏好仅用于页面预览，通知服务尚未接入。")}</p>
          </section>
        )}
        {section === "Appearance" && (
          <section className={styles.section}>
            <h2>{t("Appearance")}</h2>
            <SettingRow title={t("Theme")} description={t("A quiet, warm space for focused work.")}>
              <ThemeSelect />
            </SettingRow>
            <p className={shared.muted}>
              {t("Your display preferences are saved on this device.")}
            </p>
          </section>
        )}
        {section === "Account & Sync" && (
          <section className={styles.section}>
            <h2>{t("Account & Sync")}</h2>
            <SettingRow title="Alex" description={t("Preview account")}>
              <Link href="/profile" className={shared.button}>
                {t("View Profile")}
              </Link>
            </SettingRow>
            <p className={shared.muted}>
              {t("当前使用前端示例数据。账号、同步与云端保存尚未接入。")}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
