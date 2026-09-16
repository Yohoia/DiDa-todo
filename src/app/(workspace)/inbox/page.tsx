import { getI18n } from "@/i18n/server";
import type { Metadata } from "next";
import { InboxPage } from "@/features/tasks/inbox-page";
import { requireWorkspaceSession } from "@/lib/server/workspace-session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Inbox") };
}

export default async function Page() {
  await requireWorkspaceSession();
  return <InboxPage />;
}
