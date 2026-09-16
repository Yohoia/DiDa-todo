import { getI18n } from "@/i18n/server";
import type { Metadata } from "next";
import { InsightsPage } from "@/features/insights/insights-page";
import { requireWorkspaceSession } from "@/lib/server/workspace-session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Insights") };
}

export default async function Page() {
  await requireWorkspaceSession();
  return <InsightsPage />;
}
