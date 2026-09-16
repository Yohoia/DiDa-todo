import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_REQUIRED_URL } from "@/lib/workspace-access";

/** 每次服务端渲染共享一次真实用户校验，不信任客户端传入的用户信息。 */
export const getAuthenticatedSession = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, user: data.user };
});

export async function requireWorkspaceSession() {
  const session = await getAuthenticatedSession();
  if (!session) redirect(LOGIN_REQUIRED_URL);
  return session;
}
