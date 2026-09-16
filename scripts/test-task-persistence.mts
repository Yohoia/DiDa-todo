import assert from "node:assert/strict";
import test from "node:test";
import { createRepository } from "../src/lib/data/repository.ts";

type Row = Record<string, unknown>;
type Result = { data: Row[]; error: { message: string } | null };

/** 内存数据库替身：验证真实仓库发出的筛选和更新，而不是重复实现业务逻辑。 */
function database(tables: Record<string, Row[]>, failUpdates = false) {
  return {
    from(table: string) {
      let patch: Row | undefined;
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
        eq(key: string, value: unknown) {
          filters.push((row) => row[key] === value);
          return query;
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
          const rows = (tables[table] ?? []).filter((row) =>
            filters.every((filter) => filter(row)),
          );
          if (patch && failUpdates)
            return Promise.resolve({ data: [], error: { message: "offline" } }).then(resolve);
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
  await repository.dismissNotifications(["1", "other"]);
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
  await repository.dismissNotifications(loaded.map((item) => item.id));
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
  await assert.rejects(repository.dismissNotifications(["1"]), /offline/);
  assert.equal((await repository.listNotifications())[0].dismissedAt, undefined);
});
