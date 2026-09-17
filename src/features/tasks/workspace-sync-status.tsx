"use client";

import { useI18n } from "@/features/preferences/preferences-provider";
import { cn } from "@/lib/utils";
import styles from "@/styles/workspace.module.css";
import { useWorkspace } from "./workspace-provider";
import type { WorkspaceRealtimeStatus } from "./workspace-realtime";

const statusKeys: Record<
  Exclude<WorkspaceRealtimeStatus, "offline">,
  "sync.realtime.connected" | "sync.realtime.connecting" | "sync.realtime.reconnecting"
> = {
  connected: "sync.realtime.connected",
  connecting: "sync.realtime.connecting",
  reconnecting: "sync.realtime.reconnecting",
};

export function WorkspaceSyncStatus() {
  const { t } = useI18n();
  const { realtimeStatus } = useWorkspace();
  if (realtimeStatus === "offline") return null;
  return (
    <span
      className={cn(
        styles.syncStatus,
        realtimeStatus === "connected" && styles.syncStatusConnected,
        realtimeStatus === "reconnecting" && styles.syncStatusReconnecting,
      )}
      role="status"
      aria-live="polite"
    >
      <span className={styles.syncDot} aria-hidden="true" />
      {t(statusKeys[realtimeStatus])}
    </span>
  );
}
