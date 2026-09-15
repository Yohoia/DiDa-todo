/** profiles.avatar_url 中的生成头像标记：niceavatar://<种子>（渲染在客户端 avatar-view 完成） */
export const AVATAR_PREFIX = "niceavatar://";

/**
 * 从 avatar_url 提取生成种子：niceavatar:// 前缀取种子；
 * 空值时回退用邮箱种子；外部图片地址/占位场景返回 null。
 */
export function avatarSeed(
  avatarUrl: string | null | undefined,
  fallbackSeed: string | null | undefined,
): string | null {
  const trimmed = avatarUrl?.trim();
  if (trimmed?.startsWith(AVATAR_PREFIX)) return trimmed.slice(AVATAR_PREFIX.length);
  const fallback = fallbackSeed?.trim();
  if (!trimmed && fallback) return fallback;
  return null;
}

/** avatar_url 是可用图片地址（http(s)/data:/相对路径）时返回该地址，否则 null（未知协议回退生成式） */
export function avatarImageSrc(avatarUrl: string | null | undefined): string | null {
  const trimmed = avatarUrl?.trim();
  if (!trimmed || trimmed.startsWith(AVATAR_PREFIX)) return null;
  if (/^(https?:|data:|\/)/i.test(trimmed)) return trimmed;
  return null;
}

/** 换一个/注册时生成随机种子 */
export function randomAvatarSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}
