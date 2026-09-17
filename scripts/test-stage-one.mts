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
  updateOrganizationDraft,
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
import { taskCompletionPatch } from "../src/features/tasks/task-completion.ts";
import {
  acknowledgeTaskWrite,
  applyTaskPatch,
  applyTaskPatches,
  enqueueTaskWrite,
  pendingTaskWrites,
  taskPatchMatches,
  updateTaskWriteVersion,
  type TaskWriteEntry,
} from "../src/features/tasks/task-write-queue.ts";
import {
  isOrganizationCandidateCurrent,
  hasOrganizationDetailEdits,
} from "../src/lib/data/task-organization.ts";
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
test("AI task editor uses detail fields and commits only confirmed local drafts", () => {
  type Node = { type: unknown; props: Record<string, unknown> };
  type Component = (props: Record<string, unknown>) => Node;
  let slots: unknown[] = [];
  let cursor = 0;
  const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props });
  const modules: Record<string, unknown> = {
    react: {
      useState: (initial: unknown) => {
        const index = cursor++;
        const state = slots;
        if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
        return [
          state[index],
          (next: unknown) => {
            state[index] = typeof next === "function" ? next(state[index]) : next;
          },
        ];
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-icons/hi2": { HiCheck: "checkIcon", HiOutlinePencil: "pencilIcon" },
    "@/components/ui/dialog": Object.fromEntries(
      ["Dialog", "DialogContent", "DialogDescription", "DialogTitle", "DialogTrigger"].map(
        (name) => [name, name],
      ),
    ),
    "@/features/preferences/preferences-provider": {
      useI18n: () => ({ t: (key: string) => key, label: (key: string) => key }),
    },
    "./organization-editor": {
      isOrganizationEdited,
      organizationDraftError,
      updateOrganizationDraft,
    },
    "./task-detail-form": { TaskDetailForm: "sharedDetail", preserveSubtaskEditOnEscape: () => {} },
    "./task-organization-fields": { TaskOrganizationFields: "sharedDetail" },
    "./task-content-fields": { TaskContentFields: "sharedDetail" },
    "@/lib/utils": { cn: (...values: string[]) => values.join(" ") },
  };
  for (const path of [
    "@/styles/workspace.module.css",
    "./task-detail.module.css",
    "./ai-organize-dialog.module.css",
  ])
    modules[path] = { default: new Proxy({}, { get: (_target, key) => key }) };
  const exports: { OrganizationDraftRow?: Component } = {};
  const detailExports: { OrganizationTaskDetail?: Component } = {};
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(
        new URL("../src/features/tasks/organization-task-detail.tsx", import.meta.url),
        "utf8",
      ),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
    ).outputText,
    {
      exports: detailExports,
      require: (id: string) => {
        assert.ok(Object.hasOwn(modules, id), `Unexpected import: ${id}`);
        return modules[id];
      },
    },
  );
  modules["./organization-task-detail"] = detailExports;
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(
        new URL("../src/features/tasks/organization-draft-row.tsx", import.meta.url),
        "utf8",
      ),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
    ).outputText,
    {
      exports,
      require: (id: string) => {
        assert.ok(Object.hasOwn(modules, id), `Unexpected import: ${id}`);
        return modules[id];
      },
    },
  );
  function nodes(value: unknown): Node[] {
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (!value || typeof value !== "object" || !("props" in value)) return [];
    const node = value as Node;
    return [node, ...nodes(node.props.children)];
  }
  const find = (tree: Node, type: unknown) => {
    const result = nodes(tree).find((node) => node.type === type);
    assert.ok(result, `Missing node ${String(type)}`);
    return result;
  };
  const render = (component: Component, props: Record<string, unknown>, state: unknown[]) => {
    slots = state;
    cursor = 0;
    return component(props);
  };
  const changes: unknown[] = [];
  const rowProps = {
    task,
    original: suggestion,
    draft: suggestion,
    checked: false,
    disabled: false,
    recurrenceAvailable: true,
    onToggle: () => assert.fail("Editing must not change selection"),
    onChange: (draft: unknown) => changes.push(draft),
  };
  const rowState: unknown[] = [];
  let row = render(exports.OrganizationDraftRow!, rowProps, rowState);
  assert.equal(find(row, "pencilIcon").props["aria-hidden"], "true");
  const open = find(row, "Dialog").props.onOpenChange as (open: boolean) => void;
  open(true);
  row = render(exports.OrganizationDraftRow!, rowProps, rowState);
  const editor = nodes(row).find((node) => typeof node.type === "function")!;
  assert.ok(editor);
  const editorState: unknown[] = [];
  let form = render(editor.type as Component, editor.props, editorState);
  assert.equal(find(form, "DialogContent").props.variant, "drawer");
  const fields = find(form, "sharedDetail");
  assert.equal(fields.props.dateLocked, true);
  const change = fields.props.onChange as (patch: unknown) => void;
  change({ priority: 1, estimate: 4, tags: ["Edited"] });
  change({ time: undefined });
  change({
    reminder: "10 min before",
    repeatIntervalDays: 7,
    frozen: true,
    subtasks: [{ id: "child-1", title: "Prepare", completed: false }],
  });
  const content = find(form, "sharedDetail");
  const changeContent = content.props.onChange as (patch: unknown) => void;
  assert.equal((content.props.task as { title: string }).title, task.title);
  changeContent({ title: "Read revised", description: "Read chapter two" });
  form = render(editor.type as Component, editor.props, editorState);
  assert.equal(changes.length, 0);
  assert.equal(suggestion.time, "09:00");
  assert.deepEqual(suggestion.tags, ["Read"]);
  const save = nodes(form).find(
    (node) => node.type === "button" && node.props.children === "确定",
  )!;
  (save.props.onClick as () => void)();
  assert.equal(changes.length, 1);
  const saved = JSON.parse(JSON.stringify(changes[0]));
  assert.equal(saved.time, null);
  assert.equal(saved.timeEdited, true);
  assert.equal(saved.priority, 1);
  assert.equal(saved.estimate, 4);
  assert.deepEqual(saved.tags, ["Edited"]);
  assert.equal(saved.title, "Read revised");
  assert.equal(saved.description, "Read chapter two");
  assert.equal(saved.reminder, "10 min before");
  assert.equal(saved.repeatIntervalDays, 7);
  assert.equal(saved.frozen, true);
  assert.deepEqual(saved.subtasks, [{ id: "child-1", title: "Prepare", completed: false }]);
  assert.equal(task.title, "Read");
  assert.equal(task.description, "");
  assert.equal(
    find(render(exports.OrganizationDraftRow!, rowProps, rowState), "Dialog").props.open,
    false,
  );

  open(true);
  const cancelledState: unknown[] = [];
  form = render(editor.type as Component, editor.props, cancelledState);
  (find(form, "sharedDetail").props.onChange as (patch: unknown) => void)({ priority: 2 });
  (find(form, "sharedDetail").props.onChange as (patch: unknown) => void)({
    title: "Discard this",
  });
  form = render(editor.type as Component, editor.props, cancelledState);
  const cancel = nodes(form).find(
    (node) => node.type === "button" && node.props.children === "取消",
  )!;
  (cancel.props.onClick as () => void)();
  assert.equal(changes.length, 1);
  assert.equal(
    find(render(exports.OrganizationDraftRow!, rowProps, rowState), "Dialog").props.open,
    false,
  );
  row = render(exports.OrganizationDraftRow!, { ...rowProps, draft: saved }, rowState);
  assert.equal(find(row, "h3").props.children, "Read revised");
  const restore = nodes(row).find(
    (node) => node.type === "button" && node.props.children === "organize.restoreAi",
  )!;
  (restore.props.onClick as () => void)();
  assert.equal(changes.length, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(changes[1])), suggestion);
});
test("AI content edits validate title and description without rewriting original content", () => {
  assert.equal(organizationDraftError({ ...suggestion, title: "   " }), "organize.invalidTitle");
  assert.equal(
    organizationDraftError({ ...suggestion, title: "a".repeat(201) }),
    "organize.invalidTitle",
  );
  assert.equal(
    organizationDraftError({ ...suggestion, description: "a".repeat(51) }),
    "organize.invalidDescription",
  );
  assert.equal(
    organizationDraftError({ ...suggestion, title: "a".repeat(200), description: "a".repeat(50) }),
    null,
  );
  assert.equal(organizationDraftError({ ...suggestion, description: "" }), null);
  assert.equal(
    isOrganizationEdited(
      suggestion,
      { ...suggestion, title: task.title, description: task.description },
      task,
    ),
    false,
  );
  assert.equal(isOrganizationEdited(suggestion, { ...suggestion, title: "Changed" }, task), true);
  const block = { date: task.date, hour: 9, minute: 0, duration: 50, label: task.title };
  const patch = organizationPatch(
    { ...suggestion, time: null, title: "Changed", description: "" },
    { ...task, time: "09:00", schedule: block },
  );
  assert.equal(patch.title, "Changed");
  assert.equal(patch.description, "");
  assert.equal(Object.hasOwn(patch, "time"), false);
  assert.deepEqual(patch.schedule, { ...block, label: "Changed" });
});
test("full detail draft edits cannot change day or invoke actions and retain explicit recurrence clearing", () => {
  const draft = updateOrganizationDraft(suggestion, {
    date: "2026-10-01",
    featured: true,
    completed: true,
    reminder: "10 min before",
    frozen: true,
    repeatIntervalDays: undefined,
    subtasks: [{ id: "child", title: "Prepare", completed: false }],
  });
  assert.equal(Object.hasOwn(draft, "date"), false);
  assert.equal(Object.hasOwn(draft, "featured"), false);
  assert.equal(Object.hasOwn(draft, "completed"), false);
  assert.equal(Object.hasOwn(draft, "repeatIntervalDays"), true);
  assert.equal(draft.reminder, "10 min before");
  assert.equal(organizationDraftError(draft), null);
  assert.equal(hasOrganizationDetailEdits(draft), true);
  assert.equal(
    organizationDraftError({ ...draft, repeatIntervalDays: 366 }),
    "organize.invalidDetails",
  );
  assert.equal(
    organizationDraftError({ ...draft, subtasks: [{ id: "child", title: " ", completed: false }] }),
    "organize.invalidDetails",
  );
  assert.equal(
    isOrganizationCandidateCurrent(task, { ...task, reminder: "10 min before" }, true),
    false,
  );
  assert.equal(isOrganizationCandidateCurrent(task, { ...task, reminder: "10 min before" }), true);
});
test("AI review keeps minimal heading, icons and Apply label without redundant status text", () => {
  const dialog = readFileSync(
    new URL("../src/features/tasks/ai-organize-dialog.tsx", import.meta.url),
    "utf8",
  );
  const row = readFileSync(
    new URL("../src/features/tasks/organization-draft-row.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(dialog.includes('t("AI 整理")'));
  assert.ok(dialog.includes('t("organize.apply")'));
  assert.ok(dialog.includes("HiOutlineAdjustmentsHorizontal"));
  for (const removed of [
    "styles.summary",
    "styles.sparkle",
    "正在整理 {date}",
    "应用 {count}",
    "organize.reviewHint",
  ])
    assert.equal(dialog.includes(removed), false);
  for (const removed of ["organize.aiSuggestion", "organize.humanAdjusted", "HiPencilSquare"])
    assert.equal(row.includes(removed), false);
  assert.ok(row.includes("HiOutlinePencil"));
  assert.ok(row.includes("styles.checkMark"));
  assert.ok(row.includes("OrganizationTaskDetail"));
  assert.equal(row.includes("OrganizationDraftEditor"), false);
});
test("task detail and AI drafts share organization controls without moving the organized day", () => {
  const source = (name: string) => readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");
  assert.ok(source("features/tasks/task-detail.tsx").includes("<TaskDetailForm"));
  const adapter = source("features/tasks/organization-task-detail.tsx");
  assert.ok(adapter.includes("<TaskDetailForm"));
  assert.equal(adapter.includes("<TaskContentFields"), false);
  assert.equal(adapter.includes("<TaskOrganizationFields"), false);
  const fullForm = source("features/tasks/task-detail-form.tsx");
  for (const component of [
    "TaskOrganizationFields",
    "TaskContentFields",
    "RepeatTaskPicker",
    "ReminderBell",
    "SubtaskRow",
  ])
    assert.ok(fullForm.includes("<" + component));
  for (const action of ["styles.oneAction", "TaskLockButton", "Delete Task", "Start Focus Session"])
    assert.ok(fullForm.includes(action));
  const fields = source("features/tasks/task-organization-fields.tsx");
  for (const component of ["DateTimePicker", "SegmentedControl", "Select", "Stepper"])
    assert.ok(fields.includes(`<${component}`));
  assert.ok(fields.includes("dateLocked ? { time: next.time }"));
  const picker = source("components/ui/datetime-picker.tsx");
  assert.ok(picker.includes("date: dateLocked ? value.date"));
  assert.ok(picker.includes("disabled={dateLocked}"));
  assert.equal(
    source("features/tasks/organization-draft-row.tsx").includes("aria-expanded={editing}"),
    false,
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

test("completed history labels use completion dates instead of fixture strings", () => {
  const completed = readFileSync(
    new URL("../src/features/tasks/completed-page.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(completed.includes("function completionDay"));
  assert.ok(completed.includes("date: formatDate"));
  assert.ok(completed.includes("formatDate(date"));
  for (const removed of ["2026-09-08", "Sep 8", "Sep 9", "Sep 10", "label(date)"])
    assert.equal(completed.includes(removed), false);
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
  const periodClock = parseQuickCapture("明天下午3:30开会", "2026-09-17", preset, "capture-6");
  assert.equal(periodClock.title, "开会");
  assert.equal(periodClock.date, "2026-09-18");
  assert.equal(periodClock.time, "15:30");
  assert.equal(parseQuickCapture("晚上12点睡觉", "2026-09-17", preset, "capture-7").time, "00:00");
  assert.equal(parseQuickCapture("中午12点吃饭", "2026-09-17", preset, "capture-8").time, "12:00");
  assert.equal(parseQuickCapture("晚上12:30复查", "2026-09-17", preset, "capture-9").time, "00:30");
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
  const versionedCalls: string[] = [];
  const ownerStorage = {
    values: new Map<string, string>(),
    getItem(key: string) {
      return this.values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      this.values.set(key, value);
    },
    removeItem(key: string) {
      this.values.delete(key);
    },
  };
  let fail = true;
  let version = 0;
  let offline = false;
  let timerId = 0;
  const timers = new Map<number, { callback: () => void; due: number }>();
  const setTimeoutVm = (callback: () => void, delay = 0) => {
    const id = ++timerId;
    timers.set(id, { callback, due: delay });
    return id;
  };
  const clearTimeoutVm = (id: number) => timers.delete(id);
  const advanceTimers = async (milliseconds: number) => {
    for (;;) {
      const next = [...timers.entries()].sort((left, right) => left[1].due - right[1].due)[0];
      if (!next || next[1].due > milliseconds) return;
      timers.delete(next[0]);
      next[1].callback();
      await new Promise(setImmediate);
    }
  };
  const repository = {
    createTask: async (item: Task) => {
      calls.push(item.id);
      if (item.id === "retry" && fail) throw new Error("offline");
      if (!cloud.has(item.id)) cloud.set(item.id, item);
    },
    loadTasks: async () => [...cloud.values()],
    loadWorkspaceTasks: async () => [...cloud.values()],
    loadCompletedTasks: async () => ({
      tasks: [...cloud.values()],
      total: cloud.size,
      hasMore: false,
    }),
    loadTasksByDate: async () => [...cloud.values()],
    loadTasksByIds: async () => [...cloud.values()],
    searchTasks: async () => ({ tasks: [...cloud.values()], total: cloud.size, hasMore: false }),
    loadPreferences: async () => DEFAULT_PREFERENCES,
    listNotifications: async () => [],
    updateTask: async (id: string, patch: Partial<Task>) => {
      const previous = cloud.get(id);
      if (previous) cloud.set(id, { ...previous, ...patch });
    },
    loadTask: async (id: string) => cloud.get(id) ?? null,
    loadRepeatChild: async () => null,
    updateTaskVersioned: async (
      taskId: string,
      expectedUpdatedAt: string | undefined,
      patch: Partial<Task>,
    ) => {
      const previous = cloud.get(taskId);
      if (!previous) return null;
      if (offline) throw new Error("offline");
      if (expectedUpdatedAt && previous.updatedAt && previous.updatedAt !== expectedUpdatedAt)
        return null;
      const updatedAt = `version-${++version}`;
      cloud.set(taskId, { ...applyTaskPatch(previous, patch), updatedAt });
      versionedCalls.push(taskId);
      return { updatedAt };
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
    "@/lib/utils": { createId: () => `id-${calls.length}-${Math.random()}` },
    "@/lib/data/repository": { createRepository: () => repository },
    "@/lib/supabase/client": { createClient: () => ({}) },
    "@/lib/workspace-access": { LOGIN_REQUIRED_URL: "/" },
    "./workspace-sync": { createWorkspaceSync },
    "./workspace-realtime": {
      createWorkspaceRealtime: () => ({ stop: () => {} }),
    },
    "./task-completion": { taskCompletionPatch },
    "./task-write-queue": {
      acknowledgeTaskWrite: (userId: string, entry: TaskWriteEntry) =>
        acknowledgeTaskWrite(userId, entry, ownerStorage),
      applyTaskPatch,
      applyTaskPatches,
      enqueueTaskWrite: (userId: string, entry: TaskWriteEntry) =>
        enqueueTaskWrite(userId, entry, ownerStorage),
      pendingTaskWrites: (userId: string) => pendingTaskWrites(userId, ownerStorage),
      taskPatchMatches,
      updateTaskWriteVersion: (userId: string, taskId: string, updatedAt: string | undefined) =>
        updateTaskWriteVersion(userId, taskId, updatedAt, ownerStorage),
    },
    "@/lib/date-utils": { getTodayKey: () => task.date },
    "./task-focus": { normalizeFocusPatch },
    "@/lib/data/task-organization": {
      isOrganizationCandidateCurrent,
      organizationPatch,
      hasOrganizationDetailEdits,
    },
    "./organization-editor": { organizationDraftError },
    "./task-capture": { captureDraftError, capturedTask },
    "@/features/focus/focus-journal": {},
    "@/features/preferences/preferences-provider": {
      PreferencesProvider: ({ children }: { children: unknown }) => ({ props: { children } }),
      usePreferences: () => DEFAULT_PREFERENCES,
    },
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
    setTimeout: setTimeoutVm,
    clearTimeout: clearTimeoutVm,
    window: { addEventListener: () => {}, removeEventListener: () => {} },
    document: {
      addEventListener: () => {},
      removeEventListener: () => {},
      visibilityState: "visible",
    },
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
  await advanceTimers(500);
  await new Promise(setImmediate);
  const local = () => (state[0] as Task[]).find((item) => item.id === "saved")!;
  assert.deepEqual(versionedCalls, ["saved"]);
  assert.equal(local().time, "14:00");
  assert.equal(local().schedule, undefined);
  updateTask("saved", { date: "2026-09-18" });
  assert.equal(local().schedule?.hour, 14);
  assert.equal(local().schedule?.date, "2026-09-18");
  updateTask("saved", { date: "" });
  assert.equal(local().time, undefined);
  assert.equal(local().schedule, undefined);
  await advanceTimers(500);
  await new Promise(setImmediate);
  assert.deepEqual(versionedCalls, ["saved", "saved"]);
  // Another device wins the version race: the local edit must not overwrite it.
  cloud.set("saved", { ...cloud.get("saved")!, title: "Cloud edit", updatedAt: "version-99" });
  updateTask("saved", { title: "Local edit" });
  await advanceTimers(500);
  await new Promise(setImmediate);
  await new Promise(setImmediate);
  assert.equal(cloud.get("saved")?.title, "Cloud edit");
  assert.equal(local().title, "Cloud edit");
  assert.deepEqual(pendingTaskWrites("owner", ownerStorage), []);
  assert.equal((state[6] as { key?: string } | null)?.key, "sync.conflict");

  offline = true;
  updateTask("retry", { title: "Offline edit" });
  await advanceTimers(500);
  await new Promise(setImmediate);
  assert.equal(cloud.get("retry")?.title, "Meeting");
  assert.equal((state[0] as Task[]).find((item) => item.id === "retry")?.title, "Offline edit");
  assert.equal(pendingTaskWrites("owner", ownerStorage).length, 1);
  offline = false;
  await advanceTimers(3_000);
  await new Promise(setImmediate);
  await new Promise(setImmediate);
  assert.equal(cloud.get("retry")?.title, "Offline edit");
  assert.deepEqual(pendingTaskWrites("owner", ownerStorage), []);
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
    assert.deepEqual(
      (
        await db.query<{ tablename: string }>(
          `select tablename from pg_publication_tables
          where pubname='supabase_realtime' and schemaname='public'
          order by tablename`,
        )
      ).rows,
      [
        { tablename: "notifications" },
        { tablename: "subtasks" },
        { tablename: "tasks" },
        { tablename: "user_preferences" },
      ],
    );
    assert.deepEqual(
      (
        await db.query<{ tablename: string; relreplident: string }>(
          `select c.relname as tablename, c.relreplident
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relname in ('tasks', 'subtasks', 'user_preferences', 'notifications')
          order by c.relname`,
        )
      ).rows,
      [
        { tablename: "notifications", relreplident: "f" },
        { tablename: "subtasks", relreplident: "f" },
        { tablename: "tasks", relreplident: "f" },
        { tablename: "user_preferences", relreplident: "f" },
      ],
    );
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
    await db.query("update tasks set title='Foreign needle' where id=$1", [other]);
    await db.query(
      "insert into subtasks(task_id,user_id,title,completed,position) values ($1,$2,'Read chapter',true,0)",
      [original, owner],
    );
    await db.exec(
      "grant usage on schema public,auth to authenticated; grant all on all tables in schema public to authenticated; set role authenticated;",
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
    await t.test("database search RPC matches owner content and paginates in SQL", async () => {
      await db.query(
        `insert into tasks(user_id,title,description,list,tags,completed)
        values
          ($1,'Active needle','',  'Work',ARRAY[]::text[],false),
          ($1,'Archived report','needle in description','Life',ARRAY[]::text[],true),
          ($1,'Tagged errand','','Inbox',ARRAY['needle'],false),
          ($1,'Unrelated','','Study',ARRAY[]::text[],false)`,
        [owner],
      );
      const allMatches = (
        await db.query<{ title: string; completed: boolean }>(
          `select task->>'title' as title,(task->>'completed')::boolean as completed
          from search_tasks('needle',50,0) order by 1`,
        )
      ).rows;
      assert.deepEqual(allMatches, [
        { title: "Active needle", completed: false },
        { title: "Archived report", completed: true },
        { title: "Tagged errand", completed: false },
      ]);
      assert.equal(
        (
          await db.query<{ title: string }>(
            "select task->>'title' as title from search_tasks('needle in description',50,0)",
          )
        ).rows[0]?.title,
        "Archived report",
      );
      assert.equal(
        (
          await db.query<{ title: string }>(
            `select task->>'title' as title from search_tasks('needle',1,0)
            except
            select task->>'title' as title from search_tasks('needle',1,1)`,
          )
        ).rows.length,
        1,
      );
      assert.equal(
        (
          await db.query<{ total_count: number }>(
            "select total_count from search_tasks('needle',1,0)",
          )
        ).rows[0]?.total_count,
        3,
      );
    });
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
