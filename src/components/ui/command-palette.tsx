"use client";

import { useI18n } from "@/features/preferences/preferences-provider";
import { useDialogFocus } from "@/hooks/use-dialog-focus";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Command } from "cmdk";
import { HiMagnifyingGlass } from "react-icons/hi2";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useWorkspace } from "@/features/tasks/workspace-provider";
import { cn } from "@/lib/utils";
import type { TaskList } from "@/types/task";
import styles from "./command-palette.module.css";

const emptySubscribe = () => () => {};

function useIsMac() {
  // Client-only value: SSR/hydration assumes Mac, then re-renders if needed.
  return useSyncExternalStore(
    emptySubscribe,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent),
    () => true,
  );
}

const LISTS: TaskList[] = ["Inbox", "Work", "Study", "Life"];

/** Inline trigger styled like a search field with the platform shortcut badge. */
export function SearchTrigger({ className }: { className?: string }) {
  const { t } = useI18n();
  const { setSearchOpen } = useWorkspace();
  const isMac = useIsMac();
  const hint = isMac ? "⌘ K" : "Ctrl K";
  return (
    <button
      type="button"
      className={className ? cn(styles.trigger, className) : styles.trigger}
      onClick={() => setSearchOpen(true)}
      aria-label={`${t("搜索")} (${hint})`}
    >
      <HiMagnifyingGlass size={14} aria-hidden="true" />
      <span className={styles.triggerText}>{t("搜索")}</span>
      <kbd className={styles.kbd}>{hint}</kbd>
    </button>
  );
}

/** DocSearch-style task search palette, opened with Cmd/Ctrl+K. */
export function CommandPalette() {
  const { t, label, date: formatDate } = useI18n();
  const focusReturn = useDialogFocus();
  const { tasks, searchOpen, setSearchOpen, selectTask, selectedId, focusId } = useWorkspace();
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        // Don't trigger if task detail drawer or focus mode is active
        if (selectedId || focusId) return;
        event.preventDefault();
        setSearchOpen(!searchOpen);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, setSearchOpen, selectedId, focusId]);

  return (
    <Dialog
      open={searchOpen}
      onOpenChange={(next) => {
        if (next) setQuery("");
        setSearchOpen(next);
      }}
    >
      <DialogContent
        {...focusReturn}
        className={styles.panel}
        closeButtonClassName={styles.closeHidden}
      >
        <DialogTitle className="sr-only">{t("搜索")}</DialogTitle>
        <DialogDescription className="sr-only">{t("搜索全部任务")}</DialogDescription>
        <Command
          loop
          className={styles.command}
          filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
        >
          <div className={styles.inputBox}>
            <HiMagnifyingGlass size={17} aria-hidden="true" />
            <Command.Input
              className={styles.input}
              value={query}
              onValueChange={setQuery}
              placeholder={t("搜索任务…")}
              maxLength={120}
              autoFocus
              aria-label={t("搜索任务…")}
            />
          </div>
          <Command.List className={styles.list}>
            <Command.Empty className={styles.empty}>
              {query ? t("没有匹配的任务") : t("暂无搜索记录")}
            </Command.Empty>
            {LISTS.map((list) => {
              const group = tasks.filter((task) => task.list === list);
              if (!group.length) return null;
              return (
                <Command.Group key={list} heading={label(list)} className={styles.group}>
                  {group.map((task) => (
                    <Command.Item
                      key={task.id}
                      className={styles.item}
                      value={task.title}
                      keywords={[task.description, ...task.tags]}
                      onSelect={() => {
                        selectTask(task.id);
                        setSearchOpen(false);
                      }}
                    >
                      <span className={task.completed ? styles.itemTitleDone : styles.itemTitle}>
                        {task.title}
                      </span>
                      <span className={styles.itemHint}>
                        {task.date
                          ? formatDate(task.date, { month: "short", day: "numeric" }) +
                            (task.time ? ` ${task.time}` : "")
                          : t("Any")}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>
          <footer className={styles.footer}>
            <div className={styles.hints}>
              <span className={styles.hint}>
                <kbd className={styles.kbd}>↵</kbd> {t("选择")}
              </span>
              <span className={styles.hint}>
                <kbd className={styles.kbd}>↑</kbd>
                <kbd className={styles.kbd}>↓</kbd> {t("导航")}
              </span>
              <span className={styles.hint}>
                <kbd className={styles.kbd}>esc</kbd> {t("关闭")}
              </span>
            </div>
            <span className={styles.brand}>DiDa</span>
          </footer>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
