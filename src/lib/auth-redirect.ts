const DEFAULT_AUTH_REDIRECT = "/today";

/**
 * 只允许回到当前站点内的绝对路径。
 * URL 会把 `/\\evil.example` 规范化成站外地址，因此不能只检查 `startsWith("/")`。
 */
export function safeAuthRedirect(value: string | null, origin: string): string {
  if (!value || !value.startsWith("/") || value.includes("\\")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    const target = new URL(value, origin);
    if (target.origin !== origin) return DEFAULT_AUTH_REDIRECT;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}
