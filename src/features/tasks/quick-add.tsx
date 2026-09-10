"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { useDialogFocus } from "@/hooks/use-dialog-focus";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { workspaceLinks } from "@/components/layout/workspace-nav";
import { useWorkspace } from "./workspace-provider";
import type { TaskList } from "@/types/task";
import styles from "@/styles/workspace.module.css";

export function QuickAdd() {
  const { t } = useI18n();
  const focusReturn = useDialogFocus();
  const { quickAdd, setQuickAdd } = useWorkspace();
  const pathname = usePathname();
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (document.querySelector('[role="dialog"]') && !quickAdd) return;
        event.preventDefault();
        setQuickAdd(quickAdd ? null : "Inbox");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quickAdd, setQuickAdd]);
  return (
    <Dialog
      open={quickAdd !== null}
      onOpenChange={(open) => {
        if (!open) setQuickAdd(null);
      }}
    >
      <DialogContent
        {...focusReturn}
        className={styles.dialog}
        overlayClassName={styles.overlay}
        closeButtonClassName={styles.close}
      >
        <DialogTitle>{t("Quick Add")}</DialogTitle>
        <DialogDescription>{t("记录一个想法，或者输入 / 跳转到其他页面。")}</DialogDescription>
        {quickAdd && <QuickAddForm key={`${quickAdd}-${pathname}`} initialList={quickAdd} />}
      </DialogContent>
    </Dialog>
  );
}
function QuickAddForm({ initialList }: { initialList: TaskList }) {
  const { t, label } = useI18n();
  const { addTask, setQuickAdd } = useWorkspace();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [list, setList] = useState(initialList);
  const [date, setDate] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    if (commands) {
      if (matchingLinks[0]) {
        router.push(matchingLinks[0].href);
        setQuickAdd(null);
      }
      return;
    }
    addTask(title, list, date);
    setQuickAdd(null);
  }
  const commands = title.startsWith("/");
  const matchingLinks = workspaceLinks.filter((link) =>
    `${link.label} ${link.description} ${label(link.label)} ${label(link.description)}`
      .toLowerCase()
      .includes(title.slice(1).toLowerCase()),
  );
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="sr-only" htmlFor="quick-task-title">
        {t("任务标题或页面名称")}
      </label>
      <input
        id="quick-task-title"
        className="w-full border-b border-border py-3 text-base"
        placeholder={t("What needs to be done?")}
        maxLength={200}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        autoFocus
      />
      {commands ? (
        <nav
          aria-label={t("快捷页面导航")}
          className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto"
        >
          {matchingLinks.map((link) => (
            <Link
              className={styles.button}
              href={link.href}
              key={link.href}
              onClick={() => setQuickAdd(null)}
            >
              {label(link.label)}
            </Link>
          ))}
          {!matchingLinks.length && <p className={styles.muted}>{t("No matching pages")}</p>}
        </nav>
      ) : (
        <>
          <div className={styles.row}>
            <label className={styles.muted}>
              {t("List")}{" "}
              <select
                value={list}
                onChange={(event) => setList(event.target.value as TaskList)}
                className={styles.select}
              >
                {["Inbox", "Work", "Study", "Life"].map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.muted}>
              {t("Date")}{" "}
              <input
                aria-label={t("任务日期")}
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={styles.select}
              />
            </label>
          </div>
          <button type="submit" className={styles.primary} disabled={!title.trim()}>
            {t("Create Task")}
          </button>
        </>
      )}
      <p className={styles.muted}>{t("Enter to create · Esc to close · / to navigate")}</p>
    </form>
  );
}
