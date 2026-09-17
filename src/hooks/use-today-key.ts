"use client";

import { useEffect, useState } from "react";

import { usePreferences } from "@/features/preferences/preferences-provider";
import { getTodayKey } from "@/lib/date-utils";

/** Keep date-based views aligned when the app remains open across midnight. */
export function useTodayKey(explicitTimeZone?: string) {
  const { timeZone: preferenceTimeZone } = usePreferences();
  const timeZone = explicitTimeZone ?? preferenceTimeZone;
  const [todayKey, setTodayKey] = useState(() => getTodayKey(undefined, timeZone));

  useEffect(() => {
    function refresh() {
      setTodayKey((current) => {
        const next = getTodayKey(undefined, timeZone);
        return current === next ? current : next;
      });
    }

    const initial = window.setTimeout(refresh, 0);
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(initial);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [timeZone]);

  return todayKey;
}
