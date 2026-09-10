"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader, EmptyState } from "@/components/shared/workspace-ui";
import { TaskRow } from "@/components/task/task-row";
import { useWorkspace } from "./workspace-provider";
import styles from "@/styles/workspace.module.css";

export function InboxPage() {
  const { t } = useI18n();
  const { tasks, addTask, toggleTask, toggleSubtask, selectTask, updateTask } = useWorkspace();
  const [title, setTitle] = useState("");
  const inbox = tasks.filter((task) => task.list === "Inbox" && !task.completed);
  return (
    <div className={styles.page} style={{ maxWidth: 700 }}>
      <PageHeader
        title={t("Inbox")}
        subtitle={inbox.length ? t("tasks.inboxCount", { count: inbox.length }) : t("Inbox Zero")}
      />
      {inbox.length ? (
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {inbox.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                variant="inbox"
                onOpen={() => selectTask(task.id)}
                onToggle={() => toggleTask(task.id)}
                onToggleSubtask={(subtaskId) => toggleSubtask(task.id, subtaskId)}
                onToggleFeatured={() => updateTask(task.id, { featured: !task.featured })}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState title={t("Inbox Zero")}>
          {t("Everything is organized. Clean slate achieved.")}
        </EmptyState>
      )}
      <form
        className={styles.quickInput}
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          addTask(title);
          setTitle("");
        }}
      >
        <label className="sr-only" htmlFor="inbox-add">
          {t("添加收件箱任务")}
        </label>
        <input
          id="inbox-add"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("Dump what's on your mind...")}
          maxLength={200}
        />
        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {t("Add")}
        </motion.button>
      </form>
    </div>
  );
}
