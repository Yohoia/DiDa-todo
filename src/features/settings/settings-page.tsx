"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { LanguageSelect, ThemeToggle } from "@/features/preferences/preference-controls";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useWorkspace } from "@/features/tasks/workspace-provider";
import { Select } from "@/components/ui/select";
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
/**
 * 数字输入允许清空与中途非法态（本地草稿），失焦或回车时才校验提交，
 * 避免受控值拒绝空串导致用户无法删除重输。
 */
function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);
  const commit = () => {
    if (draft === null) return;
    const next = Math.round(Number(draft));
    setDraft(null);
    if (Number.isFinite(next) && next >= min && next <= max) onChange(next);
  };
  return (
    <input
      aria-label={label}
      type="number"
      min={min}
      max={max}
      value={shown}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}
export function SettingsPage({ profileName }: { profileName: string }) {
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
              <Select
                ariaLabel={t("First Day of Week")}
                value={preferences.firstDay}
                onValueChange={(firstDay) => save({ firstDay })}
                align="end"
                options={[
                  { value: "Monday", label: t("Monday") },
                  { value: "Sunday", label: t("Sunday") },
                ]}
              />
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
              <NumberField
                label={t("Pomodoro Duration")}
                value={preferences.duration}
                min={1}
                max={120}
                onChange={(duration) => save({ duration })}
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
              <NumberField
                label={t("Daily Capacity")}
                value={preferences.dailyCapacity}
                min={1}
                max={30}
                onChange={(dailyCapacity) => save({ dailyCapacity })}
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
              <ThemeToggle />
            </SettingRow>
            <p className={shared.muted}>
              {t("Your display preferences are saved on this device.")}
            </p>
          </section>
        )}
        {section === "Account & Sync" && (
          <section className={styles.section}>
            <h2>{t("Account & Sync")}</h2>
            <SettingRow title={profileName} description={t("Preview account")}>
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
