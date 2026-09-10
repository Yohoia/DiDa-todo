import { getI18n } from "@/i18n/server";
import type { Metadata } from "next";
import { InboxPage } from "@/features/tasks/inbox-page";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Inbox") };
}

export default function Page() {
  return <InboxPage />;
}
