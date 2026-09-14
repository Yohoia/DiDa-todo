"use client";

import { useEffect, useState } from "react";

import { getTodayKey } from "@/lib/date-utils";

/** Keep date-based views aligned when the app remains open across midnight. */
export function useTodayKey() {
  const [todayKey, setTodayKey] = useState(() => getTodayKey());

  useEffect(() => {
    const refresh = () =>
      setTodayKey((current) => {
        const next = getTodayKey();
        return current === next ? current : next;
      });
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return todayKey;
}
