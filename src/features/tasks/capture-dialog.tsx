"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HiCheck, HiPlus } from "react-icons/hi2";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import styles from "./capture-dialog.module.css";
import { createId } from "@/lib/utils";
import { parseQuickCapture, type TaskCaptureDraft } from "./task-capture";

export const TITLE_LIMIT = 200;

/** 「记一笔」捕获弹窗：回车收进收件箱，本次会话的捕获以回执形式留在弹窗里 */
export function CaptureDialog({
  open,
  onOpenChange,
  onCapture,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (draft: TaskCaptureDraft) => Promise<boolean>;
  today: string;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [receipts, setReceipts] = useState<{ id: number; title: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftId, setDraftId] = useState(createId);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [saveError, setSaveError] = useState(false);
  const remaining = TITLE_LIMIT - title.length;
  const draft = parseQuickCapture(title, today, { list: "Inbox", date: today }, draftId);

  const submit = async () => {
    const text = title.trim();
    if (!text || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setSaveError(false);
    try {
      if (!(await onCapture(draft))) return;
      setReceipts((current) => [{ id: Date.now(), title: draft.title }, ...current].slice(0, 8));
      setTitle("");
      setDraftId(createId());
    } catch {
      setSaveError(true);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
    inputRef.current?.focus();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pendingRef.current) return;
        // 关闭时清场：回执与半截输入不留到下次
        if (!next) {
          setTitle("");
          setReceipts([]);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={styles.panel}
        overlayClassName={styles.overlay}
        closeButtonClassName={styles.closeHidden}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className={styles.accent} aria-hidden="true" />
        <div className={styles.head}>
          <span className={styles.badge}>
            <HiPlus size={17} aria-hidden="true" />
          </span>
          <div>
            <DialogTitle className={styles.title}>{t("记一笔")}</DialogTitle>
            <DialogDescription className={styles.desc}>
              {t("收集想法，随录随整理。")}
            </DialogDescription>
          </div>
        </div>
        <form
          className={styles.body}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className={styles.inputBox}>
            <label className="sr-only" htmlFor="capture-input">
              {t("添加收件箱任务")}
            </label>
            <input
              id="capture-input"
              ref={inputRef}
              className={styles.input}
              value={title}
              disabled={pending}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                // 显式处理回车提交（不依赖浏览器隐式提交）；输入法组词中的回车忽略
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void submit();
                }
              }}
              placeholder={t("Dump what's on your mind...")}
              maxLength={TITLE_LIMIT}
              autoComplete="off"
            />
            {remaining <= 40 && (
              <span className={styles.charCount} aria-hidden="true">
                {remaining}
              </span>
            )}
            <motion.button
              type="submit"
              disabled={pending || !title.trim()}
              className={styles.addBtn}
              aria-label={t("收进收件箱")}
              title={`${t("收进收件箱")} (↵)`}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <span className={styles.addGlyph} aria-hidden="true">
                ↵
              </span>
            </motion.button>
          </div>
          {title.trim() && (
            <p className="mt-2 text-xs text-muted-foreground" role="status">
              {draft.title} · {draft.date} · {draft.time || t("随时")}
            </p>
          )}
        </form>
        {saveError && (
          <p className="px-5 text-xs text-destructive" role="alert">
            {t("sync.failed")}
          </p>
        )}
        <div className={styles.receipts}>
          <AnimatePresence initial={false}>
            {receipts.map((receipt) => (
              <motion.div
                key={receipt.id}
                className={styles.receipt}
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 480, damping: 34 }}
              >
                <motion.span
                  className={styles.receiptCheck}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 520, damping: 22, delay: 0.06 }}
                >
                  <HiCheck size={14} aria-hidden="true" />
                </motion.span>
                <span className={styles.receiptTitle}>{receipt.title}</span>
                <span className={styles.receiptHint}>{t("已收进收件箱")}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <footer className={styles.footer}>
          <div className={styles.hints}>
            <span className={styles.hint}>
              <kbd className={styles.kbd}>↵</kbd>
              {t("收进收件箱")}
            </span>
            <span className={styles.hint}>
              <kbd className={styles.kbd}>esc</kbd>
              {t("关闭")}
            </span>
          </div>
          <span className={styles.brand}>{t("先收集，后整理")}</span>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
