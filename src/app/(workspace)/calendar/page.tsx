import { getI18n } from "@/i18n/server";
import type { Metadata } from "next";
import { CalendarPage } from "@/features/calendar/calendar-page";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Schedule") };
}

export default function Page() {
  return <CalendarPage />;
}
