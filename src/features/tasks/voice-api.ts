import type { VoiceParsed } from "@/types/voice";

/** 转写/解析的客户端封装：错误折成 message 代号（not_configured 等），由调用方映射 toast。 */

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
    throw new Error("asr_failed");
  }
  if (response.status === 503) throw new Error("not_configured");
  if (response.status === 429) throw new Error("rate_limited");
  if (!response.ok) throw new Error("asr_failed");
  const data = (await response.json()) as { transcript?: string };
  return (data.transcript ?? "").trim();
}

export async function parseTranscript(
  transcript: string,
  locale: string,
  signal?: AbortSignal,
): Promise<VoiceParsed> {
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
    throw new Error("parse_failed");
  }
  if (response.status === 503) throw new Error("not_configured");
  if (response.status === 429) throw new Error("rate_limited");
  if (!response.ok) throw new Error("parse_failed");
  const data = (await response.json()) as { parsed?: VoiceParsed };
  if (!data.parsed) throw new Error("parse_failed");
  return data.parsed;
}
