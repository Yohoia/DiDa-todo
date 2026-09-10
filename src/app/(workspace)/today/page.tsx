import { getI18n } from "@/i18n/server";
import type { Metadata } from "next";
import { TodayPage } from "@/features/tasks/today-page";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Today") };
}

export default function Page() {
  return <TodayPage />;
}
