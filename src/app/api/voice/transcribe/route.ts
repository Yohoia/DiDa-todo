/**
 * 语音转写：接收前端编码的 WAV（16k/mono，base64 后直传百炼），
 * 调 qwen-audio-3.0-asr-flash（DashScope 原生 multimodal-generation 协议）
 * 返回 { transcript }。
 *
 * 隐私：音频与转写文本即传即弃——不落盘、不写日志。
 * 防护：类型/大小/时长白名单；未配置 key 时明确返回 not_configured。
 */

import { guardVoiceRequest } from "@/lib/server/voice-request-guard";

const MAX_BYTES = 12 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_BYTES + 64 * 1024;
const MAX_SECONDS = 61; // 客户端按 60s 截断，留 1s 舍入余量

type WavInfo = { byteRate: number; dataBytes: number };

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
  const baseUrl = process.env.VOICE_ASR_BASE_URL ?? "https://dashscope.aliyuncs.com";
  const model = process.env.VOICE_ASR_MODEL ?? "qwen-audio-3.0-asr-flash";

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/api/v1/services/aigc/multimodal-generation/generation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-SSE": "disable",
      },
      body: JSON.stringify({
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
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return Response.json({ error: "asr_failed" }, { status: 504 });
  }

  if (!upstream.ok) {
    return Response.json({ error: "asr_failed" }, { status: 502 });
  }
  // 原生协议返回 output.text（实测响应还内嵌了一层 output.output.text，做防御性取值）
  const payload = (await upstream.json()) as {
    output?: { text?: unknown; output?: { text?: unknown } };
  };
  const text = payload.output?.text ?? payload.output?.output?.text;
  const transcript = typeof text === "string" ? text.trim() : "";
  return Response.json({ transcript }, { headers: { "Cache-Control": "no-store" } });
}
