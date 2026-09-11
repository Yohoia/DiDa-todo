"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader, EmptyState } from "@/components/shared/workspace-ui";
import { TaskRow } from "@/components/task/task-row";
import { useWorkspace } from "./workspace-provider";
import styles from "@/styles/workspace.module.css";

const TITLE_LIMIT = 200;

export function InboxPage() {
  const { t } = useI18n();
  const { tasks, addTask, toggleTask, toggleSubtask, selectTask } = useWorkspace();
  const [title, setTitle] = useState("");
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // 最新捕获的想法排在最前，紧贴输入框，便于连续记录时即时看到
  const inbox = tasks.filter((task) => task.list === "Inbox" && !task.completed).reverse();

  // 「/」随手聚焦捕获框（不打断正在输入的其它控件）
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/") return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const remaining = TITLE_LIMIT - title.length;
  return (
    <div className={styles.page} style={{ maxWidth: 700 }}>
      <PageHeader
        title={t("Inbox")}
        subtitle={inbox.length ? t("tasks.inboxCount", { count: inbox.length }) : t("Inbox Zero")}
      />
      <form
        className={styles.quickInput}
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          const id = addTask(title);
          if (id) setJustAddedId(id);
          setTitle("");
          // 提交后保留焦点，支持一口气连续记录
          inputRef.current?.focus();
        }}
      >
        <label className="sr-only" htmlFor="inbox-add">
          {t("添加收件箱任务")}
        </label>
        <input
          id="inbox-add"
          ref={inputRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("Dump what's on your mind...")}
          maxLength={TITLE_LIMIT}
          autoComplete="off"
        />
        {remaining <= 40 && (
          <span className={styles.charCount} aria-hidden="true">
            {remaining}
          </span>
        )}
        {!title && (
          <kbd className={styles.kbdHint} aria-hidden="true">
            /
          </kbd>
        )}
        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {t("Add")}
        </motion.button>
      </form>
      {inbox.length ? (
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {inbox.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                variant="inbox"
                highlight={task.id === justAddedId}
                onOpen={() => selectTask(task.id)}
                onToggle={() => toggleTask(task.id)}
                onToggleSubtask={(subtaskId) => toggleSubtask(task.id, subtaskId)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState title={t("Inbox Zero")}>
          {t("Everything is organized. Clean slate achieved.")}
        </EmptyState>
      )}
    </div>
  );
}
