import { getI18n } from "@/i18n/server";
import type { Metadata } from "next";
import { SettingsPage } from "@/features/settings/settings-page";
import { getProfile } from "@/features/profile/profile-service";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Settings") };
}

export default async function Page() {
  const profile = await getProfile();
  return <SettingsPage profileName={profile.displayName} />;
}
