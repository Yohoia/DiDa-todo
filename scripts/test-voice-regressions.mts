import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_RECORD_SECONDS,
  SILENCE_AUTO_STOP_SECONDS,
  nextSilenceSeconds,
} from "../src/lib/audio/wav-recorder.ts";
import { parseTranscript, transcribeAudio } from "../src/features/tasks/voice-api.ts";

type Fetch = typeof globalThis.fetch;
const originalFetch = globalThis.fetch;

function mockFetch(handler: (input: string, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init)) as Fetch;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("silence auto-stop accumulates then resets on speech", () => {
  assert.equal(SILENCE_AUTO_STOP_SECONDS, 4);
  assert.equal(MAX_RECORD_SECONDS, 60);
  let silent = 0;
  for (let index = 0; index < 40; index++) silent = nextSilenceSeconds(silent, 0.1, 0);
  assert.ok(silent + 0.1 >= SILENCE_AUTO_STOP_SECONDS);
  assert.equal(nextSilenceSeconds(silent, 0.1, 0.1), 0);
});

test("transcribe maps the browser-to-upstream error matrix", async () => {
  const blob = new Blob([new Uint8Array(44)]);
  const cases: { status: number; body?: unknown; code: string; detail?: string }[] = [
    {
      status: 400,
      body: { error: "audio_invalid", detail: "bad-wav" },
      code: "audio_invalid",
      detail: "bad-wav",
    },
    { status: 401, body: { error: "authentication_required" }, code: "auth_required" },
    { status: 403, body: { error: "forbidden" }, code: "auth_required" },
    { status: 429, body: { error: "rate_limited" }, code: "rate_limited" },
    { status: 503, body: { error: "not_configured" }, code: "not_configured" },
    { status: 504, body: { error: "asr_timeout" }, code: "asr_timeout" },
    {
      status: 502,
      body: { error: "asr_failed", detail: "upstream_401" },
      code: "asr_upstream_failed",
      detail: "upstream_401",
    },
  ];
  for (const item of cases) {
    mockFetch(async () => jsonResponse(item.status, item.body));
    await assert.rejects(transcribeAudio(blob, "zh-CN"), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, item.code);
      assert.equal((error as Error & { detail?: string }).detail, item.detail);
      return true;
    });
  }

  mockFetch(async () => {
    throw new TypeError("network unreachable");
  });
  await assert.rejects(transcribeAudio(blob, "zh-CN"), /network_failed/);
  globalThis.fetch = originalFetch;
});

test("parse failures distinguish network from service state", async () => {
  mockFetch(async () => jsonResponse(503, { error: "not_configured" }));
  await assert.rejects(parseTranscript("hello", "zh-CN"), /not_configured/);

  mockFetch(async () => {
    throw new TypeError("offline");
  });
  await assert.rejects(parseTranscript("hello", "zh-CN"), /network_failed/);
  globalThis.fetch = originalFetch;
});
