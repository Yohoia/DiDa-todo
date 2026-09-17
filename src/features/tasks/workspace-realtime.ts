import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceRealtimeStatus = "connecting" | "connected" | "reconnecting" | "offline";

type RealtimeSource = Pick<SupabaseClient, "channel" | "removeChannel"> & {
  realtime: Pick<SupabaseClient["realtime"], "setAuth">;
};

const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000];
const REFRESH_DEBOUNCE_MS = 200;

/** Realtime events are change signals, not a trusted source of complete rows. */
export function createWorkspaceRealtime({
  getClient,
  getAccessToken,
  userId,
  onStatus,
  requestRefresh,
  onError,
  refreshDebounceMs = REFRESH_DEBOUNCE_MS,
  retryDelaysMs = RETRY_DELAYS_MS,
}: {
  getClient: () => RealtimeSource;
  getAccessToken: () => Promise<string | null>;
  userId: string;
  onStatus: (status: WorkspaceRealtimeStatus) => void;
  requestRefresh: () => void;
  onError?: (error: unknown) => void;
  refreshDebounceMs?: number;
  retryDelaysMs?: number[];
}) {
  let active = true;
  let generation = 0;
  let attempts = 0;
  let channel: RealtimeChannel | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const setStatus = (status: WorkspaceRealtimeStatus) => {
    if (active) onStatus(status);
  };

  const clearRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = undefined;
  };

  const handleChange = () => {
    if (!active) return;
    clearRefresh();
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      if (active) requestRefresh();
    }, refreshDebounceMs);
  };

  const removeChannel = (closing: RealtimeChannel) => {
    void getClient()
      .removeChannel(closing)
      .catch((error: unknown) => {
        if (active) onError?.(error);
      });
  };

  const reconnect = () => {
    if (!active) return;
    // removeChannel can synchronously deliver CLOSED to the old subscription.
    // Invalidate that generation before touching the channel to avoid re-entry.
    generation++;
    setStatus("reconnecting");
    if (channel) {
      removeChannel(channel);
      channel = null;
    }
    const delay = retryDelaysMs[Math.min(attempts, retryDelaysMs.length - 1)] ?? 1_000;
    attempts++;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      if (active) connect();
    }, delay);
  };

  const connect = async () => {
    if (!active) return;
    generation++;
    const currentGeneration = generation;
    setStatus("connecting");
    try {
      const client = getClient();
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Realtime auth session is not ready");
      await client.realtime.setAuth(accessToken);
      if (!active || currentGeneration !== generation) return;

      let current = client.channel(`workspace:${userId}:${currentGeneration}`, {
        config: {
          postgres_changes_options: { wait: true },
        },
      });
      for (const table of ["tasks", "subtasks", "user_preferences", "notifications"] as const) {
        current = current.on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
          () => handleChange(),
        );
      }
      channel = current;
      current.subscribe((status, error) => {
        if (!active || currentGeneration !== generation) return;
        if (status === "SUBSCRIBED") {
          attempts = 0;
          setStatus("connected");
          requestRefresh();
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          onError?.(error ?? new Error(`Realtime ${status}`));
          reconnect();
          return;
        }
        if (status === "CLOSED") reconnect();
      });
    } catch (error) {
      if (!active || currentGeneration !== generation) return;
      onError?.(error);
      reconnect();
    }
  };

  void connect();

  return {
    stop() {
      if (!active) return;
      onStatus("offline");
      active = false;
      generation++;
      clearRefresh();
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = undefined;
      if (channel) removeChannel(channel);
      channel = null;
    },
  };
}
