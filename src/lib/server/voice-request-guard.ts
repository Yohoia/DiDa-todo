import "server-only";

type Bucket = { count: number; resetAt: number };

const globalVoiceState = globalThis as typeof globalThis & {
  __didaVoiceRateLimits?: Map<string, Bucket>;
};
const buckets = (globalVoiceState.__didaVoiceRateLimits ??= new Map<string, Bucket>());

type GuardOptions = {
  scope: "transcribe" | "parse";
  limit: number;
  maxBodyBytes: number;
};

/**
 * Lightweight protection for the prototype's paid voice endpoints.
 *
 * Known limitation (accepted for the no-auth prototype): on a DIRECT connection
 * an attacker can spoof `Origin` together with `x-forwarded-host`/`-proto` to
 * satisfy the origin check, and rotate fake `x-forwarded-for` values to dilute
 * the per-IP buckets — so this guard stops browser CSRF and honest clients,
 * not scripted abuse. It protects paid keys from accidental/naive burn only.
 * Production deployments behind a trusted proxy should strip client-supplied
 * forwarded headers at the edge, replace the in-memory bucket with a shared
 * limiter, and add account-level quotas when auth lands.
 */
export function guardVoiceRequest(request: Request, options: GuardOptions): Response | null {
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

  const now = Date.now();
  const client = clientAddress(request);
  const key = `${options.scope}:${client}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
  } else if (current.count >= options.limit) {
    return Response.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))),
        },
      },
    );
  } else {
    current.count += 1;
  }

  // Bound memory for long-running local/self-hosted processes.
  if (buckets.size > 1_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }
  return null;
}

function clientAddress(request: Request): string {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

function error(code: string, status: number): Response {
  return Response.json({ error: code }, { status, headers: { "Cache-Control": "no-store" } });
}
