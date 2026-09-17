import assert from "node:assert/strict";
import test from "node:test";
import { createRepository } from "../src/lib/data/repository.ts";
import { taskCompletionPatch } from "../src/features/tasks/task-completion.ts";
import { organizationPatch } from "../src/lib/data/task-organization.ts";

type Row = Record<string, unknown>;
type Result = { data: Row[]; error: { message: string; code?: string } | null };

/** 内存数据库替身：验证真实仓库发出的筛选和更新，而不是重复实现业务逻辑。 */
function database(
  tables: Record<string, Row[]>,
  failUpdates = false,
  failReads = false,
  beforeUpdate?: () => void,
) {
  return {
    from(table: string) {
      let patch: Row | undefined;
      let inserted: Row | undefined;
      let start = 0;
      let end = Infinity;
      const filters: ((row: Row) => boolean)[] = [];
      const query = {
        select() {
          return query;
        },
        order() {
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
          return query;
        },
        then(resolve: (result: Result) => unknown) {
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
          if (patch && failUpdates)
            return Promise.resolve({ data: [], error: { message: "offline" } }).then(resolve);
          if (!patch && !inserted && failReads)
            return Promise.resolve({ data: [], error: { message: "read offline" } }).then(resolve);
          if (patch) rows.forEach((row) => Object.assign(row, patch));
          return Promise.resolve({ data: rows.slice(start, end + 1), error: null }).then(resolve);
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

function notification(id: string, userId = "owner"): Row {
  return {
    id,
    user_id: userId,
    task_id: `task-${id}`,
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
  assert.ok(loaded[504].dismissedAt);
  await repository.dismissTaskNotifications(loaded.map((item) => item.taskId));
  assert.equal(
    (await repository.listNotifications()).filter((item) => !item.dismissedAt).length,
    0,
  );
});

test("marking notifications read keeps them visible and never changes another user's rows", async () => {
  const rows = [notification("1"), notification("2"), notification("other", "someone-else")];
  const repository = createRepository(database({ notifications: rows }), "owner");
  await repository.markTaskNotificationRead("task-other");
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
  await repository.markTaskNotificationRead(local.taskId);
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
  assert.equal(await repository.applyTaskOrganization(snapshot, { priority: 1 }), false);
  assert.equal(row.priority, 3);
  row.title = snapshot.title;
  row.completed = true;
  assert.equal(await repository.applyTaskOrganization(snapshot, { priority: 1 }), false);
  row.completed = false;
  row.user_id = "someone-else";
  assert.equal(await repository.applyTaskOrganization(snapshot, { priority: 1 }), false);
  row.user_id = "owner";
  assert.equal(
    await repository.applyTaskOrganization(snapshot, { priority: 1, tags: ["Read"] }),
    true,
  );
  assert.equal((await repository.loadTasks())[0].priority, 1);
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
  assert.equal(await repository.applyTaskOrganization(snapshot, { priority: 1 }), false);
  assert.equal(row.priority, 3);
  assert.equal(row.date, "2026-09-17");
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
  assert.equal(await repository.applyTaskOrganization(snapshot, patch), true);
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
