import { getI18n } from "@/i18n/server";
import type { Metadata } from "next";
import { InsightsPage } from "@/features/insights/insights-page";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Insights") };
}

export default function Page() {
  return <InsightsPage />;
}
