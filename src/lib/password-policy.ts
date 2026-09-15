import type { MessageKey } from "@/i18n/messages";

export const PASSWORD_RULES: ReadonlyArray<{
  key: MessageKey;
  test: (password: string) => boolean;
}> = [
  { key: "长度至少 8 个字符", test: (password) => password.length >= 8 },
  { key: "包含大写字母", test: (password) => /[A-Z]/.test(password) },
  { key: "包含小写字母", test: (password) => /[a-z]/.test(password) },
  { key: "包含数字", test: (password) => /\d/.test(password) },
  { key: "包含特殊字符（如 !@#$%）", test: (password) => /[^A-Za-z0-9]/.test(password) },
];

export function meetsPasswordPolicy(password: string): boolean {
  return PASSWORD_RULES.every(({ test }) => test(password));
}
