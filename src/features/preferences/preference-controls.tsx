"use client";

import { HiMoon, HiSun } from "react-icons/hi2";
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
