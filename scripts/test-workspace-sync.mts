import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createWorkspaceSync,
  type WorkspaceSnapshot,
} from "../src/features/tasks/workspace-sync.ts";
import type { Repository } from "../src/lib/data/repository.ts";
import type { Task } from "../src/types/task.ts";
import { getTodayTasks } from "../src/features/tasks/today-tasks.ts";
import {
  acknowledgeTaskWrite,
  applyTaskPatches,
  enqueueTaskWrite,
  pendingTaskWrites,
  taskPatchMatches,
  updateTaskWriteVersion,
  type TaskWriteEntry,
} from "../src/features/tasks/task-write-queue.ts";

const todayKey = "2026-09-17";
function todayTask(id: string, patch: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    description: "",
    list: "Inbox",
    tags: [],
    date: todayKey,
    priority: 2,
    estimate: 1,
    reminder: "None",
    completed: false,
    created: 0,
    subtasks: [],
    ...patch,
  };
}

test("timed focus and locked tasks retain their chronological timeline positions", () => {
  const tasks = [
    todayTask("focus", { time: "12:00", featured: true }),
    todayTask("locked", { time: "09:00", frozen: true }),
    todayTask("both", { time: "10:30", featured: true, frozen: true }),
  ];
  const before = structuredClone(tasks);
  const result = getTodayTasks(tasks, todayKey);
  assert.deepEqual(
    result.timed.map((task) => task.id),
    ["locked", "both", "focus"],
  );
  assert.equal(result.featured, tasks[0]);
  assert.equal(result.featured?.time, "12:00");
  assert.equal(result.active.length, 3);
  assert.deepEqual(tasks, before);
});

test("focus and commitment flags do not relocate anytime tasks or duplicate capacity", () => {
  const tasks = [todayTask("first"), todayTask("second"), todayTask("third")];
  const before = getTodayTasks(tasks, todayKey);
  const after = getTodayTasks(
    tasks.map((task) => (task.id === "second" ? { ...task, featured: true, frozen: true } : task)),
    todayKey,
  );
  assert.deepEqual(
    after.anytime.map((task) => task.id),
    before.anytime.map((task) => task.id),
  );
  assert.equal(after.featured, after.anytime[1]);
  assert.equal(after.featured?.time, undefined);
  assert.equal(after.active.length, 3);
  assert.equal(after.timed.length, 0);
  assert.equal(new Set([...after.timed, ...after.anytime].map((task) => task.id)).size, 3);
});

test("completed tasks remain in their schedule but leave capacity and the focus summary", () => {
  const result = getTodayTasks(
    [
      todayTask("done", { time: "09:00", featured: true, completed: true }),
      todayTask("active", { frozen: true }),
      todayTask("other-day", { date: "2026-09-18", featured: true }),
      todayTask("undated", { date: "" }),
    ],
    todayKey,
  );
  assert.equal(result.featured, undefined);
  assert.deepEqual(
    result.active.map((task) => task.id),
    ["active"],
  );
  assert.deepEqual(
    result.timed.map((task) => task.id),
    ["done"],
  );
  assert.deepEqual(
    result.anytime.map((task) => task.id),
    ["active"],
  );
  assert.deepEqual(getTodayTasks([], todayKey), {
    active: [],
    featured: undefined,
    timed: [],
    anytime: [],
  });
});

test("editing the focus task updates its summary and moves it only when its time changes", () => {
  const focus = todayTask("focus", { featured: true, frozen: true });
  const timed = getTodayTasks([{ ...focus, title: "Edited", time: "14:30" }], todayKey);
  assert.equal(timed.featured, timed.timed[0]);
  assert.equal(timed.featured?.title, "Edited");
  assert.equal(timed.featured?.time, "14:30");
  assert.equal(timed.anytime.length, 0);
  const anytime = getTodayTasks([{ ...timed.timed[0], time: "" }], todayKey);
  assert.equal(anytime.featured, anytime.anytime[0]);
  assert.equal(anytime.timed.length, 0);
  const cleared = getTodayTasks([{ ...anytime.anytime[0], featured: false }], todayKey);
  assert.equal(cleared.featured, undefined);
  assert.equal(cleared.anytime[0].frozen, true);
  assert.equal(cleared.active.length, 1);
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function repository(overrides: Partial<Repository> = {}): Repository {
  const loadTasks = overrides.loadTasks ?? (async () => []);
  return {
    loadTasks,
    loadWorkspaceTasks: async () => loadTasks(),
    loadCompletedTasks: async () => ({ tasks: [], total: 0, hasMore: false }),
    loadTasksByDate: async () => [],
    loadTasksByIds: async () => [],
    searchTasks: async () => ({ tasks: [], total: 0, hasMore: false }),
    loadPreferences: async () => ({
      firstDay: "Monday",
      sound: true,
      duration: 25,
      autoBreak: false,
      dailyCapacity: 8,
      reminders: true,
    }),
    listNotifications: async () => [],
    ...overrides,
  } as Repository;
}

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

function writeEntry(
  taskId: string,
  patch: Partial<Task>,
  expectedUpdatedAt?: string,
): TaskWriteEntry {
  return { id: `write-${taskId}-${JSON.stringify(patch)}`, taskId, expectedUpdatedAt, patch };
}

test("task writes coalesce per task and stay isolated by account", () => {
  const owner = storage();
  enqueueTaskWrite("owner", writeEntry("task-1", { title: "First" }, "version-1"), owner);
  enqueueTaskWrite("owner", writeEntry("task-1", { title: "Second", frozen: true }), owner);
  enqueueTaskWrite("owner", writeEntry("task-2", { title: "Other" }), owner);
  enqueueTaskWrite("guest", writeEntry("task-1", { title: "Guest" }), owner);

  const pending = pendingTaskWrites("owner", owner);
  assert.deepEqual(
    pending.map((entry) => [entry.taskId, entry.patch.title, entry.expectedUpdatedAt]),
    [
      ["task-1", "Second", "version-1"],
      ["task-2", "Other", undefined],
    ],
  );
  assert.equal(pending[0].patch.frozen, true);
  assert.deepEqual(
    pendingTaskWrites("guest", owner).map((entry) => entry.patch.title),
    ["Guest"],
  );
});

test("task write storage survives clean acknowledgements but not unsafe ones", () => {
  const owner = storage();
  const first = enqueueTaskWrite("owner", writeEntry("task-1", { title: "First" }, "v1"), owner)[0];
  const inFlight = pendingTaskWrites("owner", owner)[0];
  enqueueTaskWrite("owner", writeEntry("task-1", { title: "Second" }), owner);
  acknowledgeTaskWrite("owner", inFlight, owner);
  assert.equal(pendingTaskWrites("owner", owner).length, 1);
  assert.equal(pendingTaskWrites("owner", owner)[0].patch.title, "Second");

  acknowledgeTaskWrite("owner", first, owner);
  const exact = pendingTaskWrites("owner", owner)[0];
  acknowledgeTaskWrite("owner", exact, owner);
  assert.deepEqual(pendingTaskWrites("owner", owner), []);
  assert.equal(owner.getItem("dida-task-writes:owner"), null);
});

test("bad task-write storage retains uploadable edits and protects in-flight acknowledgements", () => {
  const failing = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("quota");
    },
    removeItem: () => undefined,
  };
  assert.deepEqual(pendingTaskWrites("owner", failing), []);
  assert.doesNotThrow(() =>
    enqueueTaskWrite("owner", writeEntry("task-1", { title: "x" }), failing),
  );
  const first = pendingTaskWrites("owner", failing)[0];
  assert.equal(first.patch.title, "x");
  assert.deepEqual(pendingTaskWrites("other", failing), []);
  enqueueTaskWrite("owner", writeEntry("task-1", { title: "new" }), failing);
  acknowledgeTaskWrite("owner", first, failing);
  assert.equal(pendingTaskWrites("owner", failing)[0].patch.title, "new");
  updateTaskWriteVersion("owner", "task-1", "v2", failing);
  const latest = pendingTaskWrites("owner", failing)[0];
  assert.equal(latest.expectedUpdatedAt, "v2");
  acknowledgeTaskWrite("owner", latest, failing);
  assert.deepEqual(pendingTaskWrites("owner", failing), []);
});

test("successful versions advance follow-up writes and pending edits rehydrate snapshots", () => {
  const owner = storage();
  const base = todayTask("task-1", { updatedAt: "v1", title: "Cloud" });
  enqueueTaskWrite("owner", writeEntry("task-1", { title: "Edited" }, "v1"), owner);
  updateTaskWriteVersion("owner", "task-1", "v2", owner);
  assert.equal(pendingTaskWrites("owner", owner)[0].expectedUpdatedAt, "v2");

  const hydrated = applyTaskPatches([base], pendingTaskWrites("owner", owner));
  assert.equal(hydrated[0].title, "Edited");
  assert.equal(hydrated[0].updatedAt, "v1");
});

test("idempotence checks compare task details without treating cleared values as present", () => {
  const task = todayTask("task-1", {
    title: "Read",
    date: "2026-09-18",
    time: "14:30",
    schedule: { date: "2026-09-18", hour: 14, minute: 30, duration: 25, label: "Read" },
    repeatIntervalDays: 2,
    frozen: true,
    completedAt: "2026-09-17T10:00:00Z",
    subtasks: [{ id: "sub-1", title: "Page", completed: false }],
  });
  assert.ok(taskPatchMatches(task, { title: "Read", time: "14:30", frozen: true }));
  assert.ok(
    taskPatchMatches(task, {
      completedAt: task.completedAt,
      repeatIntervalDays: 2,
      subtasks: task.subtasks,
      schedule: {
        date: "2026-09-18",
        hour: 14,
        minute: 30,
        duration: 25,
        label: "different label is derived",
      },
    }),
  );
  assert.equal(taskPatchMatches(task, { time: undefined, repeatIntervalDays: undefined }), false);
  assert.equal(taskPatchMatches(task, { date: "" }), false);
});

test("successful writes execute serially without reloading optimistic state", async () => {
  const gate = deferred<void>();
  const started = deferred<void>();
  const order: number[] = [];
  const sync = createWorkspaceSync({
    getRepository: () => repository(),
    isActive: () => true,
    onSnapshot: () => assert.fail("unnecessary recovery"),
    onError: () => assert.fail("unexpected error"),
  });
  const first = sync.enqueue(async () => {
    order.push(1);
    started.resolve();
    await gate.promise;
    order.push(2);
  });
  const last = sync.enqueue(async () => {
    order.push(3);
  });
  await started.promise;
  assert.deepEqual(order, [1]);
  gate.resolve();
  await Promise.all([first, last]);
  assert.deepEqual(order, [1, 2, 3]);
});

test("realtime refresh waits for queued writes and applies one final snapshot", async () => {
  const gate = deferred<void>();
  const started = deferred<void>();
  const order: string[] = [];
  let reads = 0;
  let snapshots = 0;
  const sync = createWorkspaceSync({
    getRepository: () =>
      repository({
        loadTasks: async () => {
          order.push(`read-${++reads}`);
          return [];
        },
      }),
    isActive: () => true,
    onSnapshot: () => {
      snapshots++;
    },
    onError: () => assert.fail("unexpected refresh error"),
  });
  const write = sync.enqueue(async () => {
    order.push("write");
    started.resolve();
    await gate.promise;
  });
  const refresh = sync.refresh();
  await started.promise;
  assert.deepEqual(order, ["write"]);
  gate.resolve();
  await Promise.all([write, refresh]);
  assert.deepEqual(order, ["write", "read-1"]);
  assert.equal(snapshots, 1);
});

test("overlapping realtime refreshes discard stale snapshots", async () => {
  const gate = deferred<Task[]>();
  let reads = 0;
  let snapshots = 0;
  const sync = createWorkspaceSync({
    getRepository: () =>
      repository({
        loadTasks: async () => {
          reads++;
          if (reads === 1) return gate.promise;
          return [];
        },
      }),
    isActive: () => true,
    onSnapshot: () => {
      snapshots++;
    },
    onError: () => assert.fail("unexpected refresh error"),
  });
  const first = sync.refresh();
  const last = sync.refresh();
  gate.resolve([]);
  await Promise.all([first, last]);
  assert.equal(reads, 2);
  assert.equal(snapshots, 1);
});

test("new edits during recovery discard the stale snapshot and recover after the last write", async () => {
  const started = deferred<void>();
  const readGate = deferred<Task[]>();
  let reads = 0;
  let cloud: Task[] = [];
  let ui: Task[] = [];
  const applied: WorkspaceSnapshot[] = [];
  const repo = repository({
    loadTasks: async () => {
      reads++;
      if (reads === 1) {
        started.resolve();
        return readGate.promise;
      }
      return cloud;
    },
  });
  const sync = createWorkspaceSync({
    getRepository: () => repo,
    isActive: () => true,
    onSnapshot: (snapshot) => {
      applied.push(snapshot);
      ui = snapshot.tasks;
    },
    onError: () => {},
  });
  const first = sync.enqueue(async () => {
    throw new Error("offline");
  });
  await started.promise;
  const fresh = { id: "fresh" } as Task;
  ui = [fresh];
  const last = sync.enqueue(async () => {
    assert.deepEqual(ui, [fresh]);
    cloud = [fresh];
  });
  readGate.resolve([]);
  await Promise.all([first, last]);
  assert.equal(reads, 2);
  assert.equal(applied.length, 1);
  assert.deepEqual(ui, [fresh]);
});

test("recovery waits for the final queued write", async () => {
  let reads = 0;
  const order: string[] = [];
  const sync = createWorkspaceSync({
    getRepository: () =>
      repository({
        loadTasks: async () => {
          reads++;
          return [];
        },
      }),
    isActive: () => true,
    onSnapshot: () => {
      order.push("snapshot");
    },
    onError: () => {},
  });
  void sync.enqueue(async () => {
    throw new Error("offline");
  });
  void sync.enqueue(async () => {
    order.push("second");
  });
  await sync.enqueue(async () => {
    order.push("last");
  });
  assert.equal(reads, 1);
  assert.deepEqual(order, ["second", "last", "snapshot"]);
});

test("sign out during recovery prevents applying data and further queued writes", async () => {
  const started = deferred<void>();
  const gate = deferred<Task[]>();
  let active = true;
  const sync = createWorkspaceSync({
    getRepository: () =>
      repository({
        loadTasks: () => {
          started.resolve();
          return gate.promise;
        },
      }),
    isActive: () => active,
    onSnapshot: () => assert.fail("session is no longer active"),
    onError: () => {},
  });
  const pending = sync.enqueue(async () => {
    throw new Error("offline");
  });
  await started.promise;
  const last = sync.enqueue(async () => assert.fail("signed-out write"));
  active = false;
  gate.resolve([]);
  await Promise.all([pending, last]);
  await sync.enqueue(async () => assert.fail("signed-out enqueue"));
});

test("a failed recovery retains recovery state for the next operation", async () => {
  let reads = 0;
  let snapshots = 0;
  const errors: boolean[] = [];
  const sync = createWorkspaceSync({
    getRepository: () =>
      repository({
        loadTasks: async () => {
          if (++reads === 1) throw new Error("read offline");
          return [];
        },
      }),
    isActive: () => true,
    onSnapshot: () => {
      snapshots++;
    },
    onError: (_error, recovery) => {
      errors.push(recovery);
    },
  });
  await sync.enqueue(async () => {
    throw new Error("write offline");
  });
  assert.equal(snapshots, 0);
  await sync.enqueue(async () => {});
  assert.equal(snapshots, 1);
  assert.deepEqual(errors, [false, true]);
});

test("workspace loading cannot silently substitute empty data and retry refetches server content", async () => {
  const layout = await readFile(
    new URL("../src/app/(workspace)/layout.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    layout,
    /repository\.(?:loadTasks|loadPreferences|listNotifications)\(\)\.catch/,
  );
  for (const file of ["../src/app/error.tsx", "../src/app/(workspace)/error.tsx"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /onClick=\{retry\}/);
  }
});

test("implemented auto-break control follows and persists the user's preference", async () => {
  const source = await readFile(
    new URL("../src/features/settings/settings-page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /label=\{t\("Auto-start Breaks"\)\}[\s\S]*?checked=\{preferences.autoBreak\}\s+onChange=\{\(value\) => save\(\{ autoBreak: value \}\)\}/,
  );
  assert.match(
    source,
    /description=\{t\("Automatically start break timer when focus session finishes\."\)\}/,
  );
});
