import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createFocusClock } from "../src/features/focus/focus-clock.ts";
import {
  pendingFocusSessions,
  savePendingFocusSession,
  acknowledgeFocusSession,
} from "../src/features/focus/focus-journal.ts";
import { inspectWav } from "../src/lib/audio/inspect-wav.ts";
import { dateKeyWeekday, taskDateTime } from "../src/lib/date-utils.ts";
import { autoSendGuardKey } from "../src/features/auth/reset-password-guard.ts";
import { normalizeFocusPatch, canSetTodayFocus } from "../src/features/tasks/task-focus.ts";
import {
  isOrganizationCandidateCurrent,
  organizationPatch,
} from "../src/lib/data/task-organization.ts";
import { organizeDayTasks } from "../src/features/tasks/ai-organize-api.ts";
import type { Task } from "../src/types/task.ts";

const task: Task = {
  id: "task-1",
  title: "Read",
  description: "",
  list: "Study",
  tags: [],
  date: "2026-09-17",
  priority: 3,
  estimate: 1,
  reminder: "None",
  completed: false,
  created: 1,
  subtasks: [],
};

test("focus is restricted to today's unfinished tasks and moving it clears the flag", () => {
  assert.equal(canSetTodayFocus(task, task.date), true);
  for (const date of ["", "2026-09-18", "2026-09-16"])
    assert.equal(normalizeFocusPatch({ ...task, date }, { featured: true }, task.date), null);
  assert.equal(
    normalizeFocusPatch({ ...task, completed: true }, { featured: true }, task.date),
    null,
  );
  assert.deepEqual(
    normalizeFocusPatch({ ...task, featured: true }, { date: "2026-09-18" }, task.date),
    { date: "2026-09-18", featured: false },
  );
});

test("AI detects manual input changes, date moves, completion and deletion", () => {
  assert.equal(
    isOrganizationCandidateCurrent(task, { ...task, frozen: true, featured: true }),
    true,
  );
  for (const patch of [
    { title: "New" },
    { description: "Changed" },
    { date: "2026-09-18" },
    { list: "Work" },
    { tags: ["New"] },
    { time: "12:00" },
    { priority: 1 },
    { estimate: 2 },
    { completed: true },
  ])
    assert.equal(isOrganizationCandidateCurrent(task, { ...task, ...patch } as Task), false);
  assert.equal(isOrganizationCandidateCurrent(task, undefined), false);
  assert.equal(
    Object.hasOwn(
      organizationPatch(
        {
          id: task.id,
          list: "Work",
          tags: [],
          time: null,
          priority: 2,
          estimate: 1,
          reason: "",
        },
        task,
      ),
      "time",
    ),
    false,
  );
});

test("task reminders use Shanghai time even when the device timezone changes", () => {
  const previous = process.env.TZ;
  try {
    for (const timezone of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
      process.env.TZ = timezone;
      assert.equal(taskDateTime("2026-09-17", "09:00")?.toISOString(), "2026-09-17T01:00:00.000Z");
    }
    assert.equal(taskDateTime("2026-09-17", "25:00"), null);
    assert.equal(taskDateTime("", "09:00"), null);
    assert.equal(taskDateTime("2026-02-30", "09:00"), null);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("date-key weekdays stay stable when the process timezone changes", () => {
  const previous = process.env.TZ;
  const keys = [
    "2026-09-13",
    "2026-09-14",
    "2026-09-15",
    "2026-09-16",
    "2026-09-17",
    "2026-09-18",
    "2026-09-19",
  ];
  const weekdays = [0, 1, 2, 3, 4, 5, 6];
  try {
    for (const timezone of ["UTC", "America/Los_Angeles", "Pacific/Honolulu", "Asia/Shanghai"]) {
      process.env.TZ = timezone;
      assert.deepEqual(
        keys.map((key) => dateKeyWeekday(key)),
        weekdays,
      );
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
  const parseRoute = readFileSync(
    new URL("../src/app/api/voice/parse/route.ts", import.meta.url),
    "utf8",
  );
  assert.equal(parseRoute.includes("getDay()"), false);
  assert.ok(parseRoute.includes("dateKeyWeekday(today)"));
});

test("focus wall-clock handles background time and excludes paused time", () => {
  let now = 0;
  const clock = createFocusClock(60, () => now);
  now = 15_000;
  assert.equal(clock.sample(), 45);
  clock.pause();
  now = 300_000;
  assert.equal(clock.sample(), 45);
  clock.resume();
  now += 50_000;
  assert.equal(clock.sample(), 0);
});

test("focus journal survives reload, separates accounts and only acknowledges the matching checkpoint", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const input = {
    id: "session-1",
    taskId: task.id,
    startedAt: "2026-09-17T00:00:00Z",
    endedAt: "2026-09-17T00:01:00Z",
    durationSeconds: 30,
    completed: false,
  };
  savePendingFocusSession("owner", input, storage);
  const latest = { ...input, durationSeconds: 60, completed: true };
  savePendingFocusSession("owner", latest, storage);
  acknowledgeFocusSession("owner", input, storage);
  assert.deepEqual(pendingFocusSessions("owner", storage), [latest]);
  assert.deepEqual(pendingFocusSessions("other", storage), []);
  savePendingFocusSession("owner", input, storage);
  assert.deepEqual(pendingFocusSessions("owner", storage), [latest]);
  acknowledgeFocusSession("owner", latest, storage);
  assert.deepEqual(pendingFocusSessions("owner", storage), []);
  values.set("dida-focus-pending:owner", "broken");
  assert.deepEqual(pendingFocusSessions("owner", storage), []);
});

function wav() {
  const bytes = new Uint8Array(46);
  const view = new DataView(bytes.buffer);
  for (const [offset, label] of [
    [0, "RIFF"],
    [8, "WAVE"],
    [12, "fmt "],
    [36, "data"],
  ] as const)
    bytes.set(new TextEncoder().encode(label), offset);
  view.setUint32(4, 38, true);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(40, 2, true);
  return bytes;
}

test("WAV validates PCM and rejects every truncated prefix without throwing", () => {
  const bytes = wav();
  assert.deepEqual(inspectWav(bytes), { byteRate: 32000, dataBytes: 2 });
  for (let length = 0; length < bytes.length; length++)
    assert.equal(inspectWav(bytes.subarray(0, length)), null);
  const bad = wav();
  new DataView(bad.buffer).setUint32(16, 4, true);
  assert.equal(inspectWav(bad), null);
  const huge = wav();
  new DataView(huge.buffer).setUint32(40, 0xffffffff, true);
  assert.equal(inspectWav(huge), null);
});

test("transcription route returns 400 for a truncated format chunk without contacting ASR", async () => {
  const source = readFileSync(
    new URL("../src/app/api/voice/transcribe/route.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: { POST?: (request: Request) => Promise<Response> } = {};
  vm.runInNewContext(compiled, {
    exports,
    Request,
    Response,
    File,
    Uint8Array,
    process: { env: { DASHSCOPE_API_KEY: "isolated-test-key" } },
    require: (id: string) => {
      if (id.includes("voice-request-guard")) return { guardVoiceRequest: async () => null };
      if (id.includes("supabase/server"))
        return {
          createClient: async () => ({
            from: () => {
              const query = {
                select: () => query,
                order: () => query,
                limit: async () => ({ data: [], error: null }),
              };
              return query;
            },
          }),
        };
      if (id.includes("inspect-wav")) return { inspectWav };
      if (id === "node:https")
        return {
          request: () => {
            throw new Error("ASR must not be contacted");
          },
        };
      throw new Error(`unexpected import ${id}`);
    },
  });
  const bytes = wav();
  new DataView(bytes.buffer).setUint32(16, 4, true);
  const form = new FormData();
  form.set("audio", new File([bytes], "truncated.wav", { type: "audio/wav" }));
  const response = await exports.POST!(
    new Request("http://localhost:3000/api/voice/transcribe", { method: "POST", body: form }),
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "audio_invalid" });
});

test("focus completion saves at zero and page lifecycle creates checkpoints", () => {
  const source = readFileSync(
    new URL("../src/features/focus/focus-session.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /if \(seconds === 0 &&[^\n]+\) \{\s*recordSession\(\);\s*commit\(settleFocusRun/,
  );
  assert.ok(source.includes('window.addEventListener("pagehide", checkpoint)'));
  assert.ok(source.includes('document.addEventListener("visibilitychange", hidden)'));
});

test("AI organization batches 81 tasks into 40/40/1 and never returns a failed partial result", async () => {
  const original = globalThis.fetch;
  const batchSizes: number[] = [];
  let failLast = false;
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    batchSizes.push(body.tasks.length);
    if (failLast && body.tasks.length === 1) return new Response("{}", { status: 500 });
    return Response.json({
      suggestions: body.tasks.map((item: Task) => ({
        id: item.id,
        list: "Study",
        tags: [],
        time: null,
        priority: 3,
        estimate: 1,
        reason: "",
      })),
    });
  };
  const input = {
    date: task.date,
    locale: "zh-CN",
    pomodoroMinutes: 25,
    tasks: Array.from({ length: 81 }, (_, index) => ({ ...task, id: `task-${index}` })),
  };
  try {
    assert.equal((await organizeDayTasks(input)).length, 81);
    assert.deepEqual(batchSizes, [40, 40, 1]);
    failLast = true;
    await assert.rejects(organizeDayTasks(input), /organize_failed/);
    const controller = new AbortController();
    controller.abort();
    const count = batchSizes.length;
    await assert.rejects(organizeDayTasks(input, controller.signal), { name: "AbortError" });
    assert.equal(batchSizes.length, count);
  } finally {
    globalThis.fetch = original;
  }
});

test("profile service propagates failed statistics instead of displaying zero", async () => {
  const source = readFileSync(
    new URL("../src/features/profile/profile-service.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: { getProfile?: () => Promise<unknown> } = {};
  const profile = {
    maybeSingle: async () => ({ data: null, error: null }),
    eq() {
      return this;
    },
    select() {
      return this;
    },
  };
  vm.runInNewContext(compiled, {
    exports,
    require: (id: string) => {
      if (id === "server-only") return {};
      if (id.includes("workspace-session"))
        return {
          requireWorkspaceSession: async () => ({
            user: { id: "owner" },
            supabase: { from: () => profile },
          }),
        };
      if (id.includes("focus-stats"))
        return {
          loadFocusStats: async () => {
            throw new Error("stats offline");
          },
        };
      throw new Error(`unexpected import ${id}`);
    },
  });
  await assert.rejects(exports.getProfile!(), /stats offline/);
});

test("settings recovery URL cannot select the former direct-password form", () => {
  const settings = readFileSync(
    new URL("../src/features/settings/settings-page.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(settings.includes("PasswordForm"), false);
  assert.ok(settings.includes("<ResetPasswordPanel"));
  const reset = readFileSync(
    new URL("../src/features/auth/reset-password-panel.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(reset.includes('step !== "password" || verifiedEmailRef.current !== email.trim()'));
  assert.notEqual(autoSendGuardKey("user-a@example.com"), autoSendGuardKey("user-b@example.com"));
  assert.equal(autoSendGuardKey("User-A@example.com"), autoSendGuardKey("user-a@example.com"));
  assert.equal(reset.includes("window.localStorage.getItem(AUTO_SEND_GUARD_KEY)"), false);
});

test("transcription upstream failures log metadata without response bodies", () => {
  const transcribe = readFileSync(
    new URL("../src/app/api/voice/transcribe/route.ts", import.meta.url),
    "utf8",
  );
  assert.equal(transcribe.includes("${body.slice"), false);
  assert.match(transcribe, /upstream status=\$\{upstream\.status\}/);
  assert.match(transcribe, /code=\$\{upstreamCode\}/);
});

test("Inbox exposes undated unfinished tasks without changing the AI day boundary", () => {
  const source = readFileSync(
    new URL("../src/features/tasks/inbox-page.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(source.includes("!task.date && !task.completed"));
  assert.ok(source.includes('t("tasks.unscheduled")'));
  assert.ok(source.includes("task.date === selected"));
});
