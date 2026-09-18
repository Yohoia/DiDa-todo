import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_REQUIRED_URL } from "@/lib/workspace-access";

export type AuthenticatedSessionUser = {
  id: string;
  email?: string;
  createdAt?: string;
};

/**
 * 每次服务端渲染共享一次已签名 JWT 校验。现代 Supabase 非对称签名可使用缓存
 * JWKS 本地验证；旧对称密钥项目会由 getClaims 自动回退到 Auth 服务校验。
 */
export const getAuthenticatedSession = cache(
  async (): Promise<{
    supabase: Awaited<ReturnType<typeof createClient>>;
    user: AuthenticatedSessionUser;
  } | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) return null;
    return {
      supabase,
      user: {
        id: data.claims.sub,
        email: data.claims.email,
        createdAt: typeof data.claims.created_at === "string" ? data.claims.created_at : undefined,
      },
    };
  },
);

export async function requireWorkspaceSession() {
  const session = await getAuthenticatedSession();
  if (!session) redirect(LOGIN_REQUIRED_URL);
  return session;
}
