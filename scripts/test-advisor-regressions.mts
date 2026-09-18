import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type { Task } from "../src/types/task.ts";

type Element = { type: unknown; props: Record<string, unknown> };
function walk(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...walk(element.props.children)];
}

test("daily goal renders today's activity independently of monthly accumulation", async () => {
  const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props });
  const exports: { InsightsPage?: () => Promise<Element> } = {};
  const facts = {
    days: Array.from({ length: 42 }, (_, index) => ({
      date: `2026-08-${String((index % 28) + 1).padStart(2, "0")}`,
      minutes: 0,
      completed: 0,
      level: 0,
    })),
    focusMinutes: 120,
    focusMinutesThisMonth: 120,
    focusMinutesToday: 0,
    dailyFocusGoalMinutes: 120,
    completedTasks: 0,
    streakDays: 0,
    actualTaskMinutesThisMonth: 0,
    estimatedMinutesThisMonth: 0,
    listDistribution: {},
    checkInDaysThisMonth: 0,
    unlinkedFocusMinutesThisMonth: 0,
  };
  const modules: Record<string, unknown> = {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "react-icons/hi2": {},
    "@/i18n/server": {
      getI18n: async () => ({
        t: (key: string) => key,
        date: () => "date",
        number: (value: number) => String(value),
        label: (value: string) => value,
      }),
    },
    "@/components/shared/workspace-ui": { PageHeader: "header", SectionLabel: "label" },
    "@/styles/workspace.module.css": { default: {} },
    "./insights.module.css": { default: {} },
    "./insights-service": { getInsights: async () => facts },
    "./focus-rhythm": { FocusRhythm: "rhythm" },
    "./ai-advisor-panel": { AiAdvisorPanel: "advisor" },
  };
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(new URL("../src/features/insights/insights-page.tsx", import.meta.url), "utf8"),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      require: (id: string) => {
        assert.ok(Object.hasOwn(modules, id), id);
        return modules[id];
      },
    },
  );
  const progress = walk(await exports.InsightsPage!()).find(
    (node) => node.props.role === "progressbar",
  )!;
  assert.equal(progress.props["aria-valuenow"], 0);
  assert.equal(
    (progress.props.children as Element).props.style &&
      ((progress.props.children as Element).props.style as { width: string }).width,
    "0%",
  );
  facts.focusMinutesToday = 30;
  const updated = walk(await exports.InsightsPage!()).find(
    (node) => node.props.role === "progressbar",
  )!;
  assert.equal(updated.props["aria-valuenow"], 30);
  assert.equal(((updated.props.children as Element).props.style as { width: string }).width, "25%");
});

test("advisor keeps edited drafts through task snapshots, sends real history, and waits for save", async () => {
  const slots: unknown[] = [];
  let cursor = 0;
  const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props });
  const initial: Task = {
    id: "task-1",
    title: "Audit task",
    description: "",
    list: "Work",
    tags: [],
    date: "2026-09-18",
    priority: 3,
    estimate: 1,
    reminder: "None",
    completed: false,
    created: 1,
    subtasks: [],
    updatedAt: "v1",
  };
  let tasks = [initial];
  const requests: { history: { completed: number }[] }[] = [];
  const notices: unknown[] = [];
  let finishSave: (value: { applied: number; skipped: number; failed: number }) => void = () => {};
  let submitted: unknown;
  const modules: Record<string, unknown> = {
    react: {
      useState(initialValue: unknown) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initialValue;
        return [
          slots[index],
          (next: unknown) => {
            slots[index] = typeof next === "function" ? next(slots[index]) : next;
          },
        ];
      },
      useRef(current: unknown) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current };
        return slots[index];
      },
      useMemo: (compute: () => unknown) => compute(),
      useEffect: () => {},
    },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "react-icons/hi2": { HiSparkles: "icon" },
    "@/components/ui/select": { Select: "select" },
    "@/components/ui/dialog": {
      Dialog: "dialog",
      DialogContent: "content",
      DialogDescription: "description",
      DialogTitle: "title",
    },
    "@/features/preferences/preferences-provider": {
      useI18n: () => ({ locale: "zh-CN", t: (key: string) => key }),
    },
    "@/hooks/use-today-key": { useTodayKey: () => initial.date },
    "@/features/tasks/workspace-provider": {
      useWorkspace: () => ({
        tasks,
        preferences: { duration: 25, dailyCapacity: 6 },
        notify: (notice: unknown) => notices.push(notice),
        applyTaskAdvice: (_expected: Task[], suggestions: unknown) => {
          submitted = suggestions;
          return new Promise((resolve) => {
            finishSave = resolve;
          });
        },
      }),
    },
    "@/lib/utils": { cn: (value: unknown) => value },
    "@/styles/workspace.module.css": { default: {} },
    "./insights.module.css": { default: {} },
    "./ai-advisor-api": {
      requestAiAdvisor: async (input: { history: { completed: number }[] }) => {
        requests.push(input);
        return {
          taskSuggestions: [
            { id: initial.id, estimate: 2, subtasks: ["Original step"], reason: "" },
          ],
          capacity: { message: "Fits", totalPomodoros: 2 },
          weeklyReview: { summary: "Review", wins: [], risks: [], nextActions: [] },
        };
      },
    },
  };
  const exports: { AiAdvisorPanel?: (props: unknown) => Element } = {};
  const compiled = ts.transpileModule(
    readFileSync(new URL("../src/features/insights/ai-advisor-panel.tsx", import.meta.url), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    },
  ).outputText;
  vm.runInNewContext(compiled, {
    exports,
    structuredClone,
    AbortController,
    require: (id: string) => {
      assert.ok(Object.hasOwn(modules, id), id);
      return modules[id];
    },
  });
  const render = () => {
    cursor = 0;
    return exports.AiAdvisorPanel!({ history: [{ date: initial.date, minutes: 0, completed: 4 }] });
  };
  const generate = walk(render()).find((node) => node.type === "button")!;
  (generate.props.onClick as () => void)();
  await new Promise(setImmediate);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].history[0].completed, 4);
  const editor = walk(render()).find((node) => node.type === "textarea")!;
  (editor.props.onChange as (event: unknown) => void)({ target: { value: "Human edit" } });
  tasks = [...tasks.map((task) => ({ ...task })), { ...initial, id: "unrelated", date: "" }];
  const rerendered = render();
  assert.equal(requests.length, 1);
  assert.equal(
    walk(rerendered).find((node) => node.type === "textarea")!.props.value,
    "Human edit",
  );
  const apply = walk(rerendered).find(
    (node) => node.type === "button" && node.props.children === "advisor.apply",
  )!;
  (apply.props.onClick as () => void)();
  assert.equal(notices.length, 0);
  assert.equal(
    walk(render()).find(
      (node) => node.type === "button" && node.props.children === "organize.saving",
    )!.props.disabled,
    true,
  );
  assert.equal((submitted as { subtasks: string[] }[])[0].subtasks[0], "Human edit");
  finishSave({ applied: 0, skipped: 0, failed: 1 });
  await new Promise(setImmediate);
  assert.equal((notices[0] as { key: string }).key, "advisor.applyResult");
  assert.equal((notices[0] as { values: { applied: number } }).values.applied, 0);
  assert.ok(
    walk(render()).some(
      (node) => node.props.role === "status" && node.props.children === "advisor.applyResult",
    ),
  );
});
