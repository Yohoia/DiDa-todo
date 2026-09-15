import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseEnv } from "./client";

/** 服务端 Supabase 客户端：Server Component / Route Handler / Server Action 里使用。 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(...supabaseEnv(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component 渲染中不允许写 cookie——会话刷新由 src/proxy.ts 负责
        }
      },
    },
  });
}
