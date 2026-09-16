import assert from "node:assert/strict";
import test from "node:test";

import { safeAuthRedirect } from "../src/lib/auth-redirect.ts";
import { meetsPasswordPolicy } from "../src/lib/password-policy.ts";
import { isWorkspacePath, LOGIN_REQUIRED_URL } from "../src/lib/workspace-access.ts";

const origin = "https://todo.bytesize.asia";

test("all personal workspace routes require authentication, including nested routes", () => {
  for (const path of ["/today", "/inbox", "/completed", "/insight", "/profile", "/settings"]) {
    assert.equal(isWorkspacePath(path), true);
    assert.equal(isWorkspacePath(`${path}/`), true);
    assert.equal(isWorkspacePath(`${path}/nested`), true);
    assert.equal(isWorkspacePath(`${path}-public`), false);
  }
});

test("public home, auth callback and independently guarded APIs are not workspace pages", () => {
  for (const path of [
    "/",
    "/auth/callback",
    "/api/profile",
    "/api/tasks/organize",
    "/noschedule.png",
  ]) {
    assert.equal(isWorkspacePath(path), false);
  }
  assert.equal(LOGIN_REQUIRED_URL, "/?login=1");
});

// 可选本地集成测试：启动项目后设置 WORKSPACE_TEST_ORIGIN=http://localhost:3000。
// 不携带账户 cookie，所有接口请求均应在读写数据、调用付费 AI 之前被拒绝。
test(
  "anonymous HTTP and RSC requests cannot access personal pages or APIs",
  {
    skip: !process.env.WORKSPACE_TEST_ORIGIN,
  },
  async () => {
    const base = process.env.WORKSPACE_TEST_ORIGIN!;
    for (const path of [
      "/today",
      "/inbox",
      "/completed",
      "/insight",
      "/profile",
      "/settings",
      "/inbox/nested",
    ]) {
      for (const headers of [{}, { RSC: "1" }]) {
        const response = await fetch(new URL(path, base), { redirect: "manual", headers });
        assert.equal(response.status, 307, path);
        assert.equal(
          new URL(response.headers.get("location")!, base).href,
          new URL(LOGIN_REQUIRED_URL, base).href,
          path,
        );
      }
    }
    for (const path of [
      "/api/profile",
      "/api/tasks/organize",
      "/api/voice/parse",
      "/api/voice/transcribe",
    ]) {
      const response = await fetch(new URL(path, base), {
        method: path === "/api/profile" ? "GET" : "POST",
        headers: { Origin: new URL(base).origin, "Content-Type": "application/json" },
        ...(path === "/api/profile" ? {} : { body: "{}" }),
      });
      assert.equal(response.status, 401, path);
      assert.equal((await response.json()).error, "authentication_required", path);
    }
    const home = await fetch(new URL("/", base));
    assert.equal(home.status, 200);
    assert.equal((await home.text()).includes("直接预览工作台 →"), false);
  },
);

test("auth callback keeps safe same-origin paths", () => {
  assert.equal(safeAuthRedirect("/settings?recovery=1", origin), "/settings?recovery=1");
  assert.equal(safeAuthRedirect("/today#focus", origin), "/today#focus");
});

test("auth callback rejects cross-origin and backslash redirects", () => {
  for (const target of [
    null,
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "\\evil.example",
  ]) {
    assert.equal(safeAuthRedirect(target, origin), "/today");
  }
});

test("password policy is shared by registration and settings", () => {
  assert.equal(meetsPasswordPolicy("Strong1!"), true);
  assert.equal(meetsPasswordPolicy("no-uppercase1!"), false);
  assert.equal(meetsPasswordPolicy("NO-LOWERCASE1!"), false);
  assert.equal(meetsPasswordPolicy("NoNumber!"), false);
  assert.equal(meetsPasswordPolicy("NoSpecial1"), false);
  assert.equal(meetsPasswordPolicy("S1!a"), false);
});
