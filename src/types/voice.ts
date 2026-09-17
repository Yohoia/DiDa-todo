import type { TaskList } from "./task";

/** /api/voice/parse 的结构化产物（zod 校验通过或降级生成）。 */
export type VoiceParsed = {
  isTodo: boolean;
  title: string | null;
  list: TaskList | null;
  /** YYYY-MM-DD */
  date: string | null;
  /** HH:MM（24 小时制） */
  time: string | null;
  /** ≤20 字判定依据，isTodo:false 时在确认卡展示 */
  reason: string;
  /** LLM 两次解析均未过校验、以原文降级时的标记 */
  degraded?: boolean;
  captureId?: string; // stable client ID used for confirmed-save retries
  selected?: boolean;
};

/** 听写胶囊的阶段：录音 → 识别/解析（UI 合并为"思考中"）→ 确认卡。 */
export type VoicePhase = "recording" | "thinking" | "confirming";

/** 导航栏变形为语音胶囊期间的完整状态。 */
export type VoiceCaptureState = {
  phase: VoicePhase;
  saving?: boolean;
  /** 兜底落点清单（解析结果优先生效） */
  list: TaskList;
  transcript: string;
  /** 一段语音可拆出多条（≤8）；空数组 = 整段都不像待办 */
  parsed: VoiceParsed[];
};
