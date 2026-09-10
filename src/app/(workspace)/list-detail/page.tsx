import { getI18n } from "@/i18n/server";
import type { Metadata } from "next";
import { ListPage } from "@/features/tasks/list-page";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Work & Projects") };
}

export default function Page() {
  return <ListPage />;
}
