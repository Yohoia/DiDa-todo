import { getI18n } from "@/i18n/server";
import type { Metadata } from "next";
import { ProfilePage } from "@/features/profile/profile-page";
import { requireWorkspaceSession } from "@/lib/server/workspace-session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Profile") };
}

export default async function Page() {
  await requireWorkspaceSession();
  return <ProfilePage />;
}
