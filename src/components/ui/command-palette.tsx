"use client";

import { useI18n } from "@/features/preferences/preferences-provider";
import { useDialogFocus } from "@/hooks/use-dialog-focus";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { HiClock, HiMagnifyingGlass } from "react-icons/hi2";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TaskLockButton } from "@/components/task/task-lock-button";
import { useWorkspace } from "@/features/tasks/workspace-provider";
import { cn } from "@/lib/utils";
import type { Task, TaskList } from "@/types/task";
import styles from "./command-palette.module.css";

const LISTS: TaskList[] = ["Inbox", "Work", "Study", "Life"];
const SEARCH_PAGE_SIZE = 30;

/** DocSearch-style task search palette, opened with Cmd/Ctrl+K. */
export function CommandPalette() {
  const { t, label, date: formatDate } = useI18n();
  const focusReturn = useDialogFocus();
  const { searchOpen, setSearchOpen, selectTask, selectedId, focusId, updateTask, searchTasks } =
    useWorkspace();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Task[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  // 最近搜索：仅在选中某条结果时记入本次关键词（会话内有效，去重置顶，最多 5 条）
  const [history, setHistory] = useState<string[]>([]);
  const recordSearch = (term: string) => {
    const value = term.trim();
    if (!value) return;
    setHistory((current) => [value, ...current.filter((item) => item !== value)].slice(0, 5));
  };
  // 面板每次打开都清空上次的搜索词（无论经由按钮、⌘K 还是 Esc 关闭后再开）
  const [prevOpen, setPrevOpen] = useState(searchOpen);
  if (prevOpen !== searchOpen) {
    setPrevOpen(searchOpen);
    if (searchOpen) {
      setQuery("");
      setResults([]);
      setSearching(false);
      setHasMore(false);
      setOffset(0);
    }
  }

  useEffect(() => {
    const term = query.trim();
    if (!term) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      void searchTasks(term, 0, SEARCH_PAGE_SIZE)
        .then((page) => {
          if (cancelled) return;
          setResults(page.tasks);
          setHasMore(page.hasMore);
          setOffset(page.tasks.length);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searchTasks]);

  const loadMore = async () => {
    const term = query.trim();
    if (!term || !hasMore) return;
    const nextOffset = offset;
    setSearching(true);
    try {
      const page = await searchTasks(term, nextOffset, SEARCH_PAGE_SIZE);
      setResults((current) => {
        const byId = new Map(current.map((task) => [task.id, task] as const));
        for (const task of page.tasks) byId.set(task.id, task);
        return [...byId.values()];
      });
      setHasMore(page.hasMore);
      setOffset(nextOffset + page.tasks.length);
    } finally {
      setSearching(false);
    }
  };
  const queryChanged = (value: string) => {
    setQuery(value);
    setResults([]);
    setHasMore(false);
    setOffset(0);
    setSearching(!!value.trim());
  };

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
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
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
          filter={(value, search, keywords) => {
            const needle = search.trim().toLowerCase();
            if (!needle) return 1;
            const haystack = [value, ...(keywords ?? [])].join(" ").toLowerCase();
            return haystack.includes(needle) ? 1 : 0;
          }}
        >
          <div className={styles.inputBox}>
            <HiMagnifyingGlass size={17} aria-hidden="true" />
            <Command.Input
              className={styles.input}
              value={query}
              onValueChange={queryChanged}
              placeholder={t("搜索任务…")}
              maxLength={120}
              autoFocus
              aria-label={t("搜索任务…")}
            />
          </div>
          <Command.List className={styles.list}>
            <Command.Empty className={styles.empty}>
              {query ? (searching ? t("正在搜索…") : t("没有匹配的任务")) : t("暂无搜索记录")}
            </Command.Empty>
            {/* 未输入关键词：只展示最近搜索，不罗列全部任务 */}
            {!query && history.length > 0 && (
              <Command.Group heading={t("最近搜索")} className={styles.group}>
                {history.map((term) => (
                  <Command.Item
                    key={term}
                    className={styles.item}
                    value={term}
                    onSelect={() => setQuery(term)}
                  >
                    <span className={styles.historyTerm}>
                      <HiClock size={13} aria-hidden="true" />
                      {term}
                    </span>
                  </Command.Item>
                ))}
                <Command.Item
                  className={cn(styles.item, styles.historyClear)}
                  value="__clear-history__"
                  onSelect={() => setHistory([])}
                >
                  {t("清除搜索记录")}
                </Command.Item>
              </Command.Group>
            )}
            {query &&
              LISTS.map((list) => {
                const group = results.filter((task) => task.list === list);
                if (!group.length) return null;
                return (
                  <Command.Group key={list} heading={label(list)} className={styles.group}>
                    {group.map((task) => {
                      return (
                        <Command.Item
                          key={task.id}
                          className={styles.item}
                          value={task.title}
                          keywords={[task.description, ...task.tags]}
                          onSelect={() => {
                            recordSearch(query);
                            selectTask(task.id);
                            setSearchOpen(false);
                          }}
                        >
                          <span
                            className={task.completed ? styles.itemTitleDone : styles.itemTitle}
                          >
                            {task.title}
                          </span>
                          <span className={styles.itemMeta}>
                            <span className={styles.itemHint}>
                              {task.date
                                ? formatDate(task.date, { month: "short", day: "numeric" }) +
                                  (task.time ? ` ${task.time}` : "")
                                : t("Any")}
                            </span>
                            {task.frozen && (
                              <TaskLockButton
                                compact
                                onUnlock={() => updateTask(task.id, { frozen: false })}
                              />
                            )}
                          </span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                );
              })}
            {query && hasMore && (
              <Command.Item
                className={cn(styles.item, styles.loadMore)}
                value="__load-more-search-results__"
                onSelect={() => void loadMore()}
              >
                {searching ? t("正在搜索…") : t("显示更多")}
              </Command.Item>
            )}
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
