import type { Locale } from "./config";
import { messages, type MessageKey } from "./messages";
export type MessageValues = Record<string, string | number>;
export function createTranslator(locale: Locale) {
  const plurals = new Intl.PluralRules(locale);
  function t(key: MessageKey, values: MessageValues = {}) {
    const entry = messages[key][locale];
    const message =
      typeof entry === "string"
        ? entry
        : entry[plurals.select(Number(values.count)) === "one" ? "one" : "other"];
    return message.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
  }
  /** For predefined UI labels from config arrays. Never use for user-entered task content. */
  function label(value: string) {
    return Object.hasOwn(messages, value) ? t(value as MessageKey) : value;
  }
  function date(value: string | Date, options: Intl.DateTimeFormatOptions = {}) {
    const parsed =
      typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T12:00:00+08:00`)
        : new Date(value);
    return new Intl.DateTimeFormat(locale, { timeZone: "Asia/Shanghai", ...options }).format(
      parsed,
    );
  }
  function number(value: number) {
    return new Intl.NumberFormat(locale).format(value);
  }
  return { t, label, date, number, locale };
}
