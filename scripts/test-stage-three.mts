import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";

function compileServerModule(filename: string) {
  return ts.transpileModule(readFileSync(new URL(`../${filename}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
}

test("account export pages only owned feature tables and excludes credentials", async () => {
  const exports: {
    buildAccountExport?: typeof import("../src/features/account/account-export-service.ts").buildAccountExport;
  } = {};
  const tables = new Set([
    "profiles",
    "user_preferences",
    "tasks",
    "subtasks",
    "notifications",
    "focus_sessions",
    "voice_captures",
    "voice_hotwords",
    "growth_events",
    "growth_plants",
  ]);
  const requestedTables: string[] = [];
  const client = {
    from(table: string) {
      requestedTables.push(table);
      return {
        select() {
          return this;
        },
        order() {
          return this;
        },
        range: async () => ({
          data:
            table === "tasks" ? [{ id: "task-1", user_id: "owner", title: "Private task" }] : [],
          error: null,
        }),
      };
    },
  };

  vm.runInNewContext(compileServerModule("src/features/account/account-export-service.ts"), {
    exports,
    require: (id: string) => {
      if (id === "server-only") return {};
      throw new Error(`unexpected import ${id}`);
    },
  });
  const payload = await exports.buildAccountExport!(client as never, {
    id: "owner",
    email: "owner@example.test",
  });

  assert.deepEqual(requestedTables, [...tables]);
  assert.deepEqual(
    Object.keys(payload).sort(),
    [
      "account",
      "credentialsExcluded",
      "exportedAt",
      "formatVersion",
      ...[...tables].map((table) => {
        if (table === "profiles") return "profile";
        if (table === "user_preferences") return "preferences";
        if (table === "voice_captures") return "voiceCaptures";
        if (table === "voice_hotwords") return "voiceHotwords";
        if (table === "focus_sessions") return "focusSessions";
        if (table === "growth_events") return "growthEvents";
        if (table === "growth_plants") return "growthPlants";
        return table;
      }),
    ].sort(),
  );
  assert.equal(payload.credentialsExcluded, true);
  assert.equal(payload.account.email, "owner@example.test");
  assert.equal(
    JSON.stringify(payload.tasks),
    JSON.stringify([{ id: "task-1", user_id: "owner", title: "Private task" }]),
  );
});

test("account deletion audits outcomes and marks failed deletes", async () => {
  const source = compileServerModule("src/features/account/account-deletion-service.ts");
  const exports: {
    accountDeletionConfigured?: () => boolean;
    deleteOwnAccount?: (userId: string) => Promise<void>;
  } = {};
  const originalEnv = { ...process.env };
  let deleteResult = { error: null };
  const auditUpdates: { status: string; completed_at?: string }[] = [];
  const auditRows = [{ id: "audit-1" }];
  vm.runInNewContext(source, {
    exports,
    process,
    require: (id: string) => {
      if (id === "server-only") return {};
      if (id !== "@supabase/supabase-js") throw new Error(`unexpected import ${id}`);
      return {
        createClient: () => ({
          from(table: string) {
            assert.equal(table, "account_deletion_audits");
            return {
              insert() {
                return this;
              },
              select() {
                return this;
              },
              single: async () => ({ data: auditRows[0], error: null }),
              update(patch: { status: string; completed_at?: string }) {
                auditUpdates.push(patch);
                return this;
              },
              eq() {
                return this;
              },
            };
          },
          auth: {
            admin: {
              deleteUser: async () => deleteResult,
            },
          },
        }),
      };
    },
  });

  try {
    process.env.SUPABASE_URL = "https://unit.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "unit-test-key";
    assert.equal(exports.accountDeletionConfigured!(), true);
    await exports.deleteOwnAccount!("owner");
    assert.equal(deleteResult.error, null);
    assert.deepEqual(
      auditUpdates.map((item) => item.status),
      ["completed"],
    );

    auditUpdates.length = 0;
    deleteResult = { error: { message: "auth unavailable" } };
    await assert.rejects(exports.deleteOwnAccount!("owner"), /delete_failed/);
    assert.equal(auditUpdates[0]?.status, "failed");
    assert.ok(auditUpdates[0]?.completed_at);
  } finally {
    process.env = originalEnv;
  }
});

test("actual PostgreSQL stage-three rules protect account, growth, insights, and voice data", async (t) => {
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
    const deleted = "33333333-3333-4333-8333-333333333333";
    await db.query(
      "insert into auth.users(id,email) values ($1,'owner@example.test'),($2,'foreign@example.test'),($3,'deleted@example.test')",
      [owner, foreign, deleted],
    );
    await db.exec(`grant usage on schema public,auth to authenticated;
      grant select,insert,update,delete on public.profiles,public.user_preferences,public.tasks,public.subtasks,public.notifications,public.focus_sessions,public.voice_captures,public.voice_hotwords to authenticated;`);

    await db.query("insert into account_deletion_audits(user_id,status) values ($1,'requested')", [
      deleted,
    ]);
    await db.query(
      "insert into tasks(user_id,title,list,completed,completed_at) values ($1,'Deleted','Life',true,now())",
      [deleted],
    );

    await db.exec("set role authenticated;");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);

    await t.test("timezone preference validation accepts IANA names only", async () => {
      await db.query(
        "update user_preferences set time_zone='America/New_York',hour_12=true where user_id=$1",
        [owner],
      );
      const saved = await db.query<{ time_zone: string; hour_12: boolean }>(
        "select time_zone,hour_12 from user_preferences where user_id=$1",
        [owner],
      );
      assert.equal(saved.rows[0]?.time_zone, "America/New_York");
      assert.equal(saved.rows[0]?.hour_12, true);
      await assert.rejects(
        db.query("update user_preferences set time_zone='Not/ACity' where user_id=$1", [owner]),
        /invalid time zone/,
      );
    });

    await t.test("focus statistics use the requested calendar month boundary", async () => {
      const edge = await db.query<{ edge: string }>(
        `select ((date_trunc('month',(now() at time zone 'Pacific/Kiritimati')::date)
          at time zone 'Pacific/Kiritimati')::timestamptz + interval '1 hour')::text as edge`,
      );
      const at = edge.rows[0]!.edge;
      await db.query(
        "update user_preferences set time_zone='Pacific/Kiritimati',pomodoro_duration=30,daily_focus_goal_minutes=60 where user_id=$1",
        [owner],
      );
      const task = await db.query<{ id: string }>(
        "insert into tasks(user_id,title,list,estimate,completed,completed_at) values ($1,'Insight','Study',2,true,$2) returning id",
        [owner, at],
      );
      await db.query(
        "insert into focus_sessions(user_id,task_id,mode,started_at,ended_at,duration_seconds,completed) values ($1,$2,'focus',$3,$3,600,true)",
        [owner, task.rows[0]!.id, at],
      );
      const kiritimati = await db.query<{ stats: Record<string, number> }>(
        "select get_focus_stats('Pacific/Kiritimati') as stats",
      );
      const honolulu = await db.query<{ stats: Record<string, number> }>(
        "select get_focus_stats('Pacific/Honolulu') as stats",
      );
      assert.equal(kiritimati.rows[0]?.stats.completedTasksThisMonth, 1);
      assert.equal(kiritimati.rows[0]?.stats.focusSecondsThisMonth, 600);
      assert.equal(kiritimati.rows[0]?.stats.estimatedSecondsThisMonth, 3600);
      assert.equal(kiritimati.rows[0]?.stats.actualTaskSecondsThisMonth, 600);
      assert.equal(honolulu.rows[0]?.stats.completedTasksThisMonth, 0);
      assert.equal(honolulu.rows[0]?.stats.focusSecondsThisMonth, 0);
    });

    await t.test("growth rewards are permanent, retry-safe, and read-only to clients", async () => {
      await db.query(
        `insert into focus_sessions(user_id,mode,started_at,ended_at,duration_seconds,completed)
        values ($1,'focus',now()-interval '2 hours',now()-interval '1 minute',7201,true)`,
        [owner],
      );
      await db.query("select sync_growth_rewards()");
      await db.query("select sync_growth_rewards()");
      const events = await db.query<{ event_type: string; event_key: string }>(
        "select event_type,event_key from growth_events where user_id=$1 order by event_key",
        [owner],
      );
      const plants = await db.query<{ event_key: string; source_at: string; planted_at: string }>(
        `select p.event_key,e.source_at,p.planted_at
        from growth_plants p join growth_events e on e.user_id=p.user_id and e.event_key=p.event_key
        where p.user_id=$1`,
        [owner],
      );
      assert.deepEqual(events.rows, [
        { event_type: "achievement", event_key: "first-focus" },
        { event_type: "focus_plant", event_key: "focus-block-2" },
      ]);
      assert.equal(plants.rows.length, 1);
      assert.equal(plants.rows[0]?.planted_at.getTime(), plants.rows[0]?.source_at.getTime());
      await assert.rejects(
        db.query(
          "insert into growth_events(user_id,event_type,event_key) values ($1,'achievement','forged')",
          [owner],
        ),
        /permission denied/,
      );
    });

    await t.test(
      "notification dedupe survives concurrent retries and retention bounds",
      async () => {
        const task = await db.query<{ id: string }>(
          "insert into tasks(user_id,title,list) values ($1,'Reminder','Work') returning id",
          [owner],
        );
        const firstRemindAt = "2026-09-17T01:55:00.000Z";
        const rescheduledRemindAt = "2026-09-18T01:55:00.000Z";
        await db.query(
          "insert into notifications(user_id,type,task_id,dedupe_key,title,remind_at) values ($1,'task_due',$2,$3,'Due',$4)",
          [owner, task.rows[0]!.id, `task:${task.rows[0]!.id}:${firstRemindAt}`, firstRemindAt],
        );
        await assert.rejects(
          db.query(
            "insert into notifications(user_id,type,task_id,dedupe_key,title,remind_at) values ($1,'task_due',$2,$3,'Due',$4)",
            [owner, task.rows[0]!.id, `task:${task.rows[0]!.id}:${firstRemindAt}`, firstRemindAt],
          ),
          /duplicate key|unique constraint/,
        );
        await db.query(
          "insert into notifications(user_id,type,task_id,dedupe_key,title,remind_at) values ($1,'task_due',$2,$3,'Rescheduled',$4)",
          [
            owner,
            task.rows[0]!.id,
            `task:${task.rows[0]!.id}:${rescheduledRemindAt}`,
            rescheduledRemindAt,
          ],
        );
        assert.equal(
          (await db.query("select id from notifications where task_id=$1", [task.rows[0]!.id])).rows
            .length,
          2,
        );
        await assert.rejects(
          db.query("update user_preferences set notification_retention_days=0 where user_id=$1", [
            owner,
          ]),
          /notification_retention_days/,
        );
        await db.query(
          "update user_preferences set notification_retention_days=30 where user_id=$1",
          [owner],
        );
      },
    );

    await t.test("voice history and hotwords remain isolated to their owner", async () => {
      const capture = await db.query<{ id: string }>(
        "insert into voice_captures(user_id,transcript,parsed,task_count,duration_seconds) values ($1,'Buy milk','{}'::jsonb,1,3) returning id",
        [owner],
      );
      await db.query("insert into voice_hotwords(user_id,word,weight) values ($1,'standup',5)", [
        owner,
      ]);
      assert.equal((await db.query("select * from voice_captures")).rows.length, 1);
      assert.equal((await db.query("select * from voice_hotwords")).rows.length, 1);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [foreign]);
      assert.equal(
        (await db.query("select * from voice_captures where id=$1", [capture.rows[0]!.id])).rows
          .length,
        0,
      );
      assert.equal(
        (await db.query("delete from voice_captures where id=$1", [capture.rows[0]!.id])).rowCount,
        0,
      );
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
      await assert.rejects(
        db.query("insert into voice_hotwords(user_id,word) values ($1,'foreign')", [foreign]),
        /row-level security/,
      );
    });

    await t.test(
      "deletion audits are private and business data cascades with the user",
      async () => {
        await assert.rejects(
          db.query("select * from account_deletion_audits"),
          /permission denied/,
        );
        await db.exec("reset role;");
        await db.query("delete from auth.users where id=$1", [deleted]);
        assert.equal(
          (await db.query("select id from tasks where user_id=$1", [deleted])).rows.length,
          0,
        );
        assert.equal(
          (await db.query("select user_id from user_preferences where user_id=$1", [deleted])).rows
            .length,
          0,
        );
        const audit = await db.query<{ user_id: string; status: string }>(
          "select user_id,status from account_deletion_audits where user_id=$1",
          [deleted],
        );
        assert.deepEqual(audit.rows, [{ user_id: deleted, status: "requested" }]);
      },
    );
  } finally {
    await db.close();
  }
});
