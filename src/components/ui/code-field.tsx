"use client";

import { useRef } from "react";

import { useI18n } from "@/features/preferences/preferences-provider";

import styles from "./code-field.module.css";

/**
 * 六格验证码输入：输入自动跳下一格、退格回退、整段粘贴自动分发、
 * 首格标记 one-time-code 以支持浏览器/系统的验证码自动填充。
 */
export function CodeField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function focusAt(index: number) {
    const target = refs.current[Math.max(0, Math.min(5, index))];
    target?.focus();
    target?.select();
  }

  /** 从第 start 格起写入 text 中的数字（支持一次多位/粘贴），写完跳到其后一格 */
  function write(start: number, text: string) {
    const digits = text.replace(/\D/g, "");
    if (!digits) return;
    const chars = Array.from({ length: 6 }, (_, i) => value[i] ?? "");
    for (let i = 0; i < digits.length && start + i < 6; i++) chars[start + i] = digits[i];
    onChange(chars.join(""));
    focusAt(start + digits.length);
  }

  return (
    <div className={styles.row}>
      {Array.from({ length: 6 }, (_, index) => (
        <input
          key={index}
          id={index === 0 ? id : undefined}
          ref={(element) => {
            refs.current[index] = element;
          }}
          className={styles.box}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={value[index] ?? ""}
          aria-label={t("验证码第 {index} 位", { index: index + 1 })}
          onChange={(event) => write(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              event.preventDefault();
              const chars = Array.from({ length: 6 }, (_, i) => value[i] ?? "");
              if (chars[index]) {
                chars[index] = "";
                onChange(chars.join(""));
              } else if (index > 0) {
                chars[index - 1] = "";
                onChange(chars.join(""));
                focusAt(index - 1);
              }
            } else if (event.key === "ArrowLeft") {
              focusAt(index - 1);
            } else if (event.key === "ArrowRight") {
              focusAt(index + 1);
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            write(index, event.clipboardData.getData("text"));
          }}
          onFocus={(event) => event.currentTarget.select()}
        />
      ))}
    </div>
  );
}
