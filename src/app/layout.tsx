import { getPreferences, getI18n } from "@/i18n/server";
import { PreferencesProvider } from "@/features/preferences/preferences-provider";
import { MotionProvider } from "@/components/ui/motion-provider";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/playfair-display/700.css";
import "@/styles/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: {
      default: "DiDa-todo",
      template: "%s | DiDa-todo",
    },
    description: t("app.description"),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { locale, theme } = await getPreferences();
  return (
    <html
      lang={locale}
      data-theme={theme}
      className={theme === "dark" ? "dark" : undefined}
      data-scroll-behavior="smooth"
    >
      <body>
        <MotionProvider>
          <PreferencesProvider initialLocale={locale} initialTheme={theme}>
            {children}
          </PreferencesProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
