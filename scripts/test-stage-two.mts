import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import {
  newFocusRun,
  focusRemaining,
  pauseFocusRun,
  resumeFocusRun,
  focusRunRecord,
  startFocusBreak,
  nextFocusRound,
  settleFocusRun,
  readActiveFocus,
  saveActiveFocus,
  clearActiveFocus,
} from "../src/features/focus/focus-run.ts";

const start = Date.parse("2026-09-17T01:00:00Z");
const run = newFocusRun("task-1", "round-1", 25, false, start);
const storageValues = new Map<string, string>();
const storage = {
  getItem: (key: string) => storageValues.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageValues.set(key, value);
  },
  removeItem: (key: string) => {
    storageValues.delete(key);
  },
};

test("workspace auth state handling survives a transient missing session", () => {
  const source = readFileSync(
    new URL("../src/features/tasks/workspace-provider.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /event === "SIGNED_OUT" \|\| \(session && session\.user\.id !== user\.id\)/);
  assert.doesNotMatch(source, /if \(!session \|\| session\.user\.id !== user\.id\)/);
});
test("search load-more remains visible for the active command palette query", () => {
  const source = readFileSync(
    new URL("../src/components/ui/command-palette.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /value="__load-more-search-results__"\s+keywords=\{\[query\.trim\(\)\]\}/);
});
test("focus restore follows an absolute deadline and paused time never contributes", () => {
  const paused = pauseFocusRun(run, start + 60_000);
  assert.equal(focusRemaining(paused, start + 900_000), 1440);
  const resumed = resumeFocusRun(paused, start + 900_000);
  assert.equal(focusRemaining(resumed, start + 930_000), 1410);
  assert.equal(focusRunRecord(resumed, start + 930_000)?.durationSeconds, 90);
  saveActiveFocus("owner", resumed, storage);
  assert.equal(focusRemaining(readActiveFocus("owner", storage)!, start + 960_000), 1380);
  assert.equal(readActiveFocus("other", storage), null);
  assert.equal(clearActiveFocus("owner", storage), true);
  assert.equal(readActiveFocus("owner", storage), null);
});
test("four completed rounds lead to a long break and every focus round has a fresh ID", () => {
  let current = run;
  for (let round = 1; round <= 4; round++) {
    const end = current.deadline!;
    assert.equal(focusRunRecord(current, end)?.completed, true);
    const complete = settleFocusRun(current, "unused", end);
    assert.equal(complete.phase, "focusComplete");
    assert.equal(complete.completedRounds, round);
    assert.equal(settleFocusRun(complete, "unused", end), complete);
    const rest = startFocusBreak(complete, end);
    assert.equal(rest.phase, round === 4 ? "longBreak" : "shortBreak");
    assert.equal(rest.totalSeconds, (round === 4 ? 15 : 5) * 60);
    assert.equal(focusRunRecord(rest, rest.deadline!), null);
    current = nextFocusRound(rest, `round-${round + 1}`, rest.deadline!);
    assert.equal(current.id, `round-${round + 1}`);
  }
});
test("automatic transitions settle only once and do not fabricate rounds during a long absence", () => {
  const original = { ...run, autoBreak: true, autoNext: true };
  const late = start + 7 * 86400_000;
  const rest = settleFocusRun(original, "unused", late);
  assert.equal(rest.phase, "shortBreak");
  assert.equal(rest.completedRounds, 1);
  assert.equal(focusRemaining(rest, late), 300);
  assert.equal(settleFocusRun(rest, "unused", late), rest);
  const next = settleFocusRun(rest, "next-round", late + 300_000);
  assert.equal(next.phase, "focus");
  assert.equal(next.completedRounds, 1);
  assert.equal(next.id, "next-round");
  assert.equal(focusRemaining(next, late + 300_000), 1500);
});
test("invalid or unavailable browser storage is rejected without breaking the timer", () => {
  storageValues.set("dida-focus-active:broken", JSON.stringify({ ...run, remainingSeconds: -1 }));
  assert.equal(readActiveFocus("broken", storage), null);
  const unavailable = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("denied");
    },
    removeItem: () => {
      throw new Error("denied");
    },
  };
  assert.equal(readActiveFocus("owner", unavailable), null);
  assert.equal(saveActiveFocus("owner", run, unavailable), false);
  assert.equal(clearActiveFocus("owner", unavailable), false);
});

test("actual timer records focus at zero, excludes breaks, starts the next round and exits without duplicate records", () => {
  let now = start;
  let id = 0;
  const records: { id: string; durationSeconds: number; completed: boolean }[] = [];
  const effects: (() => void | (() => void))[] = [];
  const intervalCallbacks: (() => void)[] = [];
  const timeoutCallbacks: (() => void)[] = [];
  const exitRef: { current: (() => void) | null } = { current: null };
  let exited = false;
  type Element = {
    type: unknown;
    props: {
      children?: unknown;
      onClick?: () => void;
      onChange?: (event: unknown) => void;
      type?: string;
    };
  };
  const jsx = (type: unknown, props: Element["props"]): Element => ({ type, props });
  const fakeWindow = {
    localStorage: storage,
    sessionStorage: storage,
    addEventListener: () => {},
    removeEventListener: () => {},
    setInterval: (callback: () => void) => {
      intervalCallbacks.push(callback);
      return 1;
    },
    clearInterval: () => {},
    setTimeout: (callback: () => void) => {
      timeoutCallbacks.push(callback);
      return 2;
    },
    clearTimeout: () => {},
  };
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNow = Date.now;
  Object.defineProperty(globalThis, "window", { value: fakeWindow, configurable: true });
  Date.now = () => now;
  storageValues.clear();
  const compiled = ts.transpileModule(
    readFileSync(new URL("../src/features/focus/focus-session.tsx", import.meta.url), "utf8") +
      "\nexport const TestTimer = Timer;",
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    },
  ).outputText;
  const exports: { TestTimer?: (props: unknown) => Element } = {};
  const runModule = {
    newFocusRun,
    focusRemaining,
    pauseFocusRun,
    resumeFocusRun,
    focusRunRecord,
    startFocusBreak,
    nextFocusRound,
    settleFocusRun,
    readActiveFocus,
    saveActiveFocus,
    clearActiveFocus,
  };
  try {
    vm.runInNewContext(compiled, {
      exports,
      window: fakeWindow,
      document: {
        visibilityState: "visible",
        addEventListener: () => {},
        removeEventListener: () => {},
      },
      require: (name: string) => {
        if (name === "react")
          return {
            useState: (initial: unknown) => [
              typeof initial === "function" ? initial() : initial,
              () => {},
            ],
            useRef: (current: unknown) => ({ current }),
            useCallback: (callback: unknown) => callback,
            useEffect: (effect: () => void | (() => void)) => effects.push(effect),
          };
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
        if (name.includes("preferences-provider"))
          return { useI18n: () => ({ t: (key: string) => key }) };
        if (name.includes("use-dialog-focus")) return {};
        if (name.includes("workspace-provider") || name.includes("components/ui/dialog")) return {};
        if (name.endsWith(".css")) return { default: {} };
        if (name === "@/lib/utils") return { createId: () => `round-${++id}` };
        if (name === "./focus-run") return runModule;
        throw new Error(`Unexpected import: ${name}`);
      },
    });
    const tree = exports.TestTimer!({
      taskId: "task-1",
      userId: "owner",
      minutes: 5,
      autoBreak: true,
      exitRef,
      onRecord: (record: (typeof records)[number]) => records.push(record),
      onExit: () => {
        exited = true;
      },
      onCompleteTask: () => {},
    });
    const cleanups = effects.map((effect) => effect());
    timeoutCallbacks.forEach((callback) => callback());
    assert.equal(readActiveFocus("owner", storage)?.phase, "focus");
    now += 300_000;
    intervalCallbacks.forEach((callback) => callback());
    assert.equal(records.length, 1);
    assert.equal(records[0].completed, true);
    assert.equal(records[0].durationSeconds, 300);
    assert.equal(readActiveFocus("owner", storage)?.phase, "shortBreak");
    const descendants: Element[] = [];
    const walk = (item: unknown) => {
      if (Array.isArray(item)) {
        item.forEach(walk);
        return;
      }
      if (item && typeof item === "object" && "props" in item) {
        const element = item as Element;
        descendants.push(element);
        walk(element.props.children);
      }
    };
    walk(tree);
    descendants.find((element) => element.type === "input" && element.props.type === "checkbox")!
      .props.onChange!({ target: { checked: true } });
    now += 300_000;
    intervalCallbacks.forEach((callback) => callback());
    assert.equal(records.length, 1);
    assert.equal(readActiveFocus("owner", storage)?.phase, "focus");
    now += 30_000;
    exitRef.current!();
    assert.equal(exited, true);
    assert.equal(records.length, 2);
    assert.notEqual(records[0].id, records[1].id);
    assert.equal(records[1].durationSeconds, 30);
    assert.equal(records[1].completed, false);
    assert.equal(readActiveFocus("owner", storage), null);
    cleanups.forEach((cleanup) => {
      if (typeof cleanup === "function") cleanup();
    });
    assert.equal(records.length, 2);
  } finally {
    Date.now = originalNow;
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
