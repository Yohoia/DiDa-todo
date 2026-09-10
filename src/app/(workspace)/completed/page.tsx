import { getI18n } from "@/i18n/server";
import type { Metadata } from "next";
import { CompletedPage } from "@/features/tasks/completed-page";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Archive") };
}

export default function Page() {
  return <CompletedPage />;
}
