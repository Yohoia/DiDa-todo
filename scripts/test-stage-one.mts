import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import {
  isOrganizationEdited,
  organizationDraftError,
  parseOrganizationTags,
} from "../src/features/tasks/organization-editor.ts";
import { organizationPatch } from "../src/lib/data/task-organization.ts";
import {
  captureDraftError,
  capturedTask,
  parseQuickCapture,
} from "../src/features/tasks/task-capture.ts";
import type { Task } from "../src/types/task.ts";
import type { TaskOrganizationSuggestion } from "../src/types/task-organization.ts";
import { createWorkspaceSync } from "../src/features/tasks/workspace-sync.ts";
import { normalizeFocusPatch } from "../src/features/tasks/task-focus.ts";
import { isOrganizationCandidateCurrent } from "../src/lib/data/task-organization.ts";
import { createRepository, DEFAULT_PREFERENCES } from "../src/lib/data/repository.ts";

const task: Task = {
  id: "task-1",
  title: "Read",
  description: "",
  date: "2026-09-17",
  list: "Study",
  tags: ["Read"],
  priority: 3,
  estimate: 1,
  reminder: "None",
  completed: false,
  created: 1,
  subtasks: [],
};
const suggestion: TaskOrganizationSuggestion = {
  id: task.id,
  list: "Study",
  tags: ["Read"],
  time: "09:00",
  priority: 3,
  estimate: 1,
  reason: "",
};

test("organization manual draft can clear time, move back to Inbox and retain original AI values", () => {
  const draft = { ...suggestion, list: "Inbox" as const, time: null, timeEdited: true };
  assert.equal(organizationDraftError(draft), null);
  const patch = organizationPatch(draft, { ...task, time: "09:00" });
  assert.ok(Object.hasOwn(patch, "time"));
  assert.equal(patch.time, undefined);
  assert.equal(patch.schedule, undefined);
  assert.equal(patch.list, "Inbox");
  assert.equal(suggestion.time, "09:00");
  assert.equal(isOrganizationEdited(suggestion, draft), true);
  assert.equal(isOrganizationEdited(suggestion, { ...suggestion }), false);
});
test("organization draft validates estimates, times and tags consistently", () => {
  assert.deepEqual(parseOrganizationTags("#Read, 学习，Read"), ["Read", "学习"]);
  for (const estimate of [0, 17, 1.5, NaN])
    assert.equal(organizationDraftError({ ...suggestion, estimate }), "organize.invalidEstimate");
  assert.equal(organizationDraftError({ ...suggestion, time: "24:01" }), "organize.invalidTime");
  assert.equal(
    organizationDraftError({ ...suggestion, tags: ["a", "b", "c", "d"] }),
    "organize.invalidTags",
  );
});
test("Inbox keeps existing capture and AI date boundaries without redundant quick-add or filter UI", () => {
  const layout = readFileSync(
    new URL("../src/app/(workspace)/layout.tsx", import.meta.url),
    "utf8",
  );
  const inbox = readFileSync(
    new URL("../src/features/tasks/inbox-page.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(layout.includes("QuickAddTrigger"), false);
  assert.equal(inbox.includes("InboxFilters"), false);
  assert.equal(inbox.includes("filterTasks"), false);
  assert.ok(inbox.includes("task.date === selected"));
  assert.ok(inbox.includes("dayTasks.filter((task) => !task.completed)"));
  assert.ok(inbox.includes("<CaptureDialog"));
  assert.ok(inbox.includes("<AiOrganizeDialog"));
});

test("quick capture interprets only explicit dates and times in Chinese and English", () => {
  const preset = { list: "Inbox" as const };
  const chinese = parseQuickCapture("明天下午三点半开会", "2026-09-17", preset, "capture-1");
  assert.equal(chinese.title, "开会");
  assert.equal(chinese.date, "2026-09-18");
  assert.equal(chinese.time, "15:30");
  const english = parseQuickCapture(
    "meeting tomorrow at 3:30 pm",
    "2026-09-17",
    preset,
    "capture-2",
  );
  assert.equal(english.title, "meeting");
  assert.equal(english.date, "2026-09-18");
  assert.equal(english.time, "15:30");
  const empty = parseQuickCapture("买牛奶和鸡蛋", "2026-09-17", preset, "capture-3");
  assert.equal(empty.title, "买牛奶和鸡蛋");
  assert.equal(empty.date, "");
  assert.equal(empty.time, undefined);
  assert.equal(parseQuickCapture("updateTodayDocs", "2026-09-17", preset, "plain").date, "");
  assert.equal(parseQuickCapture("Look at", "2026-09-17", preset, "plain").title, "Look at");
  assert.equal(parseQuickCapture("后天复盘", "2026-12-31", preset, "capture-4").date, "2027-01-02");
  assert.equal(
    parseQuickCapture("买菜", "2026-09-17", { ...preset, date: "2026-09-19" }, "capture-5").date,
    "2026-09-19",
  );
});
test("capture validation keeps undated tasks and derives only real scheduled blocks", () => {
  const draft = { id: "capture-1", title: "Read", list: "Study" as const, date: "", time: "14:00" };
  assert.equal(captureDraftError(draft), null);
  assert.equal(capturedTask(draft, 45).schedule, undefined);
  assert.equal(captureDraftError({ ...draft, date: "2026-02-30" }), "capture.invalidDate");
  assert.equal(captureDraftError({ ...draft, title: "" }), "capture.invalidTitle");
  assert.equal(capturedTask({ ...draft, date: "2026-09-18" }, 45).schedule?.duration, 45);
});

test("actual workspace capture flow retains failed drafts, retries only failures and skips invalid entries", async () => {
  const cloud = new Map<string, Task>();
  const calls: string[] = [];
  let fail = true;
  const repository = {
    createTask: async (item: Task) => {
      calls.push(item.id);
      if (item.id === "retry" && fail) throw new Error("offline");
      if (!cloud.has(item.id)) cloud.set(item.id, item);
    },
    loadTasks: async () => [...cloud.values()],
    loadPreferences: async () => DEFAULT_PREFERENCES,
    listNotifications: async () => [],
    updateTask: async (id: string, patch: Partial<Task>) => {
      const previous = cloud.get(id);
      if (previous) cloud.set(id, { ...previous, ...patch });
    },
  };
  const state: unknown[] = [];
  const modules: Record<string, unknown> = {
    react: {
      createContext: () => ({ Provider: "provider" }),
      useState: (initial: unknown) => {
        const index = state.length;
        state.push(typeof initial === "function" ? initial() : initial);
        return [
          state[index],
          (next: unknown) => {
            state[index] = typeof next === "function" ? next(state[index]) : next;
          },
        ];
      },
      useRef: (current: unknown) => ({ current }),
      useCallback: (callback: unknown) => callback,
      useEffect: () => {},
    },
    "react/jsx-runtime": { jsx: (_type: unknown, props: unknown) => ({ props }) },
    "@/lib/utils": { createId: () => "unused" },
    "@/lib/data/repository": { createRepository: () => repository },
    "@/lib/supabase/client": { createClient: () => ({}) },
    "@/lib/workspace-access": { LOGIN_REQUIRED_URL: "/" },
    "./workspace-sync": { createWorkspaceSync },
    "./task-completion": {},
    "@/lib/date-utils": { getTodayKey: () => task.date },
    "./task-focus": { normalizeFocusPatch },
    "@/lib/data/task-organization": { isOrganizationCandidateCurrent, organizationPatch },
    "./organization-editor": { organizationDraftError },
    "./task-capture": { captureDraftError, capturedTask },
    "@/features/focus/focus-journal": {},
  };
  type Capture = { id: string; title: string; list: "Inbox"; date: string; time?: string };
  const exports: {
    WorkspaceProvider?: (props: unknown) => {
      props: {
        value: {
          updateTask: (id: string, patch: Partial<Task>) => void;
          saveCapturedTasks: (
            items: Capture[],
          ) => Promise<{ savedIds: string[]; failedIds: string[] }>;
        };
      };
    };
  } = {};
  const source = readFileSync(
    new URL("../src/features/tasks/workspace-provider.tsx", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    console: { error: () => {} },
    require: (id: string) => {
      assert.ok(Object.hasOwn(modules, id), `Unexpected import: ${id}`);
      return modules[id];
    },
  });
  const { saveCapturedTasks, updateTask } = exports.WorkspaceProvider!({
    children: null,
    user: { id: "owner", email: "owner@example.test", displayName: "Owner" },
    initialTasks: [],
    initialPreferences: DEFAULT_PREFERENCES,
    initialNotifications: [],
    recurrenceAvailable: true,
  }).props.value;
  const drafts: Capture[] = [
    { id: "saved", title: "Milk", list: "Inbox", date: "", time: "14:00" },
    { id: "retry", title: "Meeting", list: "Inbox", date: task.date },
    { id: "invalid", title: "", list: "Inbox", date: "" },
  ];
  const first = await saveCapturedTasks(drafts);
  assert.deepEqual([...first.savedIds], ["saved"]);
  assert.deepEqual([...first.failedIds], ["retry", "invalid"]);
  assert.deepEqual(calls, ["saved", "retry"]);
  assert.deepEqual(
    (state[0] as Task[]).map((item) => item.id),
    ["saved"],
  );
  fail = false;
  const second = await saveCapturedTasks(drafts.filter((item) => item.id === "retry"));
  assert.deepEqual([...second.savedIds], ["retry"]);
  assert.deepEqual([...second.failedIds], []);
  assert.equal(cloud.size, 2);
  assert.deepEqual(calls, ["saved", "retry", "retry"]);
  assert.equal(cloud.get("saved")?.date, "");
  updateTask("saved", { title: "Edited" });
  await new Promise(setImmediate);
  const local = () => (state[0] as Task[]).find((item) => item.id === "saved")!;
  assert.equal(local().time, "14:00");
  assert.equal(local().schedule, undefined);
  updateTask("saved", { date: "2026-09-18" });
  assert.equal(local().schedule?.hour, 14);
  assert.equal(local().schedule?.date, "2026-09-18");
  updateTask("saved", { date: "" });
  assert.equal(local().time, undefined);
  assert.equal(local().schedule, undefined);
});

test("repeat capability distinguishes old schema from real service failures", async () => {
  for (const code of [undefined, "42703", "PGRST204", "503"]) {
    const repository = createRepository(
      {
        from: () => ({
          select: () => ({
            limit: async () => ({ error: code ? { code, message: "test failure" } : null }),
          }),
        }),
      } as unknown as Parameters<typeof createRepository>[0],
      "owner",
    );
    if (code === "503") await assert.rejects(repository.supportsRepeatingTasks(), /test failure/);
    else assert.equal(await repository.supportsRepeatingTasks(), !code);
  }
});

test("actual PostgreSQL migrations create recurring tasks atomically under owner RLS", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now());
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
    const directory = new URL("../supabase/migrations/", import.meta.url);
    for (const filename of readdirSync(directory)
      .filter((name) => name.endsWith(".sql"))
      .sort())
      await db.exec(readFileSync(new URL(filename, directory), "utf8"));
    const owner = "11111111-1111-4111-8111-111111111111";
    const foreign = "22222222-2222-4222-8222-222222222222";
    await db.query(
      "insert into auth.users(id,email) values ($1,'one@example.test'),($2,'two@example.test')",
      [owner, foreign],
    );
    const original = (
      await db.query<{ id: string }>(
        `insert into tasks(user_id,title,list,date,time,duration_minutes,repeat_interval_days,tags,reminder,featured,frozen)
      values ($1,'Daily task','Study',(now() at time zone 'Asia/Shanghai')::date,'09:00',45,1,ARRAY['Read'],'5 min before',true,true) returning id`,
        [owner],
      )
    ).rows[0].id;
    const other = (
      await db.query<{ id: string }>(
        "insert into tasks(user_id,title,list) values ($1,'Foreign','Work') returning id",
        [foreign],
      )
    ).rows[0].id;
    await db.query(
      "insert into subtasks(task_id,user_id,title,completed,position) values ($1,$2,'Read chapter',true,0)",
      [original, owner],
    );
    await db.exec(
      "grant usage on schema public,auth to authenticated; grant all on all tables in schema public to authenticated; set role authenticated;",
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
    await t.test(
      "completion creates one clean child with inherited content and reset subtasks",
      async () => {
        await db.query("update tasks set completed=true,completed_at=now() where id=$1", [
          original,
        ]);
        const rows = (
          await db.query<{
            id: string;
            days: number;
            completed: boolean;
            featured: boolean;
            frozen: boolean;
            reminder: string;
            time: string;
          }>(
            "select *,date-(now() at time zone 'Asia/Shanghai')::date as days from tasks where repeat_parent_id=$1",
            [original],
          )
        ).rows;
        assert.equal(rows.length, 1);
        assert.equal(rows[0].days, 1);
        assert.equal(rows[0].completed, false);
        assert.equal(rows[0].featured, false);
        assert.equal(rows[0].frozen, false);
        assert.equal(rows[0].reminder, "5 min before");
        assert.equal(rows[0].time, "09:00:00");
        assert.deepEqual(
          (
            await db.query("select title,completed,position from subtasks where task_id=$1", [
              rows[0].id,
            ])
          ).rows,
          [{ title: "Read chapter", completed: false, position: 0 }],
        );
        await db.query("update tasks set completed=false where id=$1", [original]);
        await db.query("update tasks set completed=true where id=$1", [original]);
        assert.equal(
          (await db.query("select id from tasks where repeat_parent_id=$1", [original])).rows
            .length,
          1,
        );
      },
    );
    await t.test(
      "weekly overdue and undated rules skip past dates without duplicating history",
      async () => {
        for (const days of [7, 3]) {
          const id = (
            await db.query<{ id: string }>(
              "insert into tasks(user_id,title,list,date,repeat_interval_days) values ($1,'Overdue','Work',(now() at time zone 'Asia/Shanghai')::date-15,$2) returning id",
              [owner, days],
            )
          ).rows[0].id;
          await db.query("update tasks set completed=true where id=$1", [id]);
          const child = (
            await db.query<{ delta: number }>(
              "select date-(now() at time zone 'Asia/Shanghai')::date as delta from tasks where repeat_parent_id=$1",
              [id],
            )
          ).rows[0];
          assert.ok(child.delta > 0 && child.delta <= days);
        }
        const id = (
          await db.query<{ id: string }>(
            "insert into tasks(user_id,title,list,repeat_interval_days) values ($1,'Anytime','Life',2) returning id",
            [owner],
          )
        ).rows[0].id;
        await db.query("update tasks set completed=true where id=$1", [id]);
        assert.equal(
          (
            await db.query<{ delta: number }>(
              "select date-(now() at time zone 'Asia/Shanghai')::date as delta from tasks where repeat_parent_id=$1",
              [id],
            )
          ).rows[0].delta,
          2,
        );
      },
    );
    await t.test("RLS blocks foreign writes and recurrence parent references", async () => {
      assert.equal(
        (await db.query("update tasks set completed=true where id=$1 returning id", [other])).rows
          .length,
        0,
      );
      await assert.rejects(
        db.query(
          "insert into tasks(user_id,title,list,repeat_parent_id) values ($1,'Unsafe','Life',$2)",
          [owner, other],
        ),
        /repeat_parent_id must belong/,
      );
      await assert.rejects(
        db.query("update tasks set repeat_interval_days=0 where id=$1", [original]),
        /tasks_repeat_interval_valid/,
      );
    });
  } finally {
    await db.close();
  }
});
