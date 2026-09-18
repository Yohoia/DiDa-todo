import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseEnv } from "@/lib/supabase/client";
import { isWorkspacePath, LOGIN_REQUIRED_URL } from "@/lib/workspace-access";

/**
 * Supabase 会话刷新代理（本版本 Next.js 的 middleware 已更名为 proxy）。
 * 每个页面请求前刷新会话并拦截游客访问工作区。
 * 页面和数据层仍独立验证；API 在 Route Handler 内验证，此处跳过。
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(...supabaseEnv(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getClaims() 验证签名 JWT，并在令牌临近过期时先刷新会话；cookie 仍经 setAll 写回。
  const { data, error } = await supabase.auth.getClaims();

  if (isWorkspacePath(request.nextUrl.pathname) && (error || !data?.claims)) {
    const redirectResponse = NextResponse.redirect(new URL(LOGIN_REQUIRED_URL, request.url));
    // 保留刷新/清除的认证 cookie，避免重定向后继续带着失效会话。
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    redirectResponse.headers.set("Cache-Control", "private, no-store");
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
