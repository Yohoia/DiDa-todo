import assert from "node:assert/strict";
import test from "node:test";

import { safeAuthRedirect } from "../src/lib/auth-redirect.ts";
import { meetsPasswordPolicy } from "../src/lib/password-policy.ts";

const origin = "https://todo.bytesize.asia";

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
