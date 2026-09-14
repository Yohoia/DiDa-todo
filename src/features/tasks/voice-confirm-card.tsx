"use client";

import { useI18n } from "@/features/preferences/preferences-provider";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { getDemoDate, getTodayKey } from "@/lib/date-utils";
import type { MessageKey } from "@/i18n/messages";
import type { VoiceCaptureState } from "@/types/voice";
import styles from "./voice-confirm-card.module.css";

/** 黑洞"吐出"结果：识别完成后从胶囊上方展开的确认卡（原文 + 解析摘要 + 三操作）。 */
export function VoiceConfirmCard({
  state,
  onDiscard,
  onEdit,
  onAdd,
}: {
  state: VoiceCaptureState;
  onDiscard: () => void;
  onEdit: () => void;
  onAdd: () => void;
}) {
  const { t, label, locale } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const parsed = state.parsed;

  // 确认卡接管焦点：Esc 丢弃，Tab 在三个操作间移动
  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  const meta: string[] = [];
  if (parsed?.isTodo) {
    if (parsed.list) meta.push(label(parsed.list));
    if (parsed.date) meta.push(formatVoiceDate(parsed.date, locale, t));
    if (parsed.time) meta.push(parsed.time);
  }

  return (
    <motion.div
      ref={cardRef}
      className={styles.card}
      role="dialog"
      aria-label={t("确认语音待办")}
      tabIndex={-1}
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onDiscard();
        }
      }}
    >
      <p className={styles.source}>“{state.transcript}”</p>
      {parsed?.isTodo ? (
        <>
          <p className={styles.summary}>
            <span className={styles.title}>{parsed.title}</span>
            {meta.length > 0 && <span className={styles.meta}>{meta.join(" · ")}</span>}
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={onDiscard}>
              {t("丢弃")}
            </button>
            <button type="button" className={styles.ghost} onClick={onEdit}>
              {t("编辑")}
            </button>
            <button type="button" className={styles.primary} onClick={onAdd}>
              {t("添加")}
            </button>
          </div>
        </>
      ) : (
        <div className={styles.actions}>
          <p className={styles.rejected}>
            {t("这句话不太像待办")}
            {parsed?.reason ? ` · ${parsed.reason}` : ""}
          </p>
          <button type="button" className={styles.primary} onClick={onDiscard}>
            {t("知道了")}
          </button>
        </div>
      )}
    </motion.div>
  );
}

/** 今天/明天用现有键，其余日期交给 Intl 短格式。 */
function formatVoiceDate(date: string, locale: string, t: (key: MessageKey) => string): string {
  if (date === getTodayKey()) return t("Today");
  if (date === getDemoDate(1)) return t("Tomorrow");
  return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}
