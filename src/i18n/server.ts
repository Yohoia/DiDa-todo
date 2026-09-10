import { cookies } from "next/headers";
import { cache } from "react";
import {
  defaultLocale,
  defaultTheme,
  isLocale,
  isTheme,
  localeCookie,
  themeCookie,
} from "./config";
import { createTranslator } from "./translate";

export const getPreferences = cache(async () => {
  const store = await cookies();
  const locale = store.get(localeCookie)?.value;
  const theme = store.get(themeCookie)?.value;
  return {
    locale: isLocale(locale) ? locale : defaultLocale,
    theme: isTheme(theme) ? theme : defaultTheme,
  };
});
export async function getI18n() {
  return createTranslator((await getPreferences()).locale);
}
