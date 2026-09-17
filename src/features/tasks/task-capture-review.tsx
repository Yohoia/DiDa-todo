"use client";
import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/features/preferences/preferences-provider";
import type { MessageKey } from "@/i18n/messages";
import { captureDraftError, type TaskCaptureDraft, type CaptureSaveResult } from "./task-capture";
import shared from "@/styles/workspace.module.css";
import styles from "./task-capture-review.module.css";

export function TaskCaptureReview({
  open,
  drafts: initialDrafts,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  drafts: TaskCaptureDraft[];
  onOpenChange: (open: boolean) => void;
  onSave: (drafts: TaskCaptureDraft[]) => Promise<CaptureSaveResult>;
}) {
  const { t, label } = useI18n();
  const [drafts, setDrafts] = useState(initialDrafts);
  const [selected, setSelected] = useState(() => new Set(initialDrafts.map((draft) => draft.id)));
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [result, setResult] = useState<CaptureSaveResult | null>(null);
  const [saveError, setSaveError] = useState(false);
  const picked = drafts.filter((draft) => selected.has(draft.id));
  const change = (id: string, patch: Partial<TaskCaptureDraft>) =>
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
    );
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pendingRef.current) onOpenChange(next);
      }}
    >
      <DialogContent
        className={`${shared.dialog} ${styles.dialog}`}
        overlayClassName={shared.overlay}
        closeButtonClassName={shared.close}
      >
        <DialogTitle>{t("capture.reviewTitle")}</DialogTitle>
        <DialogDescription>{t("capture.reviewHint")}</DialogDescription>
        <div className={styles.items}>
          {drafts.map((draft, index) => {
            const error = captureDraftError(draft);
            return (
              <article className={styles.item} key={draft.id}>
                <label className={styles.pick}>
                  <input
                    type="checkbox"
                    checked={selected.has(draft.id)}
                    disabled={pending}
                    onChange={() =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (next.has(draft.id)) next.delete(draft.id);
                        else next.add(draft.id);
                        return next;
                      })
                    }
                  />
                  {t("capture.item", { count: String(index + 1) })}
                </label>
                <label>
                  {t("capture.title")}
                  <input
                    className={styles.title}
                    value={draft.title}
                    maxLength={200}
                    disabled={pending}
                    onChange={(event) => change(draft.id, { title: event.target.value })}
                  />
                </label>
                <div className={styles.properties}>
                  <DateTimePicker
                    value={{ date: draft.date, time: draft.time }}
                    onChange={(next) => {
                      if (!pending) change(draft.id, next);
                    }}
                  />
                  <Select
                    ariaLabel={t("List")}
                    value={draft.list}
                    disabled={pending}
                    options={(["Inbox", "Work", "Study", "Life"] as const).map((value) => ({
                      value,
                      label: label(value),
                    }))}
                    onValueChange={(list) => change(draft.id, { list })}
                  />
                </div>
                {selected.has(draft.id) && error && (
                  <p className={styles.error} role="alert">
                    {t(error as MessageKey)}
                  </p>
                )}
              </article>
            );
          })}
        </div>
        {result && (
          <p role="status">
            {t("capture.saveResult", {
              saved: String(result.savedIds.length),
              failed: String(result.failedIds.length),
            })}
          </p>
        )}
        {saveError && (
          <p className={styles.error} role="alert">
            {t("sync.failed")}
          </p>
        )}
        <div className={shared.actions}>
          <button
            type="button"
            className={shared.button}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {t("取消")}
          </button>
          <button
            type="button"
            className={shared.button}
            disabled={pending || !picked.length || picked.some((draft) => captureDraftError(draft))}
            onClick={async () => {
              if (pendingRef.current) return;
              pendingRef.current = true;
              setPending(true);
              setSaveError(false);
              try {
                const next = await onSave(picked);
                setResult(next);
                const saved = new Set(next.savedIds);
                setDrafts((current) => current.filter((draft) => !saved.has(draft.id)));
                setSelected((current) => new Set([...current].filter((id) => !saved.has(id))));
                if (!next.failedIds.length) onOpenChange(false);
              } catch {
                setSaveError(true);
              } finally {
                pendingRef.current = false;
                setPending(false);
              }
            }}
          >
            {pending
              ? t("organize.saving")
              : t("添加 {count} 项", { count: String(picked.length) })}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
