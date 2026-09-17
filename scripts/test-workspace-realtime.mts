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

function source() {
  const channels: FakeChannel[] = [];
  const client = {
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
  return { channels, client };
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

test("realtime subscribes to owner-only workspace tables and coalesces refresh signals", async () => {
  const { channels, client } = source();
  const statuses: string[] = [];
  let refreshes = 0;
  const realtime = createWorkspaceRealtime({
    getClient: () => client,
    userId: "user-1",
    onStatus: (status) => statuses.push(status),
    requestRefresh: () => {
      refreshes++;
    },
    refreshDebounceMs: 20,
  });
  const channel = channels[0];
  assert.deepEqual(channel.options, {
    config: { private: true, postgres_changes_options: { wait: true } },
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
  const { channels, client } = source();
  const statuses: string[] = [];
  const errors: unknown[] = [];
  const realtime = createWorkspaceRealtime({
    getClient: () => client,
    userId: "user-1",
    onStatus: (status) => statuses.push(status),
    requestRefresh: () => {},
    onError: (error) => errors.push(error),
    retryDelaysMs: [10, 30],
  });
  const first = channels[0];
  first.subscribeCallback!("CHANNEL_ERROR", new Error("socket closed"));
  assert.equal(first.removed, true);
  await wait(15);
  assert.equal(channels.length, 2);
  const second = channels[1];
  second.subscribeCallback!("TIMED_OUT");
  assert.equal(second.removed, true);
  await wait(35);
  const third = channels[2];
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
