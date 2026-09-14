"use client";

import { useI18n } from "@/features/preferences/preferences-provider";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { HiCheck, HiXMark } from "react-icons/hi2";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./workspace-provider";
import styles from "./voice-capture.module.css";

/** 浏览器 Web Speech API 的最小结构（TS lib 未内置）。 */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionResultLike = {
  resultIndex: number;
  results: { length: number; [index: number]: { [index: number]: { transcript: string } } };
};

export function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/** 演示模式（URL 带 ?voice-demo）：跳过设备检测与真实识别，仅预览听写胶囊样式。 */
export function isVoiceDemo(): boolean {
  return (
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("voice-demo")
  );
}

/**
 * 语音听写引擎：底部导航栏变形为听写胶囊时启动识别；说完（onend）或点 ✓
 * 自动把识别文本落库，点 × 丢弃。收尾动作返回给胶囊上的按钮。
 */
export function useVoiceRecognition() {
  const { locale } = useI18n();
  const { voiceCapture: preset, setVoiceCapture, addTask, notify } = useWorkspace();
  const transcriptRef = useRef("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!preset) return;
    transcriptRef.current = "";
    doneRef.current = false;
    // 演示模式：不接识别引擎，胶囊仅作样式预览（× 可关、✓ 无内容时仅收起）
    if (isVoiceDemo()) return;
    const Recognition = getRecognitionCtor();
    if (!Recognition) {
      // 浏览器不支持语音：提示后直接收起，不留悬挂的听写胶囊
      notify({ key: "语音输入不可用" });
      setVoiceCapture(null);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = locale === "zh-CN" ? "zh-CN" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let text = "";
      for (let index = 0; index < event.results.length; index++) {
        text += event.results[index][0].transcript;
      }
      transcriptRef.current = text.trim();
    };
    recognition.onend = () => finish();
    recognition.onerror = (event) => {
      // 权限/设备类错误给出明确提示；no-speech/aborted 等静默收起
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        notify({ key: "无法访问麦克风" });
      } else if (event.error === "audio-capture") {
        notify({ key: "未检测到麦克风" });
      }
      setVoiceCapture(null);
    };
    recognitionRef.current = recognition;
    recognition.start();
    return () => {
      recognition.onend = null;
      recognition.onerror = null;
      recognitionRef.current = null;
      recognition.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preset 与 locale 变化即重启识别，挂载期语义
  }, [preset]);

  /** 说完（或点确认）：有内容就自动落库，然后收回导航栏；doneRef 挡住双路径重复入库 */
  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    if (preset && transcriptRef.current) {
      addTask(transcriptRef.current, preset.list, preset.date, preset.time || undefined);
    }
    setVoiceCapture(null);
  }
  function confirmVoice() {
    // 摘掉 onend 再手动收尾，避免 stop() 触发的 onend 与按钮路径重复入库
    if (recognitionRef.current) recognitionRef.current.onend = null;
    finish();
  }
  function cancelVoice() {
    if (recognitionRef.current) recognitionRef.current.onend = null;
    doneRef.current = true;
    setVoiceCapture(null);
  }

  return { confirmVoice, cancelVoice };
}

/** 13 根白色圆头竖条：静态高度呈中间高两侧低的纺锤形（参考 Typeless），动画叠加轻微伸缩 */
const BAR_HEIGHTS = [10, 14, 18, 22, 26, 29, 31, 29, 26, 22, 18, 14, 10];

/** 听写胶囊内容：左 × 取消 / 中声纹 / 右 ✓ 完成。常驻挂载，由 active 切换显隐、焦点与键盘操作；
    挂载后回报一次自然内容尺寸，供导航栏做真实宽高动画的目标值。 */
export function VoiceCaptureBar({
  active,
  onConfirm,
  onCancel,
  onMeasure,
}: {
  active: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onMeasure: (width: number, height: number) => void;
}) {
  const { t } = useI18n();
  const barRef = useRef<HTMLDivElement>(null);
  const measuredRef = useRef(false);

  useEffect(() => {
    // 进入语音态把焦点收到胶囊上：Esc 取消 / Enter 确认可纯键盘操作
    if (active) barRef.current?.focus();
  }, [active]);

  useEffect(() => {
    const el = barRef.current;
    if (el && !measuredRef.current) {
      measuredRef.current = true;
      onMeasure(el.offsetWidth, el.offsetHeight);
    }
  }, [onMeasure]);

  return (
    <motion.div
      ref={barRef}
      className={cn(styles.bar, !active && styles.idle)}
      role={active ? "status" : undefined}
      aria-label={active ? t("正在聆听…") : undefined}
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
          onConfirm();
        }
      }}
    >
      <button type="button" className={styles.side} aria-label={t("取消")} onClick={onCancel}>
        <HiXMark size={15} aria-hidden="true" />
      </button>
      <span className={styles.waves} aria-hidden="true">
        {BAR_HEIGHTS.map((height, index) => (
          <i
            key={index}
            className={styles.wave}
            style={{ height: `${height}px`, animationDelay: `${Math.abs(index - 6) * 0.08}s` }}
          />
        ))}
      </span>
      <button
        type="button"
        className={styles.side}
        aria-label={t("完成语音输入")}
        onClick={onConfirm}
      >
        <HiCheck size={15} aria-hidden="true" />
      </button>
    </motion.div>
  );
}
