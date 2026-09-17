import { Brand } from "@/components/shared/brand";
import { getI18n } from "@/i18n/server";
import type { ReactNode } from "react";
import { WorkspaceProvider, type WorkspaceUser } from "@/features/tasks/workspace-provider";
import { WorkspaceNav } from "@/components/layout/workspace-nav";
import { WorkspaceOverlays } from "@/features/tasks/workspace-overlays";
import { WorkspaceSyncStatus } from "@/features/tasks/workspace-sync-status";
import { PageTransition } from "@/components/layout/page-transition";
import { requireWorkspaceSession } from "@/lib/server/workspace-session";
import { createRepository } from "@/lib/data/repository";
import styles from "@/styles/workspace.module.css";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  const { supabase, user: authUser } = await requireWorkspaceSession();
  const user: WorkspaceUser = { id: authUser.id, email: authUser.email ?? "", displayName: "" };
  const repository = createRepository(supabase, user.id);
  const [loadedTasks, loadedPreferences, profile, loadedNotifications, recurrenceAvailable] =
    await Promise.all([
      repository.loadWorkspaceTasks(),
      repository.loadPreferences(),
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      repository.listNotifications(),
      repository.supportsRepeatingTasks(),
    ]);
  if (profile.error) throw new Error("Workspace profile could not be loaded");
  user.displayName = profile.data?.display_name?.trim() || user.email.split("@")[0] || "Friend";

  return (
    <WorkspaceProvider
      key={user.id}
      initialTasks={loadedTasks}
      initialPreferences={loadedPreferences}
      initialNotifications={loadedNotifications}
      recurrenceAvailable={recurrenceAvailable}
      user={user}
    >
      <div className={styles.shell}>
        <a href="#workspace-main" className="sr-only focus:not-sr-only">
          {t("跳转到主要内容")}
        </a>
        <div className={styles.utilityBar}>
          <Brand className={styles.utilityBrand} compact />
          <WorkspaceSyncStatus />
        </div>
        <main id="workspace-main">
          <PageTransition>{children}</PageTransition>
        </main>
        <WorkspaceNav />
      </div>
      <WorkspaceOverlays />
    </WorkspaceProvider>
  );
}
