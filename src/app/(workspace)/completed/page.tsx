import { getI18n } from "@/i18n/server";
import type { Metadata } from "next";
import { CompletedPage } from "@/features/tasks/completed-page";
import { requireWorkspaceSession } from "@/lib/server/workspace-session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Archive") };
}

export default async function Page() {
  await requireWorkspaceSession();
  return <CompletedPage />;
}
