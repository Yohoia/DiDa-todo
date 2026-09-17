import type { VoiceParsed } from "../../types/voice.ts";

/** 转写/解析的客户端封装：错误折成 message 代号（not_configured 等），由调用方映射 toast。 */

/** 把响应里的 detail 字段（服务端诊断信息）挂到 Error 上，浏览器控制台可见。 */
async function upstreamError(response: Response, code: string): Promise<Error> {
  let detail = "";
  try {
    detail = String((await response.json())?.detail ?? "");
  } catch {
    detail = "";
  }
  const error = new Error(code) as Error & { detail?: string };
  if (detail) error.detail = detail;
  return error;
}

export async function transcribeAudio(
  blob: Blob,
  locale: string,
  signal?: AbortSignal,
): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "capture.wav");
  form.append("locale", locale);
  let response: Response;
  try {
    response = await fetch("/api/voice/transcribe", { method: "POST", body: form, signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(error instanceof TypeError ? "network_failed" : "asr_failed");
  }
  if (response.status === 401) throw new Error("auth_required");
  if (response.status === 403) throw new Error("auth_required");
  if (response.status === 503) throw new Error("not_configured");
  if (response.status === 429) throw new Error("rate_limited");
  if (response.status === 504) throw new Error("asr_timeout");
  if (response.status === 400) throw await upstreamError(response, "audio_invalid");
  if (!response.ok) throw await upstreamError(response, "asr_upstream_failed");
  const data = (await response.json()) as { transcript?: string };
  return (data.transcript ?? "").trim();
}

export async function parseTranscript(
  transcript: string,
  locale: string,
  signal?: AbortSignal,
): Promise<VoiceParsed[]> {
  let response: Response;
  try {
    response = await fetch("/api/voice/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, locale }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(error instanceof TypeError ? "network_failed" : "parse_failed");
  }
  if (response.status === 401) throw new Error("auth_required");
  if (response.status === 503) throw new Error("not_configured");
  if (response.status === 429) throw new Error("rate_limited");
  if (!response.ok) throw new Error("parse_failed");
  const data = (await response.json()) as { parsed?: unknown };
  if (!Array.isArray(data.parsed)) throw new Error("parse_failed");
  return data.parsed as VoiceParsed[];
}
