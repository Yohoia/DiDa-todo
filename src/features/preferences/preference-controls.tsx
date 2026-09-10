"use client";

import { Languages, Moon, Sun, Monitor } from "lucide-react";
import { useI18n, usePreferences } from "./preferences-provider";
import { isLocale, isTheme } from "@/i18n/config";
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
export function ThemeSelect() {
  const { theme, setTheme } = usePreferences();
  const { t } = useI18n();
  return (
    <select
      className={styles.select}
      aria-label={t("Theme")}
      value={theme}
      onChange={(event) => {
        if (isTheme(event.target.value)) setTheme(event.target.value);
      }}
    >
      <option value="light">{t("Light")}</option>
      <option value="dark">{t("Dark")}</option>
      <option value="system">{t("System")}</option>
    </select>
  );
}
export function PreferenceControls() {
  const { locale, theme, setLocale, changingLocale } = usePreferences();
  const { t } = useI18n();
  const Icon = theme === "system" ? Monitor : theme === "dark" ? Moon : Sun;
  return (
    <div className={styles.controls} role="group" aria-label={t("Display preferences")}>
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
      <div className={styles.theme}>
        <Icon size={17} strokeWidth={1.5} aria-hidden="true" />
        <ThemeSelect />
      </div>
    </div>
  );
}
