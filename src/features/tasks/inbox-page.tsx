"use client";

import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/shared/workspace-ui";
import { TaskRow } from "@/components/task/task-row";
import { useWorkspace } from "./workspace-provider";
import styles from "@/styles/workspace.module.css";

export function InboxPage() {
  const { tasks, addTask, toggleTask, selectTask } = useWorkspace();
  const [title, setTitle] = useState("");
  const inbox = tasks.filter((task) => task.list === "Inbox" && !task.completed);
  return (
    <div className={styles.page} style={{ maxWidth: 700 }}>
      <PageHeader
        title="Inbox"
        subtitle={inbox.length ? `${inbox.length} unorganized tasks` : "Inbox Zero"}
      />
      {inbox.length ? (
        <div className="flex flex-col gap-3">
          {inbox.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              variant="inbox"
              onOpen={() => selectTask(task.id)}
              onToggle={() => toggleTask(task.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="Inbox Zero">Everything is organized. Clean slate achieved.</EmptyState>
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
          添加收件箱任务
        </label>
        <input
          id="inbox-add"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Dump what's on your mind..."
          maxLength={200}
        />
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
