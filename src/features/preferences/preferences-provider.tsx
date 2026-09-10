"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { localeCookie, themeCookie, type Locale, type Theme } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";

type Preferences = {
  locale: Locale;
  theme: Theme;
  changingLocale: boolean;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
};
const PreferencesContext = createContext<Preferences | null>(null);
function saveCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
export function PreferencesProvider({
  initialLocale,
  initialTheme,
  children,
}: {
  initialLocale: Locale;
  initialTheme: Theme;
  children: ReactNode;
}) {
  const [locale, updateLocale] = useState(initialLocale);
  const [theme, updateTheme] = useState(initialTheme);
  const [changingLocale, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function apply() {
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && media.matches),
      );
    }
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  return (
    <PreferencesContext.Provider
      value={{
        locale,
        theme,
        changingLocale,
        setLocale: (next) => {
          saveCookie(localeCookie, next);
          updateLocale(next);
          document.documentElement.lang = next;
          startTransition(() => router.refresh());
        },
        setTheme: (next) => {
          saveCookie(themeCookie, next);
          updateTheme(next);
        },
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences requires PreferencesProvider");
  return context;
}
export function useI18n() {
  const { locale } = usePreferences();
  return useMemo(() => createTranslator(locale), [locale]);
}
