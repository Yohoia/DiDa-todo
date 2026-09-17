import assert from "node:assert/strict";
import test from "node:test";
import { createRepository } from "../src/lib/data/repository.ts";
import { taskCompletionPatch } from "../src/features/tasks/task-completion.ts";
import { organizationPatch } from "../src/lib/data/task-organization.ts";

type Row = Record<string, unknown>;
type Result = {
  data: Row[];
  error: { message: string; code?: string } | null;
  count?: number | null;
};

type RpcCall = {
  fn: string;
  args: Record<string, unknown>;
  options: { count?: string } | undefined;
};

/** 内存数据库替身：验证真实仓库发出的筛选和更新，而不是重复实现业务逻辑。 */
function database(
  tables: Record<string, Row[]>,
  failUpdates = false,
  failReads = false,
  beforeUpdate?: () => void,
  failSubtaskWrites = false,
  rpc?: { rows: Row[]; count?: number },
  missingFocusTaskIds: string[] = [],
) {
  let taskVersion = 0;
  const rpcCalls: RpcCall[] = [];
  const readRanges: { table: string; from: number; to: number }[] = [];
  const missingTaskIds = new Set(missingFocusTaskIds);
  return {
    rpcCalls: () => rpcCalls,
    readRanges: () => readRanges,
    rpc(fn: string, args: Record<string, unknown>, options?: { count?: string }) {
      rpcCalls.push({ fn, args, options });
      return Promise.resolve({
        data: rpc?.rows ?? [],
        error: null,
        count: rpc?.count ?? (rpc?.rows ?? []).length,
      });
    },
    from(table: string) {
      let patch: Row | undefined;
      let inserted: Row | undefined;
      let upserts: Row[] | undefined;
      let deleting = false;
      const ordering: { key: string; ascending: boolean }[] = [];
      let countOption: string | undefined;
      let start = 0;
      let end = Infinity;
      const filters: ((row: Row) => boolean)[] = [];
      const query = {
        select(_columns?: string, options?: { count?: string }) {
          countOption = options?.count;
          return query;
        },
        order(key: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
          ordering.push({ key, ascending: options?.ascending !== false });
          return query;
        },
        upsert(values: Row | Row[]) {
          upserts = Array.isArray(values) ? values : [values];
          return query;
        },
        delete() {
          deleting = true;
          return query;
        },
        not(key: string, _operator: string, value: string) {
          const values = value.slice(1, -1).split(",");
          filters.push((row) => !values.includes(String(row[key])));
          return query;
        },
        update(value: Row) {
          patch = value;
          return query;
        },
        insert(value: Row) {
          inserted = value;
          return query;
        },
        eq(key: string, value: unknown) {
          filters.push((row) => row[key] === value);
          return query;
        },
        lte(key: string, value: number) {
          filters.push((row) => Number(row[key]) <= value);
          return query;
        },
        lt(key: string, value: string | number) {
          filters.push((row) =>
            typeof value === "number"
              ? Number(row[key]) < value
              : row[key] !== null && String(row[key]) < value,
          );
          return query;
        },
        is(key: string, value: unknown) {
          filters.push((row) => row[key] === value);
          return query;
        },
        gte(key: string, value: unknown) {
          filters.push((row) => row[key] !== null && String(row[key]) >= String(value));
          return query;
        },
        async maybeSingle() {
          const result = await query;
          return { ...result, data: result.data[0] ?? null };
        },
        in(key: string, values: string[]) {
          filters.push((row) => values.includes(String(row[key])));
          return query;
        },
        range(from: number, to: number) {
          start = from;
          end = to;
          readRanges.push({ table, from, to });
          return query;
        },
        then(resolve: (result: Result) => unknown) {
          const focusTaskId = String(
            (inserted ?? (patch && Object.hasOwn(patch, "task_id") ? patch : undefined))?.task_id ??
              "",
          );
          if (table === "focus_sessions" && missingTaskIds.has(focusTaskId)) {
            return Promise.resolve({
              data: [],
              error: { message: "task_id must belong to user_id", code: "23503" },
            }).then(resolve);
          }
          if (table === "subtasks" && failSubtaskWrites && (upserts || deleting))
            return Promise.resolve({ data: [], error: { message: "subtask offline" } }).then(
              resolve,
            );
          if (upserts)
            for (const value of upserts) {
              const existing = (tables[table] ?? []).find((row) =>
                value.id ? row.id === value.id : row.user_id === value.user_id,
              );
              if (existing) Object.assign(existing, value);
              else (tables[table] ??= []).push(value);
            }
          if (inserted) {
            const value = inserted;
            const existing = (tables[table] ?? []).some((row) =>
              table === "focus_sessions" || table === "tasks"
                ? row.id === value.id
                : row.user_id === value.user_id && row.task_id === value.task_id,
            );
            if (existing)
              return Promise.resolve({
                data: [],
                error: { message: "duplicate notification", code: "23505" },
              }).then(resolve);
            (tables[table] ??= []).push(value);
          }
          if (patch) beforeUpdate?.();
          const rows = (tables[table] ?? []).filter((row) =>
            filters.every((filter) => filter(row)),
          );
          rows.sort((a, b) => {
            for (const { key, ascending } of ordering) {
              const delta =
                typeof a[key] === "number" && typeof b[key] === "number"
                  ? Number(a[key]) - Number(b[key])
                  : String(a[key]).localeCompare(String(b[key]));
              if (delta) return ascending ? delta : -delta;
            }
            return 0;
          });
          if (deleting) tables[table] = (tables[table] ?? []).filter((row) => !rows.includes(row));
          if (patch && failUpdates)
            return Promise.resolve({ data: [], error: { message: "offline" } }).then(resolve);
          if (!patch && !inserted && failReads)
            return Promise.resolve({ data: [], error: { message: "read offline" } }).then(resolve);
          if (patch)
            rows.forEach((row) => {
              Object.assign(row, patch);
              // Mirror the tasks_set_updated_at trigger for compare-and-set tests.
              if (table === "tasks") row.updated_at = `version-${++taskVersion}`;
            });
          return Promise.resolve({
            data: rows.slice(start, end + 1),
            error: null,
            ...(countOption === "exact" ? { count: rows.length } : {}),
          }).then(resolve);
        },
      };
      return query;
    },
  } as unknown as Parameters<typeof createRepository>[0];
}

function taskRow(): Row {
  return {
    id: "task-1",
    user_id: "owner",
    updated_at: "2026-09-16T00:00:00Z",
    title: "Read",
    description: "",
    list: "Study",
    tags: [],
    date: "2026-09-16",
    time: "09:00:00",
    duration_minutes: 50,
    priority: 3,
    estimate: 2,
    reminder: "5 min before",
    completed: false,
    created_at: "2026-09-16T00:00:00Z",
  };
}

test("clearing task time persists NULL and stays anytime after reload", async () => {
  const row = taskRow();
  const repository = createRepository(database({ tasks: [row] }), "owner");
  await repository.updateTask("task-1", { time: undefined });
  assert.equal(row.time, null);
  assert.equal(row.duration_minutes, null);
  const [task] = await repository.loadTasks();
  assert.equal(task.date, "2026-09-16");
  assert.equal(task.time, undefined);
  assert.equal(task.schedule, undefined);
});

test("omitting time preserves it; setting and clearing date/schedule persist correctly", async () => {
  const row = taskRow();
  const repository = createRepository(database({ tasks: [row] }), "owner");
  await repository.updateTask("task-1", { title: "New title" });
  assert.equal(row.time, "09:00:00");
  assert.equal(row.duration_minutes, 50);
  await repository.updateTask("task-1", { time: "14:30" });
  assert.equal((await repository.loadTasks())[0].time, "14:30");
  await repository.updateTask("task-1", { schedule: undefined });
  assert.equal(row.duration_minutes, null);
  await repository.updateTask("task-1", { date: "" });
  assert.equal(row.date, null);
  assert.equal(row.time, null);
  assert.equal((await repository.loadTasks())[0].schedule, undefined);
});

test("versioned task updates reject stale versions and return fresh versions", async () => {
  const row = taskRow();
  const repository = createRepository(database({ tasks: [row] }), "owner");
  const [snapshot] = await repository.loadTasks();
  const stale = { ...snapshot };
  const first = await repository.updateTaskVersioned(snapshot.id, snapshot.updatedAt, {
    title: "First edit",
  });
  assert.ok(first?.updatedAt);
  assert.equal(first?.updatedAt, row.updated_at);
  assert.equal(
    await repository.updateTaskVersioned(stale.id, stale.updatedAt, { title: "Losing edit" }),
    null,
  );
  assert.equal(row.title, "First edit");
  const [reloaded] = await repository.loadTasks();
  const second = await repository.updateTaskVersioned(reloaded.id, reloaded.updatedAt, {
    title: "Second edit",
  });
  assert.ok(second?.updatedAt);
  assert.notEqual(second?.updatedAt, first?.updatedAt);
  assert.equal(row.title, "Second edit");
  // A locally created task has no version yet; its first write adopts the row version.
  const local = { ...taskRow(), id: "local", updated_at: undefined };
  const localRepository = createRepository(database({ tasks: [local] }), "owner");
  const [localSnapshot] = await localRepository.loadTasks();
  const adopted = await localRepository.updateTaskVersioned(localSnapshot.id, undefined, {
    title: "Adopted",
  });
  assert.ok(adopted?.updatedAt);
  assert.equal(local.title, "Adopted");
});

test("versioned subtask-only writes reuse the detail writer without bumping the task version", async () => {
  const row = taskRow();
  const tables = { tasks: [row], subtasks: [] };
  const repository = createRepository(database(tables), "owner");
  const [snapshot] = await repository.loadTasks();
  const result = await repository.updateTaskVersioned(snapshot.id, snapshot.updatedAt, {
    subtasks: [{ id: "sub-1", title: "New", completed: false }],
  });
  assert.deepEqual(result, { updatedAt: snapshot.updatedAt });
  assert.equal(row.updated_at, snapshot.updatedAt);
  assert.equal(tables.subtasks.length, 1);
});

test("single-task reload reads only the owner task and its ordered subtasks", async () => {
  const row = taskRow();
  const foreign = { ...taskRow(), id: "foreign", user_id: "someone-else" };
  const tables = {
    tasks: [row, foreign],
    subtasks: [
      {
        id: "sub-2",
        task_id: "task-1",
        user_id: "owner",
        title: "Second",
        completed: false,
        position: 1,
      },
      {
        id: "sub-1",
        task_id: "task-1",
        user_id: "owner",
        title: "First",
        completed: false,
        position: 0,
      },
      {
        id: "foreign-sub",
        task_id: "foreign",
        user_id: "someone-else",
        title: "No",
        completed: false,
        position: 0,
      },
    ],
  };
  const repository = createRepository(database(tables), "owner");
  const task = await repository.loadTask("task-1");
  assert.deepEqual(
    task?.subtasks.map((subtask) => subtask.title),
    ["First", "Second"],
  );
  assert.equal(await repository.loadTask("missing"), null);
});

test("task mutations are owner-scoped in the repository layer", async () => {
  const owned = taskRow();
  const foreign = { ...taskRow(), id: "foreign", user_id: "someone-else" };
  const tables = { tasks: [owned, foreign] };
  const repository = createRepository(database(tables), "owner");

  await repository.updateTask("foreign", { title: "Escalated" });
  await repository.deleteTask("foreign");
  const loaded = await repository.loadTasks();

  assert.deepEqual(
    loaded.map((task) => task.id),
    ["task-1"],
  );
  assert.equal(foreign.title, "Read");
  assert.equal(
    tables.tasks.some((task) => task.id === "foreign"),
    true,
  );
});

test("workspace preload reads active tasks, today's completions and only owned children", async () => {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Shanghai",
  });
  const active = taskRow();
  const completedToday = {
    ...taskRow(),
    id: "today",
    completed: true,
    completed_at: `${today}T10:00:00+08:00`,
  };
  const completedEarlier = {
    ...taskRow(),
    id: "archive",
    completed: true,
    completed_at: `${yesterday}T10:00:00+08:00`,
  };
  const foreign = {
    ...taskRow(),
    id: "foreign",
    user_id: "someone-else",
  };
  const tables = {
    tasks: [active, completedToday, completedEarlier, foreign],
    subtasks: [
      {
        id: "owned",
        task_id: "today",
        user_id: "owner",
        title: "Owned",
        completed: false,
        position: 0,
      },
      {
        id: "foreign-child",
        task_id: "foreign",
        user_id: "someone-else",
        title: "Foreign child",
        completed: false,
        position: 0,
      },
    ],
  };
  const repository = createRepository(database(tables), "owner");
  const loaded = await repository.loadWorkspaceTasks();
  assert.deepEqual(
    loaded.map((task) => task.id),
    ["task-1", "today"],
  );
  assert.deepEqual(loaded[1].subtasks, [{ id: "owned", title: "Owned", completed: false }]);
});

test("completed history uses exact counts and server-side range pagination", async () => {
  const rows = Array.from({ length: 35 }, (_, index) => ({
    ...taskRow(),
    id: `search-${String(index).padStart(2, "0")}`,
    completed: true,
    completed_at: "2026-09-16T12:00:00Z",
  }));
  const client = database({ tasks: rows, subtasks: [] });
  const repository = createRepository(client, "owner");
  const firstPage = await repository.loadCompletedTasks(0, 30);
  const secondPage = await repository.loadCompletedTasks(30, 30);
  assert.equal(firstPage.total, 35);
  assert.equal(firstPage.tasks.length, 30);
  assert.equal(firstPage.hasMore, true);
  assert.equal(secondPage.total, 35);
  assert.deepEqual(
    secondPage.tasks.map((task) => task.id),
    ["search-30", "search-31", "search-32", "search-33", "search-34"],
  );
  assert.equal(secondPage.hasMore, false);
  assert.deepEqual(
    client.readRanges().filter((range) => range.table === "tasks"),
    [
      { table: "tasks", from: 0, to: 29 },
      { table: "tasks", from: 30, to: 59 },
    ],
  );
});

test("date-specific history reads every server page with stable ordering", async () => {
  const rows = Array.from({ length: 505 }, (_, index) => ({
    ...taskRow(),
    id: `date-${String(index).padStart(3, "0")}`,
  }));
  const client = database({ tasks: rows, subtasks: [] });
  const repository = createRepository(client, "owner");
  const loaded = await repository.loadTasksByDate("2026-09-16");
  assert.equal(loaded.length, 505);
  assert.deepEqual(
    client.readRanges().filter((range) => range.table === "tasks"),
    [
      { table: "tasks", from: 0, to: 499 },
      { table: "tasks", from: 500, to: 999 },
    ],
  );
});

test("task search sends matching RPC names with bounded pagination and exact count", async () => {
  const rows = [
    { ...taskRow(), id: "search-1", title: "Keyword title" },
    { ...taskRow(), id: "search-2", description: "Keyword description" },
  ];
  const client = database({ tasks: rows, subtasks: [] }, false, false, undefined, false, {
    rows: rows.map((row, index) => ({ task: row, total_count: index === 0 ? 3 : null })),
    count: 3,
  });
  const repository = createRepository(client, "owner");
  const page = await repository.searchTasks("  keyword  ", 0, 500);
  assert.deepEqual(client.rpcCalls(), [
    {
      fn: "search_tasks",
      args: { p_query: "keyword", p_limit: 50, p_offset: 0 },
      options: { count: "exact" },
    },
  ]);
  assert.deepEqual(
    page.tasks.map((task) => task.id),
    ["search-1", "search-2"],
  );
  assert.equal(page.total, 3);
  assert.equal(page.hasMore, true);
  await repository.searchTasks("   ");
  assert.equal(client.rpcCalls().length, 1);
});

function notification(id: string, userId = "owner"): Row {
  return {
    id,
    user_id: userId,
    task_id: `task-${id}`,
    dedupe_key: `task-${id}`,
    type: "task_due",
    title: "Reminder",
    read: false,
    remind_at: "2026-09-16T01:00:00Z",
    created_at: "2026-09-16T01:00:00Z",
    dismissed_at: null,
  };
}

test("clearing keeps deduplication records after reload and only affects the selected owner's rows", async () => {
  const rows = [notification("1"), notification("2"), notification("other", "someone-else")];
  const repository = createRepository(database({ notifications: rows }), "owner");
  await repository.dismissTaskNotifications(["task-1", "task-other"]);
  const reloaded = await repository.listNotifications();
  assert.equal(reloaded.length, 2);
  assert.ok(reloaded.find((item) => item.id === "1")?.dismissedAt);
  assert.equal(reloaded.find((item) => item.id === "1")?.read, true);
  assert.deepEqual(
    reloaded.filter((item) => !item.dismissedAt).map((item) => item.id),
    ["2"],
  );
  assert.ok(reloaded.some((item) => item.taskId === "task-1"));
  assert.equal(rows[2].dismissed_at, null);
  assert.equal(rows.length, 3);
});

test("notification pagination preserves older and hidden reminder deduplication records", async () => {
  const rows = Array.from({ length: 505 }, (_, index) => notification(String(index)));
  rows[504].dismissed_at = "2026-09-16T02:00:00Z";
  const repository = createRepository(database({ notifications: rows }), "owner");
  const loaded = await repository.listNotifications();
  assert.equal(loaded.length, 505);
  assert.ok(loaded.find((item) => item.taskId === rows[504].task_id)?.dismissedAt);
  await repository.dismissTaskNotifications(loaded.map((item) => item.taskId));
  assert.equal(
    (await repository.listNotifications()).filter((item) => !item.dismissedAt).length,
    0,
  );
});

test("marking notifications read keeps them visible and never changes another user's rows", async () => {
  const rows = [notification("1"), notification("2"), notification("other", "someone-else")];
  const repository = createRepository(database({ notifications: rows }), "owner");
  await repository.markNotificationRead("other");
  assert.equal(rows[2].read, false);
  await repository.markAllNotificationsRead();
  const loaded = await repository.listNotifications();
  assert.equal(loaded.filter((item) => !item.dismissedAt).length, 2);
  assert.ok(loaded.every((item) => item.read));
  assert.equal(rows[2].read, false);
});

test("failed notification clearing throws so the provider can restore persisted notifications", async () => {
  const rows = [notification("1")];
  const repository = createRepository(database({ notifications: rows }, true), "owner");
  await assert.rejects(repository.dismissTaskNotifications(["task-1"]), /offline/);
  assert.equal((await repository.listNotifications())[0].dismissedAt, undefined);
});

test("restoring a completed One Thing preserves the current One Thing and survives reload", async () => {
  const rows = [
    { ...taskRow(), completed: true, completed_at: "2026-09-16T12:00:00Z", featured: true },
    { ...taskRow(), id: "task-2", featured: true },
  ];
  const repository = createRepository(database({ tasks: rows }), "owner");
  const [oldFocus] = await repository.loadTasks();
  await repository.updateTask(oldFocus.id, taskCompletionPatch(oldFocus));
  const loaded = await repository.loadTasks();
  assert.equal(loaded[0].completed, false);
  assert.equal(loaded[0].completedAt, undefined);
  assert.equal(loaded[0].featured, false);
  assert.deepEqual(
    loaded.filter((task) => task.featured && !task.completed).map((task) => task.id),
    ["task-2"],
  );
  await repository.updateTask(loaded[1].id, taskCompletionPatch(loaded[1]));
  assert.equal((await repository.loadTasks())[1].completed, true);
});

test("a losing notification insert can still mark and clear the real row before reload", async () => {
  const rows = [notification("real"), notification("foreign", "someone-else")];
  const repository = createRepository(database({ notifications: rows }), "owner");
  const local = {
    id: "temporary-id-from-second-tab",
    type: "task_due" as const,
    taskId: "task-real",
    title: "Reminder",
    remindAt: "2026-09-16T01:00:00Z",
    read: false,
    createdAt: "2026-09-16T01:00:00Z",
  };
  await repository.createTaskDueNotification(local);
  assert.equal(rows.length, 2);
  await repository.markNotificationRead("real");
  assert.equal(rows[0].read, true);
  await repository.dismissTaskNotifications([local.taskId]);
  assert.equal(
    (await repository.listNotifications()).filter((item) => !item.dismissedAt).length,
    0,
  );
  assert.equal(rows[1].read, false);
  assert.equal(rows[1].dismissed_at, null);
});

test("failed task and notification reads reject instead of returning an empty workspace", async () => {
  const repository = createRepository(database({}, false, true), "owner");
  await assert.rejects(repository.loadTasks(), /read offline/);
  await assert.rejects(repository.listNotifications(), /read offline/);
});

test("capture retries use the same ID without duplicates, overwrites or foreign access", async () => {
  const row = taskRow();
  const tables = { tasks: [row] };
  const repository = createRepository(database(tables), "owner");
  const [original] = await repository.loadTasks();
  await repository.createTask({ ...original, title: "Should not overwrite" });
  assert.equal(row.title, original.title);
  await repository.createTask({ ...original, id: "task-2", title: "Second" });
  await repository.createTask({ ...original, id: "task-2", title: "Second retry" });
  assert.equal(tables.tasks.length, 2);
  assert.equal(tables.tasks[1].title, "Second");
  row.user_id = "foreign";
  await assert.rejects(repository.createTask(original), /duplicate/);
});

test("AI organization persists only unchanged, unfinished tasks owned by the user", async () => {
  const row = taskRow();
  const repository = createRepository(database({ tasks: [row] }), "owner");
  const [snapshot] = await repository.loadTasks();
  row.title = "Edited elsewhere";
  assert.equal(await repository.applyTaskOrganization(snapshot, { priority: 1 }), null);
  assert.equal(row.priority, 3);
  row.title = snapshot.title;
  row.completed = true;
  assert.equal(await repository.applyTaskOrganization(snapshot, { priority: 1 }), null);
  row.completed = false;
  row.user_id = "someone-else";
  assert.equal(await repository.applyTaskOrganization(snapshot, { priority: 1 }), null);
  row.user_id = "owner";
  const applied = await repository.applyTaskOrganization(snapshot, {
    priority: 1,
    tags: ["Read"],
  });
  assert.ok(applied?.updatedAt);
  assert.equal((await repository.loadTasks())[0].priority, 1);
});

test("AI human content edits persist with metadata and keep original dates after reload", async () => {
  const row = { ...taskRow(), description: "Old description" };
  const repository = createRepository(database({ tasks: [row] }), "owner");
  const [snapshot] = await repository.loadTasks();
  const patch = organizationPatch(
    {
      id: snapshot.id,
      list: "Work",
      tags: ["Edited"],
      time: snapshot.time ?? null,
      priority: 1,
      estimate: 3,
      reason: "",
      title: "Revised task",
      description: "",
    },
    snapshot,
  );
  assert.ok((await repository.applyTaskOrganization(snapshot, patch))?.updatedAt);
  const [reloaded] = await repository.loadTasks();
  assert.equal(reloaded.title, "Revised task");
  assert.equal(reloaded.description, "");
  assert.equal(reloaded.date, snapshot.date);
  assert.equal(reloaded.time, snapshot.time);
  assert.equal(reloaded.priority, 1);
  assert.equal(reloaded.list, "Work");
  assert.deepEqual(reloaded.tags, ["Edited"]);
  assert.equal(reloaded.schedule?.label, "Revised task");
  assert.equal(await repository.applyTaskOrganization(snapshot, { title: "Stale edit" }), null);
  assert.equal(row.title, "Revised task");
});

test("AI compare-and-set rejects a task edited between the read and write", async () => {
  const row = taskRow();
  const repository = createRepository(
    database({ tasks: [row] }, false, false, () => {
      row.updated_at = "2026-09-16T01:00:00Z";
      row.date = "2026-09-17";
    }),
    "owner",
  );
  const [snapshot] = await repository.loadTasks();
  assert.equal(await repository.applyTaskOrganization(snapshot, { priority: 1 }), null);
  assert.equal(row.priority, 3);
  assert.equal(row.date, "2026-09-17");
});

test("full AI details save reminders, recurrence, lock and ordered subtasks using the existing detail writer", async () => {
  const row = taskRow();
  const tables = {
    tasks: [row],
    subtasks: [
      { id: "old", task_id: row.id, user_id: "owner", title: "Old", completed: false, position: 0 },
      {
        id: "keep",
        task_id: row.id,
        user_id: "owner",
        title: "Keep",
        completed: false,
        position: 1,
      },
      {
        id: "other",
        task_id: "other-task",
        user_id: "other-owner",
        title: "Foreign",
        completed: false,
        position: 0,
      },
    ],
  };
  const repository = createRepository(database(tables), "owner");
  const [snapshot] = await repository.loadTasks();
  const subtasks = [
    { id: "keep", title: "Keep edited", completed: true },
    { id: "new", title: "New", completed: false },
  ];
  const patch = organizationPatch(
    {
      id: snapshot.id,
      list: "Study",
      tags: [],
      time: snapshot.time ?? null,
      priority: 3,
      estimate: 2,
      reason: "",
      reminder: "20 min before",
      repeatIntervalDays: 7,
      frozen: true,
      subtasks,
    },
    snapshot,
  );
  assert.ok((await repository.applyTaskOrganization(snapshot, patch))?.updatedAt);
  const [reloaded] = await repository.loadTasks();
  assert.equal(reloaded.reminder, "20 min before");
  assert.equal(reloaded.repeatIntervalDays, 7);
  assert.equal(reloaded.frozen, true);
  assert.deepEqual(reloaded.subtasks, subtasks);
  assert.equal(
    tables.subtasks.some((item) => item.id === "old"),
    false,
  );
  assert.equal(tables.subtasks.find((item) => item.id === "other")?.title, "Foreign");
  const cleared = organizationPatch(
    {
      id: reloaded.id,
      list: "Study",
      tags: [],
      time: reloaded.time ?? null,
      priority: 3,
      estimate: 2,
      reason: "",
      repeatIntervalDays: undefined,
      subtasks: [],
    },
    reloaded,
  );
  assert.ok((await repository.applyTaskOrganization(reloaded, cleared))?.updatedAt);
  const [empty] = await repository.loadTasks();
  assert.equal(empty.repeatIntervalDays, undefined);
  assert.deepEqual(empty.subtasks, []);
  assert.equal(tables.subtasks.length, 1);
});

test("full AI details skip changed child snapshots and propagate subtask write failures", async () => {
  const row = taskRow();
  const child = {
    id: "child",
    task_id: row.id,
    user_id: "owner",
    title: "Original",
    completed: false,
    position: 0,
  };
  const tables = { tasks: [row], subtasks: [child] };
  const repository = createRepository(database(tables), "owner");
  const [snapshot] = await repository.loadTasks();
  child.title = "Changed elsewhere";
  assert.equal(await repository.applyTaskOrganization(snapshot, { subtasks: [] }), null);
  assert.equal(child.title, "Changed elsewhere");
  child.title = "Original";
  const failing = createRepository(database(tables, false, false, undefined, true), "owner");
  await assert.rejects(
    failing.applyTaskOrganization(snapshot, { subtasks: [] }),
    /subtask offline/,
  );
  assert.equal(tables.subtasks.length, 1);
});

test("AI extracted time and its derived schedule stay consistent after reload", async () => {
  const row = { ...taskRow(), time: null, duration_minutes: null };
  const repository = createRepository(database({ tasks: [row] }), "owner");
  const [snapshot] = await repository.loadTasks();
  const patch = organizationPatch(
    {
      id: snapshot.id,
      list: "Study",
      tags: ["Read"],
      time: "14:30",
      priority: 2,
      estimate: 2,
      reason: "",
    },
    snapshot,
    45,
  );
  assert.ok((await repository.applyTaskOrganization(snapshot, patch))?.updatedAt);
  const [reloaded] = await repository.loadTasks();
  assert.equal(reloaded.time, "14:30");
  assert.deepEqual(reloaded.schedule, patch.schedule);
  assert.equal(reloaded.schedule?.duration, 90);
});

test("focus checkpoints replay with one ID without duplicate or shrinking records", async () => {
  const rows: Row[] = [];
  const repository = createRepository(database({ focus_sessions: rows }), "owner");
  const input = {
    id: "session-1",
    taskId: "task-1",
    startedAt: "2026-09-16T00:00:00Z",
    endedAt: "2026-09-16T00:01:40Z",
    durationSeconds: 20,
    completed: false,
  };
  await repository.recordFocusSession(input);
  await repository.recordFocusSession({ ...input, durationSeconds: 100, completed: true });
  await repository.recordFocusSession({ ...input, durationSeconds: 40 });
  await repository.recordFocusSession({ ...input, durationSeconds: 100 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].duration_seconds, 100);
  assert.equal(rows[0].completed, true);
  await repository.recordFocusSession({ ...input, id: "session-2" });
  assert.equal(rows.length, 2);
});

test("focus checkpoints survive cross-device task deletion as orphan facts", async () => {
  const rows: Row[] = [];
  const repository = createRepository(
    database({ focus_sessions: rows }, false, false, undefined, false, undefined, ["deleted-task"]),
    "owner",
  );
  const input = {
    id: "session-1",
    taskId: "deleted-task",
    startedAt: "2026-09-16T00:00:00Z",
    endedAt: "2026-09-16T00:01:00Z",
    durationSeconds: 30,
    completed: false,
  };

  await repository.recordFocusSession(input);
  assert.deepEqual(rows, [
    {
      id: "session-1",
      user_id: "owner",
      task_id: null,
      mode: "focus",
      started_at: input.startedAt,
      ended_at: input.endedAt,
      duration_seconds: 30,
      completed: false,
    },
  ]);

  const replay = { ...input, durationSeconds: 60, completed: true };
  await repository.recordFocusSession(replay);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].task_id, null);
  assert.equal(rows[0].duration_seconds, 60);
  assert.equal(rows[0].completed, true);
});
