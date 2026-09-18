"use client";

import { useI18n } from "@/features/preferences/preferences-provider";
import { cn } from "@/lib/utils";
import styles from "@/styles/workspace.module.css";

export default function WorkspaceLoading() {
  const { t } = useI18n();

  return (
    <div className={cn(styles.page, styles.narrow)} role="status" aria-live="polite">
      <span className="sr-only">{t("正在加载…")}</span>
      <div className={styles.loadingHeader}>
        <div className={styles.loadingTitle} />
        <div className={styles.loadingSubtitle} />
      </div>
      <div className={styles.loadingCards} aria-hidden="true">
        <div className={styles.loadingCard} />
        <div className={styles.loadingCard} />
        <div className={styles.loadingCard} />
      </div>
    </div>
  );
}
