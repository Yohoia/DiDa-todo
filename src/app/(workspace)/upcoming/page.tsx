import { getI18n } from "@/i18n/server";
import type { Metadata } from "next";
import { UpcomingPage } from "@/features/tasks/upcoming-page";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Upcoming") };
}

export default function Page() {
  return <UpcomingPage />;
}
