import { createBrowserClient } from "@supabase/ssr";

/** 浏览器端 Supabase 客户端：Client Component 里使用（匿名 key + RLS）。 */
export function createClient() {
  return createBrowserClient(...supabaseEnv());
}

export function supabaseEnv(): [string, string] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase 未配置：请在 .env.local 填入 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return [url, anonKey];
}
