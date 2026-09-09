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

export const metadata: Metadata = {
  title: {
    default: "DiDa-todo",
    template: "%s | DiDa-todo",
  },
  description: "DiDa-todo，从想法到完成，掌控每一天。克制、优雅的待办与时间管理体验。",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
