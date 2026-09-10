"use client";

import { Languages, Moon, Sun } from "lucide-react";
import { useI18n, usePreferences } from "./preferences-provider";
import { isLocale } from "@/i18n/config";
import styles from "./preferences.module.css";

export function LanguageSelect() {
  const { locale, setLocale, changingLocale } = usePreferences();
  const { t } = useI18n();
  return (
    <select
      className={styles.select}
      aria-label={t("Language")}
      value={locale}
      disabled={changingLocale}
      onChange={(event) => {
        if (isLocale(event.target.value)) setLocale(event.target.value);
      }}
    >
      <option value="zh-CN">简体中文</option>
      <option value="en">English</option>
    </select>
  );
}
export function ThemeToggle() {
  const { theme, setTheme } = usePreferences();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const Icon = isDark ? Moon : Sun;

  return (
    <button
      type="button"
      className={styles.themeToggle}
      aria-label={isDark ? t("Switch to light mode") : t("Switch to dark mode")}
      title={isDark ? t("Switch to light mode") : t("Switch to dark mode")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Icon size={17} strokeWidth={1.5} />
    </button>
  );
}
export function PreferenceControls() {
  const { locale, setLocale, changingLocale } = usePreferences();
  const { t } = useI18n();
  return (
    <div className={styles.controls} role="group" aria-label="Display preferences">
      <button
        className={styles.language}
        type="button"
        aria-label={locale === "zh-CN" ? "Switch to English" : "切换为简体中文"}
        title={locale === "zh-CN" ? "Switch to English" : "切换为简体中文"}
        disabled={changingLocale}
        aria-busy={changingLocale}
        onClick={() => setLocale(locale === "zh-CN" ? "en" : "zh-CN")}
      >
        <Languages size={17} strokeWidth={1.5} />
        <span>{locale === "zh-CN" ? "中" : "EN"}</span>
      </button>
      <ThemeToggle />
      <a
        href="https://github.com/Yohoia/DiDa-todo"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.githubLink}
        aria-label={t("View source on GitHub")}
        title={t("View source on GitHub")}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
      </a>
    </div>
  );
}
