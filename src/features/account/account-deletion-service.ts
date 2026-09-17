import "server-only";

import { createClient } from "@supabase/supabase-js";

export function accountDeletionConfigured() {
  return Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL),
  );
}

function adminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("not_configured");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function deleteOwnAccount(userId: string): Promise<void> {
  const client = adminClient();
  const audit = await client
    .from("account_deletion_audits")
    .insert({ user_id: userId, status: "requested" })
    .select("id")
    .single();
  if (audit.error) throw new Error("audit_failed");

  const deleted = await client.auth.admin.deleteUser(userId);
  if (deleted.error) {
    await client
      .from("account_deletion_audits")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", audit.data.id);
    throw new Error("delete_failed");
  }

  const completed = await client
    .from("account_deletion_audits")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", audit.data.id);
  if (completed.error) throw new Error("audit_failed");
}
