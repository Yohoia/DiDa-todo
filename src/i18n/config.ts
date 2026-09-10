export const locales = ["zh-CN", "en"] as const;
export type Locale = (typeof locales)[number];
export type Theme = "light" | "dark";
export const localeCookie = "dida-locale";
export const themeCookie = "dida-theme";
export const defaultLocale: Locale = "zh-CN";
export const defaultTheme: Theme = "light";
export function isLocale(value: unknown): value is Locale {
  return value === "zh-CN" || value === "en";
}
export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}
