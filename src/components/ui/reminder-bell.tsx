"use client";

import { motion } from "framer-motion";
import { HiBell, HiBellSlash } from "react-icons/hi2";

import { useI18n } from "@/features/preferences/preferences-provider";
import { cn } from "@/lib/utils";

import styles from "./reminder-bell.module.css";

const CYCLE = ["None", "10 min before", "20 min before", "30 min before"];

/** Bell chip that cycles 无 → 10 → 20 → 30 min on click, swinging on each change. */
export function ReminderBell({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { t } = useI18n();
  const active = value !== "None";
  const textFor = (option: string) =>
    option === "None"
      ? t("None")
      : t("提前 {min} 分钟", { min: Number(option.replace(/\D/g, "")) });
  const label = textFor(value);
  const next = CYCLE[(CYCLE.indexOf(value) + 1) % CYCLE.length] ?? "None";

  return (
    <button
      type="button"
      className={cn(styles.trigger, active && styles.active, className)}
      aria-label={`${t("Reminder")}: ${label}`}
      onClick={() => onChange(next)}
    >
      {/* Remounted per value so the swing replays on every cycle step. */}
      <motion.span
        key={value}
        className={styles.icon}
        initial={{ rotate: -14 }}
        animate={{ rotate: [12, -8, 0] }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
      >
        {active ? (
          <HiBell size={13} aria-hidden="true" />
        ) : (
          <HiBellSlash size={13} aria-hidden="true" />
        )}
      </motion.span>
      {/* All labels stacked: the widest reserves the width, each one centered in it. */}
      <span className={styles.textStack}>
        {CYCLE.map((option) => (
          <span
            key={option}
            className={cn(styles.text, option === value && styles.textOn)}
            aria-hidden={option !== value}
          >
            {textFor(option)}
          </span>
        ))}
      </span>
    </button>
  );
}
