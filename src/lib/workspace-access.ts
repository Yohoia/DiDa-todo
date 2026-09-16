/** 公开首页和认证回调之外，现有工作区路由均要求登录。 */
export function isWorkspacePath(pathname: string): boolean {
  return ["/today", "/inbox", "/completed", "/insight", "/profile", "/settings"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export const LOGIN_REQUIRED_URL = "/?login=1";
