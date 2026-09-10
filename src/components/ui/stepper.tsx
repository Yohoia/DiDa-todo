"use client";

import { useState } from "react";
import { HiMinus, HiPlus } from "react-icons/hi2";

import { cn } from "@/lib/utils";

import styles from "./stepper.module.css";

/** Compact − value + control for bounded counts, styled like the segmented control. */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 16,
  label,
  decreaseLabel,
  increaseLabel,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [lastProp, setLastProp] = useState(value);
  // Adjust local draft when the parent value changes (React's render-time adjustment).
  if (value !== lastProp) {
    setLastProp(value);
    setDraft(String(value));
  }

  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  const commit = (next: number) => {
    const bounded = clamp(next);
    setDraft(String(bounded));
    if (bounded !== value) onChange(bounded);
  };
  const type = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, String(max).length);
    setDraft(digits);
    const parsed = Number(digits);
    if (digits && parsed >= min && parsed <= max) onChange(parsed);
  };

  const minus = (
    <button
      type="button"
      className={styles.button}
      aria-label={decreaseLabel}
      disabled={value <= min}
      onClick={() => commit((Number(draft) || value) - 1)}
    >
      <HiMinus size={12} aria-hidden="true" />
    </button>
  );

  return (
    <span className={cn(styles.root, className)} role="group" aria-label={label}>
      {minus}
      <input
        className={styles.value}
        inputMode="numeric"
        aria-label={label}
        value={draft}
        onChange={(event) => type(event.target.value)}
        onBlur={() => commit(Number(draft) || value)}
      />
      <button
        type="button"
        className={styles.button}
        aria-label={increaseLabel}
        disabled={value >= max}
        onClick={() => commit((Number(draft) || value) + 1)}
      >
        <HiPlus size={12} aria-hidden="true" />
      </button>
    </span>
  );
}
