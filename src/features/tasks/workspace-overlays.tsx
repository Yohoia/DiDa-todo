"use client";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useWorkspace } from "./workspace-provider";
import { TaskDetail } from "./task-detail";
import { QuickAdd } from "./quick-add";
import { FocusSession } from "@/features/focus/focus-session";
import styles from "@/styles/workspace.module.css";

export function WorkspaceOverlays() {
  const { notice, notify } = useWorkspace();
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => notify(""), 4000);
    return () => clearTimeout(timer);
  }, [notice, notify]);
  return (
    <>
      <TaskDetail />
      <QuickAdd />
      <FocusSession />
      {notice && (
        <div className={styles.toast} role="status">
          {notice}
          <button aria-label="关闭提示" onClick={() => notify("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
