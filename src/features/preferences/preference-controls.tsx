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
    </div>
  );
}
