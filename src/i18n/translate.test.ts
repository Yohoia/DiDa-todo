import { strict as assert } from "node:assert";
import { test } from "node:test";
import { messages } from "./messages";
import { createTranslator } from "./translate";
import { isLocale, isTheme } from "./config";

test("both locales have complete messages and matching interpolation parameters", () => {
  for (const [key, translations] of Object.entries(messages)) {
    const englishForms =
      typeof translations.en === "string" ? [translations.en] : Object.values(translations.en);
    assert.ok(translations["zh-CN"].trim(), `${key}: missing Chinese`);
    const parameters = (value: string) =>
      [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const form of englishForms) {
      assert.ok(form.trim(), `${key}: missing English`);
      assert.deepEqual(parameters(form), parameters(translations["zh-CN"]), key);
    }
  }
});
test("translated task actions preserve user-entered text including braces", () => {
  const title = "Read {notes} / 阅读记录 <draft>";
  assert.equal(createTranslator("en").t("tasks.open", { title }), `View task: ${title}`);
  assert.equal(createTranslator("zh-CN").t("tasks.open", { title }), `查看任务：${title}`);
});
test("dynamic counts and dates follow locale without changing business values", () => {
  assert.equal(createTranslator("en").t("tasks.inboxCount", { count: 3 }), "3 unorganized tasks");
  assert.equal(createTranslator("zh-CN").t("tasks.inboxCount", { count: 3 }), "3 项待整理任务");
  assert.equal(createTranslator("en").date("2026-09-09", { weekday: "long" }), "Wednesday");
  assert.equal(createTranslator("zh-CN").date("2026-09-09", { weekday: "long" }), "星期三");
  assert.equal(createTranslator("en").date("2026-09-09T17:00:00Z", { day: "numeric" }), "10");
  assert.equal(createTranslator("zh-CN").label("Work"), "工作");
  assert.equal(createTranslator("en").label("Custom list"), "Custom list");
});
test("unsupported persisted preferences are rejected", () => {
  for (const value of [undefined, null, "fr", "", "<script>"]) assert.equal(isLocale(value), false);
  for (const value of [undefined, null, "auto", "system", "", "<script>"])
    assert.equal(isTheme(value), false);
  assert.ok(isLocale("zh-CN") && isLocale("en"));
  assert.ok(isTheme("dark") && isTheme("light"));
});

test("English count messages use singular only for one", () => {
  const { t } = createTranslator("en");
  assert.equal(t("tasks.inboxCount", { count: 0 }), "0 unorganized tasks");
  assert.equal(t("tasks.inboxCount", { count: 1 }), "1 unorganized task");
  assert.equal(t("tasks.pomodoros", { count: 1 }), "1 Pomodoro");
  assert.equal(t("tasks.pomodoros", { count: 2 }), "2 Pomodoros");
});
