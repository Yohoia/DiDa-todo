import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceRealtime } from "../src/features/tasks/workspace-realtime.ts";

type SubscribeCallback = (status: string, error?: Error) => void;
type FakeChannel = {
  name: string;
  options: unknown;
  events: { filter: Record<string, unknown>; callback: () => void }[];
  subscribeCallback: SubscribeCallback | undefined;
  removed: boolean;
  subscribe(callback: SubscribeCallback): FakeChannel;
  on(type: string, filter: Record<string, unknown>, callback: () => void): FakeChannel;
};

function source(token = "access-token") {
  const channels: FakeChannel[] = [];
  const authTokens: string[] = [];
  const client = {
    realtime: {
      async setAuth(value: string) {
        authTokens.push(value);
      },
    },
    channel(name: string, options: unknown) {
      const channel: FakeChannel = {
        name,
        options,
        events: [],
        subscribeCallback: undefined,
        removed: false,
        subscribe(callback) {
          this.subscribeCallback = callback;
          return this;
        },
        on(_type, filter, callback) {
          this.events.push({ filter, callback });
          return this;
        },
      };
      channels.push(channel);
      return channel;
    },
    async removeChannel(channel: FakeChannel) {
      channel.removed = true;
      return 1;
    },
  };
  return { authTokens, channels, client, token };
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

test("realtime subscribes to owner-only workspace tables and coalesces refresh signals", async () => {
  const { authTokens, channels, client } = source("first-token");
  const statuses: string[] = [];
  let refreshes = 0;
  const realtime = createWorkspaceRealtime({
    getClient: () => client,
    getAccessToken: async () => "first-token",
    userId: "user-1",
    onStatus: (status) => statuses.push(status),
    requestRefresh: () => {
      refreshes++;
    },
    refreshDebounceMs: 20,
  });
  assert.equal(channels.length, 0);
  await wait(0);
  const channel = channels[0];
  assert.deepEqual(authTokens, ["first-token"]);
  assert.deepEqual(channel.options, {
    config: { postgres_changes_options: { wait: true } },
  });
  assert.deepEqual(
    channel.events.map((event) => event.filter.table),
    ["tasks", "subtasks", "user_preferences", "notifications"],
  );
  assert(channel.events.every((event) => event.filter.filter === "user_id=eq.user-1"));

  channel.subscribeCallback!("SUBSCRIBED");
  assert.deepEqual(statuses, ["connecting", "connected"]);
  assert.equal(refreshes, 1);
  for (const event of channel.events) event.callback();
  await wait(30);
  assert.equal(refreshes, 2);

  realtime.stop();
  assert.equal(channel.removed, true);
  assert.deepEqual(statuses.slice(-1), ["offline"]);
  channel.events[0].callback();
  channel.subscribeCallback!("CHANNEL_ERROR");
  await wait(30);
  assert.equal(refreshes, 2);
  assert.equal(channels.length, 1);
});

test("realtime channel failures reconnect with bounded backoff", async () => {
  const { authTokens, channels, client } = source("reconnect-token");
  const statuses: string[] = [];
  const errors: unknown[] = [];
  let token = "reconnect-token";
  const realtime = createWorkspaceRealtime({
    getClient: () => client,
    getAccessToken: async () => token,
    userId: "user-1",
    onStatus: (status) => statuses.push(status),
    requestRefresh: () => {},
    onError: (error) => errors.push(error),
    retryDelaysMs: [10, 30],
  });
  await wait(0);
  const first = channels[0];
  first.subscribeCallback!("CHANNEL_ERROR", new Error("socket closed"));
  assert.equal(first.removed, true);
  await wait(15);
  assert.equal(channels.length, 2);
  const second = channels[1];
  token = "refreshed-token";
  second.subscribeCallback!("TIMED_OUT");
  assert.equal(second.removed, true);
  await wait(35);
  const third = channels[2];
  assert.deepEqual(authTokens, ["reconnect-token", "reconnect-token", "refreshed-token"]);
  third.subscribeCallback!("SUBSCRIBED");
  assert.deepEqual(statuses, [
    "connecting",
    "reconnecting",
    "connecting",
    "reconnecting",
    "connecting",
    "connected",
  ]);
  assert.equal(errors.length, 2);
  realtime.stop();
});

test("realtime channel removal does not re-enter from a synchronous close", async () => {
  const base = source();
  const client = {
    realtime: base.client.realtime,
    channel: base.client.channel.bind(base.client),
    removeChannel(channel: FakeChannel) {
      channel.removed = true;
      channel.subscribeCallback?.("CLOSED");
      return Promise.resolve(1);
    },
  };
  const statuses: string[] = [];
  const realtime = createWorkspaceRealtime({
    getClient: () => client as never,
    getAccessToken: async () => "access-token",
    userId: "user-1",
    onStatus: (status) => statuses.push(status),
    requestRefresh: () => {},
    retryDelaysMs: [10],
  });
  await wait(0);
  const first = base.channels[0];
  first.subscribeCallback!("CHANNEL_ERROR", new Error("unauthorized"));
  await wait(20);
  assert.equal(first.removed, true);
  assert.equal(base.channels.length, 2);
  realtime.stop();
});

test("realtime does not subscribe anonymously and retries token failures", async () => {
  const { authTokens, channels, client } = source("ready-token");
  const statuses: string[] = [];
  const errors: unknown[] = [];
  let token: string | null = null;
  const realtime = createWorkspaceRealtime({
    getClient: () => client,
    getAccessToken: async () => token,
    userId: "user-1",
    onStatus: (status) => statuses.push(status),
    requestRefresh: () => {},
    onError: (error) => errors.push(error),
    retryDelaysMs: [10],
  });

  await wait(5);
  assert.equal(channels.length, 0);
  assert.deepEqual(authTokens, []);
  assert.deepEqual(statuses, ["connecting", "reconnecting"]);
  assert.equal(errors.length, 1);

  token = "ready-token";
  await wait(20);
  assert.equal(channels.length, 1);
  assert.deepEqual(authTokens, ["ready-token"]);
  channels[0].subscribeCallback!("SUBSCRIBED");
  assert.equal(statuses.at(-1), "connected");
  realtime.stop();
});
