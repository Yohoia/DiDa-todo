"use client";

import { useI18n } from "@/features/preferences/preferences-provider";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { HiCheck } from "react-icons/hi2";
import type { VoiceCaptureState, VoiceParsed } from "@/types/voice";
import { useWorkspace } from "./workspace-provider";
import styles from "./voice-confirm-card.module.css";

/** 黑洞"吐出"结果：识别完成后从胶囊上方展开的确认卡。
    一段语音拆出的多件事逐项列出，每项可勾选（默认全选），✓ 只落选中的；
    单条和多条共用可编辑确认列表，选择状态也供胶囊快捷确认读取。 */
export function VoiceConfirmCard({
  state,
  onDiscard,
  onEdit,
  onAdd,
}: {
  state: VoiceCaptureState;
  onDiscard: () => void;
  onEdit: (items: VoiceParsed[]) => void;
  onAdd: (items: VoiceParsed[]) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const { setVoiceCapture } = useWorkspace();
  const items = state.parsed.filter((item) => item.isTodo);
  const [adding, setPending] = useState(false);
  const pending = adding || state.saving === true;

  // 确认卡接管焦点：Esc 丢弃，Tab 在勾选项与操作按钮间移动
  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  const selectedItems = items.filter((item) => item.selected !== false);

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
        if (event.key === "Escape" && !pending) {
          event.preventDefault();
          onDiscard();
        }
      }}
    >
      {items.length > 0 ? (
        <>
          <ul className={styles.items}>
            {items.map((item, index) => {
              // 只展示整理结果：解析后的具体日期与时间（清单恒为 Inbox 不再显示）
              const meta: string[] = [];
              if (item.date) meta.push(formatVoiceDate(item.date, locale));
              if (item.time) meta.push(item.time);
              return (
                <li className={styles.item} key={index}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={item.selected !== false}
                    aria-label={item.title ?? t("添加")}
                    className={styles.pick}
                    disabled={pending}
                    onClick={() =>
                      setVoiceCapture({
                        ...state,
                        parsed: state.parsed.map((current) =>
                          current.captureId === item.captureId
                            ? { ...current, selected: current.selected === false }
                            : current,
                        ),
                      })
                    }
                  >
                    {item.selected !== false && <HiCheck size={11} aria-hidden="true" />}
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
            <button type="button" className={styles.ghost} disabled={pending} onClick={onDiscard}>
              {t("丢弃")}
            </button>
            {selectedItems.length > 0 && (
              <button
                type="button"
                className={styles.ghost}
                disabled={pending}
                onClick={() => onEdit(selectedItems)}
              >
                {t("capture.adjustAll")}
              </button>
            )}
            <button
              type="button"
              className={styles.primary}
              disabled={pending || selectedItems.length === 0}
              onClick={async () => {
                if (pending) return;
                setPending(true);
                try {
                  await onAdd(selectedItems);
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending
                ? t("organize.saving")
                : selectedItems.length > 1
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

/** 确认卡只显示整理结果：日期一律为换算后的具体日期（如 9月16日），不显示「明天」这类相对词。 */
function formatVoiceDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}
