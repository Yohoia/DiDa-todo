import "server-only";

import { createClient } from "@/lib/supabase/server";

type GuardOptions = {
  scope: "transcribe" | "parse";
  maxBodyBytes: number;
};

type QuotaResult = {
  allowed: boolean;
  retry_after_seconds: number;
};

/**
 * 付费语音接口的统一边界：同源校验、会话验证、请求大小和共享限流。
 * 限流计数由 Supabase 原子函数维护，因此不会在 Vercel 多实例之间失效。
 */
export async function guardVoiceRequest(
  request: Request,
  options: GuardOptions,
): Promise<Response | null> {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || new URL(request.url).protocol.slice(0, -1);
  const hostOrigin = host ? `${protocol}://${host}` : null;
  const configuredOrigins = (process.env.VOICE_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    !origin ||
    (origin !== expectedOrigin && origin !== hostOrigin && !configuredOrigins.includes(origin))
  ) {
    return error("forbidden", 403);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > options.maxBodyBytes) {
    return error("payload_too_large", 413);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  if (authError || !authData?.claims) {
    return error("authentication_required", 401);
  }

  const { data, error: quotaError } = await supabase
    .rpc("consume_voice_quota", { p_scope: options.scope })
    .maybeSingle();
  if (quotaError || !data) {
    console.error(`[voice/${options.scope}] quota check failed: ${quotaError?.message ?? "empty"}`);
    return error("quota_unavailable", 503);
  }

  const quota = data as QuotaResult;
  if (!quota.allowed) {
    return Response.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(Math.max(1, quota.retry_after_seconds)),
        },
      },
    );
  }

  return null;
}

function error(code: string, status: number): Response {
  return Response.json({ error: code }, { status, headers: { "Cache-Control": "no-store" } });
}
