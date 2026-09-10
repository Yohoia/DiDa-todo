"use client";

import { useId } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

import styles from "./segmented-control.module.css";

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: { value: T; label: string; dot?: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const id = useId();

  const move = (direction: 1 | -1) => {
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + direction + options.length) % options.length];
    if (next) onChange(next.value);
  };

  return (
    <div className={cn(styles.root, className)} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            className={styles.segment}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                event.preventDefault();
                move(1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault();
                move(-1);
              }
            }}
          >
            {active && (
              <motion.span
                className={styles.thumb}
                layoutId={`segmented-${id}`}
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            <span className={styles.content}>
              {option.dot && (
                <span
                  className={cn(styles.dot, active && styles.dotHidden)}
                  style={{ backgroundColor: option.dot }}
                />
              )}
              <span className={cn(styles.text, active && styles.textActive)}>{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
