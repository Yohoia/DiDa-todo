/**
 * 语音转写：接收前端编码的 WAV（16k/mono，base64 后直传百炼），
 * 调 qwen-audio-3.0-asr-flash（DashScope 原生 multimodal-generation 协议）
 * 返回 { transcript }。
 *
 * 隐私：音频与转写文本即传即弃——不落盘、不写日志。
 * 防护：类型/大小/时长白名单；未配置 key 时明确返回 not_configured。
 */

import { guardVoiceRequest } from "@/lib/server/voice-request-guard";
import { request as httpsRequest } from "node:https";

/** 覆盖未启用 Fluid Compute 时较短的 Vercel 默认时限。 */
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_BYTES + 64 * 1024;
const MAX_SECONDS = 61; // 客户端按 60s 截断，留 1s 舍入余量
const ASR_TIMEOUT_MS = 45_000;

type WavInfo = { byteRate: number; dataBytes: number };
type UpstreamResult = { status: number; body: string };

const MAX_UPSTREAM_RESPONSE_BYTES = 4 * 1024 * 1024;

/** 解析 WAV 头：校验 RIFF/WAVE 与 fmt/data 块，算出时长所需的字节率与数据长度。 */
function inspectWav(bytes: Uint8Array): WavInfo | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 44) return null;
  if (ascii(bytes, 0) !== "RIFF" || ascii(bytes, 8) !== "WAVE") return null;
  let offset = 12;
  let byteRate = 0;
  while (offset + 8 <= bytes.byteLength) {
    const id = ascii(bytes, offset);
    const size = view.getUint32(offset + 4, true);
    if (id === "fmt ") {
      // fmt 块体自 offset+8 起：+12 是 sampleRate，byteRate（时长换算用）在 +16
      byteRate = view.getUint32(offset + 16, true);
    } else if (id === "data") {
      return { byteRate, dataBytes: Math.min(size, bytes.byteLength - offset - 8) };
    }
    offset += 8 + size + (size % 2);
  }
  return null;
}

function ascii(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3],
  );
}

/**
 * 百炼北京共享域名在部分 Vercel 出口上会让 Node fetch/undici 连接超时。
 * 这里使用 Node 原生 HTTPS 并强制 IPv4，避开地址族选择造成的连接失败。
 */
function postJsonOverHttps(url: URL, body: string, apiKey: string): Promise<UpstreamResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let responseBytes = 0;
    const chunks: Buffer[] = [];
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const fail = (error: Error) => finish(() => reject(error));

    const outgoing = httpsRequest(
      url,
      {
        method: "POST",
        family: 4,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "X-DashScope-SSE": "disable",
        },
      },
      (incoming) => {
        incoming.on("data", (chunk: Buffer) => {
          responseBytes += chunk.length;
          if (responseBytes > MAX_UPSTREAM_RESPONSE_BYTES) {
            outgoing.destroy(new Error("upstream_response_too_large"));
            return;
          }
          chunks.push(chunk);
        });
        incoming.on("error", fail);
        incoming.on("end", () => {
          finish(() =>
            resolve({
              status: incoming.statusCode ?? 502,
              body: Buffer.concat(chunks).toString("utf8"),
            }),
          );
        });
      },
    );

    const timer = setTimeout(() => {
      const error = new Error("upstream request timed out");
      error.name = "TimeoutError";
      outgoing.destroy(error);
    }, ASR_TIMEOUT_MS);
    outgoing.on("error", fail);
    outgoing.end(body);
  });
}

/** 接受根域名或误带 /api/v1 的配置，统一生成原生 DashScope 地址。 */
function buildAsrEndpoint(baseUrl: string): URL {
  const endpoint = new URL(baseUrl);
  if (endpoint.protocol !== "https:") throw new Error("asr_endpoint_must_use_https");
  const basePath = endpoint.pathname
    .replace(/\/+$/, "")
    .replace(/\/(?:api|compatible-mode)\/v1$/, "");
  endpoint.pathname = `${basePath}/api/v1/services/aigc/multimodal-generation/generation`;
  endpoint.search = "";
  endpoint.hash = "";
  return endpoint;
}

export async function POST(request: Request) {
  const rejected = guardVoiceRequest(request, {
    scope: "transcribe",
    limit: 8,
    maxBodyBytes: MAX_REQUEST_BYTES,
  });
  if (rejected) return rejected;

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "audio_invalid" }, { status: 400 });
  }
  const file = form.get("audio");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_BYTES) {
    return Response.json({ error: "audio_invalid" }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const info = inspectWav(bytes);
  if (!info || !info.byteRate || info.dataBytes <= 0) {
    return Response.json({ error: "audio_invalid" }, { status: 400 });
  }
  const duration = info.dataBytes / info.byteRate;
  if (duration <= 0 || duration > MAX_SECONDS) {
    return Response.json({ error: "audio_invalid" }, { status: 400 });
  }

  // 语言只传单语种；其他 locale（混合语种）省略让模型自动判断
  const locale = String(form.get("locale") ?? "zh-CN");
  const language = locale.startsWith("zh") ? "zh" : locale.startsWith("en") ? "en" : null;
  // qwen-audio-3.0-asr-flash 走 DashScope 原生 multimodal-generation 协议：
  // format 在 parameters（OpenAI 兼容模式对新模型不支持，实测报 format is empty）
  const baseUrl =
    process.env.VOICE_ASR_BASE_URL ??
    "https://ws-9mlt2qkeiwpfmr0z.ap-southeast-1.maas.aliyuncs.com";
  const model = process.env.VOICE_ASR_MODEL ?? "qwen-audio-3.0-asr-flash";
  const requestBody = JSON.stringify({
    model,
    input: {
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_audio",
              input_audio: {
                data: `data:audio/wav;base64,${Buffer.from(bytes).toString("base64")}`,
              },
            },
          ],
        },
      ],
    },
    parameters: {
      format: "wav",
      sample_rate: "16000",
      // 热词表（替代旧 system 词表用法）：提升清单专名识别
      vocabulary: { Inbox: 1, Work: 1, Study: 1, Life: 1 },
      ...(language ? { language_hints: [language] } : {}),
    },
  });

  let upstream: UpstreamResult;
  try {
    upstream = await postJsonOverHttps(buildAsrEndpoint(baseUrl), requestBody, apiKey);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    // 只记错误元数据（超时/网络异常名），不含音频与转写内容
    console.error(
      `[voice/transcribe] upstream request failed: ${
        timedOut
          ? "timeout"
          : error instanceof Error
            ? `${error.name}: ${error.message}`
            : String(error)
      }`,
    );
    return Response.json(
      {
        error: timedOut ? "asr_timeout" : "asr_failed",
        detail: timedOut ? "timeout" : "unreachable",
      },
      { status: timedOut ? 504 : 502 },
    );
  }

  if (upstream.status < 200 || upstream.status >= 300) {
    if (upstream.status === 408 || upstream.status === 504) {
      return Response.json({ error: "asr_timeout", detail: "upstream_timeout" }, { status: 504 });
    }
    if (upstream.status === 429) {
      return Response.json({ error: "rate_limited" }, { status: 429 });
    }
    // 401/403/400 等上游错误：状态码与错误 code 记入服务端日志与响应 detail，
    // 用于区分 key 无效 / 地域限制 / 参数问题（同样是只记错误元数据）
    const body = upstream.body;
    let upstreamCode = "";
    try {
      upstreamCode = String(JSON.parse(body)?.error?.code ?? "") || "";
    } catch {
      upstreamCode = "";
    }
    console.error(`[voice/transcribe] upstream ${upstream.status}: ${body.slice(0, 300)}`);
    return Response.json(
      {
        error: "asr_failed",
        detail: `upstream_${upstream.status}${upstreamCode ? `_${upstreamCode}` : ""}`,
      },
      { status: 502 },
    );
  }
  // 原生协议返回 output.text（实测响应还内嵌了一层 output.output.text，做防御性取值）
  let payload: { output?: { text?: unknown; output?: { text?: unknown } } };
  try {
    payload = JSON.parse(upstream.body) as typeof payload;
  } catch {
    console.error("[voice/transcribe] upstream returned invalid JSON");
    return Response.json(
      { error: "asr_failed", detail: "upstream_invalid_response" },
      { status: 502 },
    );
  }
  const text = payload.output?.text ?? payload.output?.output?.text;
  const transcript = typeof text === "string" ? text.trim() : "";
  return Response.json({ transcript }, { headers: { "Cache-Control": "no-store" } });
}
