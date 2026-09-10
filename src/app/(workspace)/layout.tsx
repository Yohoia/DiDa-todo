import { PreferenceControls } from "@/features/preferences/preference-controls";
import { getI18n } from "@/i18n/server";
import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/features/tasks/workspace-provider";
import { WorkspaceNav } from "@/components/layout/workspace-nav";
import { WorkspaceOverlays } from "@/features/tasks/workspace-overlays";
import styles from "@/styles/workspace.module.css";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  return (
    <WorkspaceProvider>
      <div className={styles.shell}>
        <a href="#workspace-main" className="sr-only focus:not-sr-only">
          {t("跳转到主要内容")}
        </a>
        <div className={styles.utilityBar}>
          <PreferenceControls />
        </div>
        <main id="workspace-main">{children}</main>
        <WorkspaceNav />
      </div>
      <WorkspaceOverlays />
    </WorkspaceProvider>
  );
}
