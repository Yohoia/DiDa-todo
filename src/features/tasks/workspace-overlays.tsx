"use client";
import { useI18n } from "@/features/preferences/preferences-provider";
import { HiX } from "react-icons/hi";
import { useEffect } from "react";
import { useWorkspace } from "./workspace-provider";
import { TaskDetail } from "./task-detail";
import { QuickAdd } from "./quick-add";
import { FocusSession } from "@/features/focus/focus-session";
import styles from "@/styles/workspace.module.css";

export function WorkspaceOverlays() {
  const { t, label } = useI18n();
  const { notice, notify } = useWorkspace();
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => notify(null), 4000);
    return () => clearTimeout(timer);
  }, [notice, notify]);
  return (
    <>
      <TaskDetail />
      <QuickAdd />
      <FocusSession />
      {notice && (
        <div className={styles.toast} role="status">
          {t(notice.key, {
            ...notice.values,
            ...(notice.values?.list ? { list: label(String(notice.values.list)) } : {}),
          })}
          <button aria-label={t("关闭提示")} onClick={() => notify(null)}>
            <HiX size={16} />
          </button>
        </div>
      )}
    </>
  );
}
