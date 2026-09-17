"use client";

import { useI18n } from "@/features/preferences/preferences-provider";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { HiCheck, HiXMark } from "react-icons/hi2";
import { cn, createId } from "@/lib/utils";
import { MAX_RECORD_SECONDS, WavRecorder } from "@/lib/audio/wav-recorder";
import { getDemoDate } from "@/lib/date-utils";
import { useWorkspace } from "./workspace-provider";
import { parseTranscript, transcribeAudio } from "./voice-api";
import type { VoiceCaptureState, VoiceParsed } from "@/types/voice";
import styles from "./voice-capture.module.css";

/** 演示模式（URL 带 ?voice-demo）：跳过设备检测与真实录音，用固定语料预览完整流程。 */
export function isVoiceDemo(): boolean {
  return (
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("voice-demo")
  );
}

const DEMO_TRANSCRIPT = "明天下午三点提醒我交房租，后天上午去超市买牛奶和鸡蛋";

/**
 * 语音待办流程：录音（WavRecorder）→ 上传转写 → LLM 解析 → 确认卡。
 * busyRef 挡住按钮/键盘/60s 定时器的重复提交；收尾动作返回给胶囊上的按钮。
 */
export function useVoiceCapture() {
  const { locale } = useI18n();
  const {
    voiceCapture,
    setVoiceCapture,
    saveCapturedTasks,
    setQuickAdd,
    notify,
    recordVoiceCapture,
  } = useWorkspace();
  const recorderRef = useRef<WavRecorder | null>(null);
  const busyRef = useRef(false);
  const startingRef = useRef(false);
  const flowRef = useRef(0);
  const requestRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationSecondsRef = useRef<number | undefined>(undefined);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      flowRef.current += 1;
      requestRef.current?.abort();
      recorderRef.current?.abort();
    };
  }, []);

  // 录满 60s 自动走确认，与服务端时长上限对齐
  useEffect(() => {
    if (voiceCapture?.phase !== "recording" || isVoiceDemo()) return;
    timerRef.current = setTimeout(() => void confirmVoice(), MAX_RECORD_SECONDS * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只随录音态起停定时器
  }, [voiceCapture?.phase]);

  /** 麦克风点击入口：prewarm 必须在手势同步段（iOS AudioContext 限制），其余放异步。 */
  function startVoice() {
    if (voiceCapture || startingRef.current || busyRef.current) return;
    const flow = ++flowRef.current;
    startingRef.current = true;
    durationSecondsRef.current = undefined;
    setAudioLevel(0);
    recorderRef.current ??= new WavRecorder();
    // demo 模式不采集音频，跳过 prewarm 以免白开一个 AudioContext 悬挂着
    if (!isVoiceDemo()) recorderRef.current.prewarm();
    setVoiceCapture({ phase: "recording", list: "Inbox", transcript: "", parsed: [] });
    void beginCapture(flow);
  }

  async function beginCapture(flow: number) {
    try {
      if (!isVoiceDemo() && navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (flow !== flowRef.current) return;
        if (!devices.some((device) => device.kind === "audioinput")) {
          notify({ key: "未检测到麦克风" });
          recorderRef.current?.abort();
          setVoiceCapture(null);
          return;
        }
      }
      if (isVoiceDemo()) return;
      const started = await recorderRef.current?.start(setAudioLevel);
      if (flow !== flowRef.current) return;
      if (!started) {
        recorderRef.current?.abort();
        setVoiceCapture(null);
      }
    } catch {
      if (flow !== flowRef.current) return;
      notify({ key: "无法访问麦克风" });
      recorderRef.current?.abort();
      setVoiceCapture(null);
    } finally {
      if (flow === flowRef.current) startingRef.current = false;
    }
  }

  /** ✓：停录 → 上传转写 → 解析 → confirming；转写失败是唯一致命路径（无文本可确认）。 */
  async function confirmVoice() {
    const state = voiceCapture;
    if (busyRef.current || !state || state.phase !== "recording") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const flow = flowRef.current;
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    busyRef.current = true;
    setAudioLevel(0);
    setVoiceCapture({ ...state, phase: "thinking" });

    let transcript = "";
    let parsed: VoiceParsed[] | null = null;
    if (isVoiceDemo()) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      if (flow !== flowRef.current) return;
      transcript = DEMO_TRANSCRIPT;
      parsed = [
        {
          isTodo: true,
          title: "交房租",
          list: "Life",
          date: getDemoDate(1),
          time: "15:00",
          reason: "",
        },
        {
          isTodo: true,
          title: "去超市买牛奶和鸡蛋",
          list: "Life",
          date: getDemoDate(2),
          time: null,
          reason: "",
        },
      ];
    } else {
      let blob: Blob | null = null;
      try {
        blob = (await recorderRef.current?.stop()) ?? null;
      } catch {
        blob = null;
      }
      if (!blob) {
        // 过短或采集失败：没有可用音频，直接收回
        notify({ key: "没有听清，请再试一次" });
        requestRef.current = null;
        setVoiceCapture(null);
        busyRef.current = false;
        return;
      }
      // 16 kHz / 16-bit / mono PCM：减去 WAV 头后可由字节数准确推算录音时长。
      durationSecondsRef.current = Math.max(1, Math.round(Math.max(0, blob.size - 44) / 32000));
      try {
        transcript = await transcribeAudio(blob, locale, controller.signal);
      } catch (error) {
        if (controller.signal.aborted || flow !== flowRef.current) return;
        const code = error instanceof Error ? error.message : "";
        // 服务端诊断信息（如 upstream_401_invalid_api_key）打到控制台，方便线上排障
        const detail = (error as Error & { detail?: string }).detail;
        if (detail) console.warn(`[voice] transcribe failed: ${code} (${detail})`);
        notify({
          key:
            code === "auth_required"
              ? "请先登录后再使用语音输入"
              : code === "not_configured"
                ? "语音服务未配置"
                : code === "rate_limited"
                  ? "尝试太频繁，请稍后再试"
                  : code === "asr_timeout"
                    ? "识别超时，请再试一次"
                    : "识别失败，请重试",
        });
        requestRef.current = null;
        setVoiceCapture(null);
        busyRef.current = false;
        return;
      }
      if (flow !== flowRef.current) return;
      if (!transcript) {
        notify({ key: "没有听清，请再试一次" });
        requestRef.current = null;
        setVoiceCapture(null);
        busyRef.current = false;
        return;
      }
      // 解析失败（网络/未配置/超时）降级：原文 + 兜底清单进确认卡，仍可编辑
      try {
        parsed = await parseTranscript(transcript, locale, controller.signal);
      } catch {
        if (controller.signal.aborted || flow !== flowRef.current) return;
        parsed = null;
      }
      if (flow !== flowRef.current) return;
      parsed ??= [
        {
          isTodo: true,
          title: transcript,
          list: state.list,
          date: null,
          time: null,
          reason: "",
          degraded: true,
        },
      ];
    }
    setVoiceCapture({
      ...state,
      phase: "confirming",
      transcript,
      parsed: parsed.map((item) => ({ ...item, captureId: createId(), selected: true })),
    });
    busyRef.current = false;
    requestRef.current = null;
  }

  /** × / Esc：丢弃录音或确认卡，释放设备并收回导航栏。 */
  function cancelVoice() {
    if (busyRef.current && voiceCapture?.phase === "confirming") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    flowRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    busyRef.current = false;
    startingRef.current = false;
    recorderRef.current?.abort();
    durationSecondsRef.current = undefined;
    setAudioLevel(0);
    setVoiceCapture(null);
  }

  /** ✓ 添加：只保存勾选的条目，成功项移出草稿，失败项使用原 ID 重试。 */
  async function addConfirmed(items: VoiceParsed[]) {
    const state = voiceCapture;
    if (!state || !items.length || busyRef.current) return;
    busyRef.current = true;
    setVoiceCapture({ ...state, saving: true });
    try {
      const result = await saveCapturedTasks(
        items.map((item) => ({
          id: item.captureId ?? createId(),
          title: item.title ?? state.transcript,
          list: item.list ?? state.list,
          date: item.date ?? "",
          time: item.time ?? undefined,
        })),
      );
      const saved = items.filter(
        (item) => item.captureId && result.savedIds.includes(item.captureId),
      );
      // 登录态留档原文与解析结果（voice_captures），失败静默不影响添加
      if (saved.length)
        recordVoiceCapture({
          transcript: state.transcript,
          parsed: saved,
          taskCount: saved.length,
          durationSeconds: durationSecondsRef.current,
        });
      if (!result.failedIds.length) {
        durationSecondsRef.current = undefined;
        setVoiceCapture(null);
      } else
        setVoiceCapture({
          ...state,
          saving: false,
          parsed: state.parsed.filter(
            (item) => !item.captureId || !result.savedIds.includes(item.captureId),
          ),
        });
    } catch {
      setVoiceCapture({ ...state, saving: false });
      notify({ key: "sync.failed" });
    } finally {
      busyRef.current = false;
    }
  }

  /** 编辑：将已勾选的单条或多条解析结果交给共用确认列表。 */
  function editConfirmed(items: VoiceParsed[]) {
    const state = voiceCapture;
    if (!state || busyRef.current) return;
    setQuickAdd({
      list: state.list,
      captures: items.map((item) => ({
        id: item.captureId ?? createId(),
        title: item.title ?? state.transcript,
        list: item.list ?? state.list,
        date: item.date ?? "",
        time: item.time ?? undefined,
      })),
      sourceVoice: { transcript: state.transcript, durationSeconds: durationSecondsRef.current },
    });
    setVoiceCapture(null);
  }

  return { startVoice, confirmVoice, cancelVoice, addConfirmed, editConfirmed, audioLevel };
}

/** 13 根白色圆头竖条：响度为零时收拢，有真实声音时按麦克风电平展开。 */
const BAR_HEIGHTS = [10, 14, 18, 22, 26, 29, 31, 29, 26, 22, 18, 14, 10];

/** 听写胶囊内容：左 × 取消 / 中间随阶段切换（声纹→思考点→转写文本）/ 右 ✓ 主操作。
    常驻挂载、绝对定位不占流，每阶段渲染后回报自然尺寸，供导航栏做真实宽高动画。 */
export function VoiceCaptureBar({
  state,
  onPrimary,
  onCancel,
  onMeasure,
  audioLevel,
}: {
  state: VoiceCaptureState | null;
  onPrimary: () => void;
  onCancel: () => void;
  onMeasure: (width: number, height: number) => void;
  audioLevel: number;
}) {
  const { t } = useI18n();
  const barRef = useRef<HTMLDivElement>(null);
  const active = state !== null;
  const phase = state?.phase ?? "recording";

  useEffect(() => {
    // 进入语音态把焦点收到胶囊上：Esc 取消 / Enter 主操作可纯键盘完成
    if (active) barRef.current?.focus();
  }, [active]);

  useEffect(() => {
    const el = barRef.current;
    if (el && active) onMeasure(el.offsetWidth, el.offsetHeight);
  }, [active, phase, state?.transcript, onMeasure]);

  return (
    <motion.div
      ref={barRef}
      className={cn(styles.bar, !active && styles.idle)}
      role={active ? "status" : undefined}
      aria-label={active ? t(ariaKeyFor(phase)) : undefined}
      inert={!active}
      tabIndex={-1}
      initial={false}
      animate={
        active
          ? {
              opacity: 1,
              scale: 1,
              y: 0,
              /* 吸入完成后才弹现"点亮"，带一点过冲像黑洞激活 */
              transition: { type: "spring", stiffness: 280, damping: 18, delay: 0.35 },
            }
          : {
              opacity: 0,
              scale: 0.7,
              y: 8,
              transition: { duration: 0.13, ease: "easeIn" },
            }
      }
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        } else if (event.key === "Enter" && event.target === event.currentTarget) {
          event.preventDefault();
          if (phase !== "thinking" && !state?.saving) onPrimary();
        }
      }}
    >
      <button
        type="button"
        className={styles.side}
        aria-label={t("取消")}
        disabled={state?.saving}
        onClick={onCancel}
      >
        <HiXMark size={15} aria-hidden="true" />
      </button>
      {phase === "recording" && (
        <span className={styles.waves} aria-hidden="true">
          {BAR_HEIGHTS.map((height, index) => (
            <i
              key={index}
              className={styles.wave}
              style={{ height: `${waveHeight(height, index, audioLevel)}px` }}
            />
          ))}
        </span>
      )}
      {phase === "thinking" && (
        <span className={styles.dots} aria-hidden="true">
          <i className={styles.dot} />
          <i className={styles.dot} />
          <i className={styles.dot} />
        </span>
      )}
      {phase === "confirming" && state && <p className={styles.script}>{state.transcript}</p>}
      <button
        type="button"
        className={cn(styles.side, styles.confirm)}
        aria-label={t("完成语音输入")}
        disabled={phase === "thinking" || state?.saving}
        onClick={onPrimary}
      >
        <HiCheck size={15} aria-hidden="true" />
      </button>
    </motion.div>
  );
}

function waveHeight(maxHeight: number, index: number, level: number) {
  const restingHeight = 5 + (maxHeight / 31) * 3;
  const sensitivity = 0.8 + (1 - Math.abs(index - 6) / 6) * 0.2;
  const audibleLevel = Math.max(0, Math.min(1, level * sensitivity));
  return Math.round((restingHeight + (maxHeight - restingHeight) * audibleLevel) * 10) / 10;
}

function ariaKeyFor(phase: VoiceCaptureState["phase"]) {
  if (phase === "recording") return "正在聆听…";
  if (phase === "thinking") return "正在识别…";
  return "已识别，按回车添加";
}
