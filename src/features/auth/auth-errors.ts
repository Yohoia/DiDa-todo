/** 登录/注册/重置共用的 Supabase 错误映射与邮箱校验。 */

/** Supabase 英文错误 → 可读文案；未知错误原样返回（label/t 对非键文本原样展示）。 */
export function authErrorText(error: { code?: string; message: string }): string {
  const text = error.message.toLowerCase();
  if (error.code === "invalid_credentials" || text.includes("invalid login credentials")) {
    return "邮箱或密码不正确。";
  }
  if (error.code === "email_not_confirmed") return "邮箱尚未验证，请先查收确认邮件。";
  if (error.code === "otp_expired" || text.includes("otp") || text.includes("expired")) {
    return "验证码错误或已过期。";
  }
  if (text.includes("not found")) return "该邮箱尚未注册，请先注册。";
  if (error.code === "user_already_exists" || text.includes("already registered")) {
    return "该邮箱已注册，可以直接登录。";
  }
  if (error.code === "weak_password" || text.includes("password should be")) {
    return "密码强度不足，请更换更复杂的密码。";
  }
  if (error.code === "over_request_rate_limit" || text.includes("rate limit")) {
    return "尝试太频繁，请稍后再试。";
  }
  return error.message;
}

/** 常见邮箱格式的宽松校验（最终能否收信以验证码为准） */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
