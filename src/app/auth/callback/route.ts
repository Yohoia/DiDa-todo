import { NextResponse } from "next/server";

import { safeAuthRedirect } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase 邮件链接落点（PKCE flow）：注册确认 / 密码重置链接带 ?code=...，
 * 在此换取会话 cookie 后进入工作台。域名需先加入 Supabase Auth 的 Redirect URLs。
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const safeNext = safeAuthRedirect(searchParams.get("next"), origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, origin));
    }
  }

  return NextResponse.redirect(new URL("/?auth_error=email_link", origin));
}
