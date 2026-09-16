import { Brand } from "@/components/shared/brand";
import { NotificationBell } from "@/components/ui/notification-bell";
import { getI18n } from "@/i18n/server";
import type { ReactNode } from "react";
import { WorkspaceProvider, type WorkspaceUser } from "@/features/tasks/workspace-provider";
import { WorkspaceNav } from "@/components/layout/workspace-nav";
import { WorkspaceOverlays } from "@/features/tasks/workspace-overlays";
import { PageTransition } from "@/components/layout/page-transition";
import { createClient } from "@/lib/supabase/server";
import {
  createRepository,
  DEFAULT_PREFERENCES,
  type StoredPreferences,
} from "@/lib/data/repository";
import { initialTasks } from "@/features/tasks/demo-data";
import type { Task } from "@/types/task";
import type { AppNotification } from "@/types/notification";
import styles from "@/styles/workspace.module.css";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  // 游客（未登录）保留演示数据预览；登录用户加载自己的任务与偏好
  let tasks: Task[] = initialTasks;
  let preferences: StoredPreferences = DEFAULT_PREFERENCES;
  let notifications: AppNotification[] = [];
  let user: WorkspaceUser | null = null;

  if (data.user) {
    user = { id: data.user.id, email: data.user.email ?? "", displayName: "" };
    const repository = createRepository(supabase, user.id);
    const [loadedTasks, loadedPreferences, profile, loadedNotifications] = await Promise.all([
      repository.loadTasks().catch((error: unknown) => {
        console.error("load tasks failed:", error);
        return [] as Task[];
      }),
      repository.loadPreferences().catch(() => DEFAULT_PREFERENCES),
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      repository.listNotifications().catch((error: unknown) => {
        console.error("load notifications failed:", error);
        return [] as AppNotification[];
      }),
    ]);
    tasks = loadedTasks;
    preferences = loadedPreferences;
    notifications = loadedNotifications;
    user.displayName = profile.data?.display_name?.trim() || user.email.split("@")[0] || "Friend";
  }

  return (
    <WorkspaceProvider
      initialTasks={tasks}
      initialPreferences={preferences}
      initialNotifications={notifications}
      user={user}
    >
      <div className={styles.shell}>
        <a href="#workspace-main" className="sr-only focus:not-sr-only">
          {t("跳转到主要内容")}
        </a>
        <div className={styles.utilityBar}>
          <Brand className={styles.utilityBrand} compact />
          <div className={styles.utilityRight}>
            <NotificationBell />
          </div>
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
