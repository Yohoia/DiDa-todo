import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/features/tasks/workspace-provider";
import { WorkspaceNav } from "@/components/layout/workspace-nav";
import { WorkspaceOverlays } from "@/features/tasks/workspace-overlays";
import styles from "@/styles/workspace.module.css";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <div className={styles.shell}>
        <a href="#workspace-main" className="sr-only focus:not-sr-only">
          跳转到主要内容
        </a>
        <main id="workspace-main">{children}</main>
        <WorkspaceNav />
      </div>
      <WorkspaceOverlays />
    </WorkspaceProvider>
  );
}
