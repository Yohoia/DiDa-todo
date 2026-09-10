export const locales = ["zh-CN", "en"] as const;
export type Locale = (typeof locales)[number];
export type Theme = "light" | "dark" | "system";
export const localeCookie = "dida-locale";
export const themeCookie = "dida-theme";
export const defaultLocale: Locale = "zh-CN";
export function isLocale(value: unknown): value is Locale {
  return value === "zh-CN" || value === "en";
}
export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}
