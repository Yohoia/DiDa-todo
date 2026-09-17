import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type ExportValue = Record<string, unknown>;

const PAGE_SIZE = 500;

const EXPORTS = [
  { key: "profile", table: "profiles", order: "created_at", tie: "id" },
  { key: "preferences", table: "user_preferences", order: "updated_at", tie: "user_id" },
  { key: "tasks", table: "tasks", order: "created_at" },
  { key: "subtasks", table: "subtasks", order: "created_at" },
  { key: "notifications", table: "notifications", order: "created_at" },
  { key: "focusSessions", table: "focus_sessions", order: "started_at" },
  { key: "voiceCaptures", table: "voice_captures", order: "created_at" },
  { key: "voiceHotwords", table: "voice_hotwords", order: "created_at" },
  { key: "growthEvents", table: "growth_events", order: "created_at", tie: "event_key" },
  { key: "growthPlants", table: "growth_plants", order: "created_at" },
] as const satisfies readonly { key: string; table: string; order: string; tie?: string }[];

async function readExportPage(
  client: SupabaseClient,
  table: string,
  order: string,
  tie: string,
  from: number,
): Promise<ExportValue[]> {
  const { data, error } = await client
    .from(table)
    .select("*")
    .order(order, { ascending: true, nullsFirst: false })
    .order(tie, { ascending: true })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(`export_${table}_failed`);
  return (data ?? []) as ExportValue[];
}

export async function buildAccountExport(
  client: SupabaseClient,
  input: { id: string; email?: string },
): Promise<ExportValue> {
  const result: ExportValue = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    account: { id: input.id, email: input.email ?? null },
    credentialsExcluded: true,
  };

  for (const definition of EXPORTS) {
    const rows: ExportValue[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const page = await readExportPage(
        client,
        definition.table,
        definition.order,
        "tie" in definition ? definition.tie : "id",
        from,
      );
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    result[definition.key] = rows;
  }
  return result;
}
