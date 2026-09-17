const AUTO_SEND_GUARD_KEY = "dida-reset-code-sent-at";

/** Supabase treats emails as case-insensitive; guard keys must do the same. */
export function autoSendGuardKey(email: string) {
  return `${AUTO_SEND_GUARD_KEY}:${email.trim().toLowerCase()}`;
}
