"use client";

import { useI18n } from "@/features/preferences/preferences-provider";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { HiCheck } from "react-icons/hi2";
import { getDemoDate, getTodayKey } from "@/lib/date-utils";
import type { MessageKey } from "@/i18n/messages";
import type { VoiceCaptureState, VoiceParsed } from "@/types/voice";
import styles from "./voice-confirm-card.module.css";

/** 黑洞"吐出"结果：识别完成后从胶囊上方展开的确认卡。
    一段语音拆出的多件事逐项列出，每项可勾选（默认全选），✓ 只落选中的；
    编辑入口仅在单条时提供（QuickAdd 是单任务表单）。 */
export function VoiceConfirmCard({
  state,
  onDiscard,
  onEdit,
  onAdd,
}: {
  state: VoiceCaptureState;
  onDiscard: () => void;
  onEdit: (item: VoiceParsed) => void;
  onAdd: (items: VoiceParsed[]) => void;
}) {
  const { t, label, locale } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const items = state.parsed.filter((item) => item.isTodo);
  const [selected, setSelected] = useState<boolean[]>(() => items.map(() => true));

  // 确认卡接管焦点：Esc 丢弃，Tab 在勾选项与操作按钮间移动
  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  const selectedItems = items.filter((_, index) => selected[index]);
  const single = selectedItems.length === 1 ? selectedItems[0] : null;

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
      {items.length > 0 ? (
        <>
          <ul className={styles.items}>
            {items.map((item, index) => {
              const meta: string[] = [];
              if (item.list) meta.push(label(item.list));
              if (item.date) meta.push(formatVoiceDate(item.date, locale, t));
              if (item.time) meta.push(item.time);
              return (
                <li className={styles.item} key={index}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={selected[index]}
                    aria-label={item.title ?? t("添加")}
                    className={styles.pick}
                    onClick={() =>
                      setSelected((current) =>
                        current.map((value, i) => (i === index ? !value : value)),
                      )
                    }
                  >
                    {selected[index] && <HiCheck size={11} aria-hidden="true" />}
                  </button>
                  <div className={styles.itemBody}>
                    <span className={styles.title}>{item.title}</span>
                    {meta.length > 0 && <span className={styles.meta}>{meta.join(" · ")}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={onDiscard}>
              {t("丢弃")}
            </button>
            {single && (
              <button type="button" className={styles.ghost} onClick={() => onEdit(single)}>
                {t("编辑")}
              </button>
            )}
            <button
              type="button"
              className={styles.primary}
              disabled={selectedItems.length === 0}
              onClick={() => onAdd(selectedItems)}
            >
              {selectedItems.length > 1
                ? t("添加 {count} 项", { count: String(selectedItems.length) })
                : t("添加")}
            </button>
          </div>
        </>
      ) : (
        <div className={styles.actions}>
          <p className={styles.rejected}>
            {t("这句话不太像待办")}
            {state.parsed[0]?.reason ? ` · ${state.parsed[0].reason}` : ""}
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
