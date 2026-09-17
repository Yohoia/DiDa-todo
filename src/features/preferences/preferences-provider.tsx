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
import { APP_TIME_ZONE } from "@/lib/date-utils";

type Preferences = {
  locale: Locale;
  theme: Theme;
  timeZone: string;
  hour12: boolean;
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
  initialTimeZone = APP_TIME_ZONE,
  initialHour12 = false,
  children,
}: {
  initialLocale: Locale;
  initialTheme: Theme;
  initialTimeZone?: string;
  initialHour12?: boolean;
  children: ReactNode;
}) {
  const [locale, updateLocale] = useState(initialLocale);
  const [theme, updateTheme] = useState(initialTheme);
  const [changingLocale, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return (
    <PreferencesContext.Provider
      value={{
        locale,
        theme,
        timeZone: initialTimeZone,
        hour12: initialHour12,
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
  const { locale, timeZone, hour12 } = usePreferences();
  return useMemo(() => createTranslator(locale, { timeZone, hour12 }), [locale, timeZone, hour12]);
}
