"use client";

import { HiLockClosed, HiLockOpen } from "react-icons/hi2";

import { useI18n } from "@/features/preferences/preferences-provider";
import { cn } from "@/lib/utils";

import styles from "./task-lock-button.module.css";

export function TaskLockButton({
  onUnlock,
  compact = false,
  className,
}: {
  onUnlock: () => void;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const label = t("Unlock task");

  return (
    <button
      type="button"
      className={cn(styles.button, className)}
      data-compact={compact || undefined}
      aria-label={label}
      title={label}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onUnlock();
      }}
    >
      <span className={styles.icons} aria-hidden="true">
        <HiLockClosed size={17} className={styles.lockedIcon} />
        <HiLockOpen size={17} className={styles.unlockedIcon} />
      </span>
    </button>
  );
}
