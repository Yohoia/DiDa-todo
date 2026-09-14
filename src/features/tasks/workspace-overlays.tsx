"use client";
import { useI18n } from "@/features/preferences/preferences-provider";
import { HiX } from "react-icons/hi";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspace } from "./workspace-provider";
import { TaskDetail } from "./task-detail";
import { QuickAdd } from "./quick-add";
import { CommandPalette } from "@/components/ui/command-palette";
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
      <CommandPalette />
      <FocusSession />
      <AnimatePresence>
        {notice && (
          <motion.div
            className={styles.toast}
            role="status"
            initial={{ opacity: 0, y: -50, scale: 0.95, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: -20, scale: 0.95, x: "-50%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {t(notice.key, {
              ...notice.values,
              ...(notice.values?.list ? { list: label(String(notice.values.list)) } : {}),
            })}
            <motion.button
              aria-label={t("关闭提示")}
              onClick={() => notify(null)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              <HiX size={16} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
