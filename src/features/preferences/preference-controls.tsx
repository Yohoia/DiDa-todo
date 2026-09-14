"use client";

import { HiLanguage, HiMoon, HiSun } from "react-icons/hi2";
import { SiGithub } from "react-icons/si";
import { useI18n, usePreferences } from "./preferences-provider";
import { isLocale } from "@/i18n/config";
import { Select } from "@/components/ui/select";
import styles from "./preferences.module.css";

export function LanguageSelect() {
  const { locale, setLocale, changingLocale } = usePreferences();
  const { t } = useI18n();
  return (
    <Select
      className={styles.languageSelect}
      ariaLabel={t("Language")}
      value={locale}
      disabled={changingLocale}
      onValueChange={(nextLocale) => {
        if (isLocale(nextLocale)) setLocale(nextLocale);
      }}
      options={[
        { value: "zh-CN", label: "简体中文" },
        { value: "en", label: "English" },
      ]}
    />
  );
}
export function ThemeToggle() {
  const { theme, setTheme } = usePreferences();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const Icon = isDark ? HiMoon : HiSun;

  return (
    <button
      type="button"
      className={styles.themeToggle}
      aria-label={isDark ? t("Switch to light mode") : t("Switch to dark mode")}
      title={isDark ? t("Switch to light mode") : t("Switch to dark mode")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Icon size={17} />
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
        <HiLanguage size={17} />
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
        <SiGithub size={17} />
      </a>
    </div>
  );
}
