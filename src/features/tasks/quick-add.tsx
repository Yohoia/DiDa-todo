"use client";
import { useI18n } from "@/features/preferences/preferences-provider";
import { useTodayKey } from "@/hooks/use-today-key";

import { useDialogFocus } from "@/hooks/use-dialog-focus";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { HiCheck } from "react-icons/hi2";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { workspaceLinks } from "@/components/layout/workspace-nav";
import { useWorkspace, type QuickAddPreset } from "./workspace-provider";
import type { TaskList } from "@/types/task";
import { cn, createId } from "@/lib/utils";
import { parseTranscript } from "./voice-api";
import { parseQuickCapture, type TaskCaptureDraft } from "./task-capture";
import { TaskCaptureReview } from "./task-capture-review";
import shared from "@/styles/workspace.module.css";
import styles from "./quick-add.module.css";

export function QuickAdd() {
  const { t } = useI18n();
  const focusReturn = useDialogFocus();
  const { quickAdd, setQuickAdd } = useWorkspace();
  const pendingRef = useRef(false);
  const [reviewActive, setReviewActive] = useState(false);
  return (
    <Dialog
      open={quickAdd !== null}
      onOpenChange={(open) => {
        if (!open && !pendingRef.current) {
          setReviewActive(false);
          setQuickAdd(null);
        }
      }}
    >
      <DialogContent
        {...focusReturn}
        className={cn(shared.dialog, (reviewActive || !!quickAdd?.captures) && "invisible")}
        overlayClassName={shared.overlay}
        closeButtonClassName={shared.close}
      >
        <DialogTitle>{t("Quick Add")}</DialogTitle>
        <DialogDescription>{t("记录一个想法，或者输入 / 跳转到其他页面。")}</DialogDescription>
        {quickAdd && (
          <QuickAddForm
            key={`${quickAdd.list}-${quickAdd.date ?? ""}-${quickAdd.time ?? ""}-${quickAdd.title ?? ""}-${quickAdd.captures?.map((draft) => draft.id).join(",") ?? ""}`}
            initialList={quickAdd.list}
            initialDate={quickAdd.date}
            initialTime={quickAdd.time}
            initialTitle={quickAdd.title}
            preset={quickAdd}
            pendingRef={pendingRef}
            onReviewStateChange={setReviewActive}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function QuickAddForm({
  initialList,
  initialDate = "",
  initialTime,
  initialTitle = "",
  preset,
  pendingRef,
  onReviewStateChange,
}: {
  initialList: TaskList;
  initialDate?: string;
  initialTime?: string;
  initialTitle?: string;
  preset: QuickAddPreset;
  pendingRef: RefObject<boolean>;
  onReviewStateChange: (active: boolean) => void;
}) {
  const { t, label, locale } = useI18n();
  const { saveCapturedTasks, setQuickAdd, notify, recordVoiceCapture } = useWorkspace();
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  // 预设的清单/日期/时间不再铺开成表单，静默生效：从日程页进入时任务直接落在选中日
  const [created, setCreated] = useState(false);
  const [pending, setPending] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const [review, setReview] = useState<TaskCaptureDraft[] | null>(preset.captures ?? null);
  const [draftId] = useState(createId);
  const todayKey = useTodayKey();
  useEffect(() => () => requestRef.current?.abort(), []);
  const quickDraft = parseQuickCapture(
    title,
    todayKey,
    { list: initialList, date: initialDate, time: initialTime },
    draftId,
  );

  const commands = title.startsWith("/");
  const matchingLinks = workspaceLinks.filter((link) =>
    `${link.label} ${link.description} ${label(link.label)} ${label(link.description)}`
      .toLowerCase()
      .includes(title.slice(1).toLowerCase()),
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || created || pendingRef.current) return;
    if (commands) {
      if (matchingLinks[0]) {
        router.push(matchingLinks[0].href);
        setQuickAdd(null);
      }
      return;
    }
    pendingRef.current = true;
    setPending(true);
    try {
      const result = await saveCapturedTasks([quickDraft]);
      if (result.savedIds.length) {
        setCreated(true);
        setQuickAdd(null);
      }
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void submit(event);
      }}
      className={styles.form}
    >
      <div className={styles.titleBox}>
        <label className="sr-only" htmlFor="quick-task-title">
          {t("任务标题或页面名称")}
        </label>
        <input
          id="quick-task-title"
          className={styles.title}
          placeholder={t("What needs to be done?")}
          maxLength={200}
          disabled={pending}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoFocus
        />
        <i className={styles.titleLine} aria-hidden="true" />
      </div>
      {commands ? (
        <nav
          aria-label={t("快捷页面导航")}
          className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto"
        >
          {matchingLinks.map((link) => (
            <Link
              className={shared.button}
              href={link.href}
              key={link.href}
              onClick={() => setQuickAdd(null)}
            >
              {label(link.label)}
            </Link>
          ))}
          {!matchingLinks.length && <p className={shared.muted}>{t("No matching pages")}</p>}
        </nav>
      ) : (
        <motion.button
          type="submit"
          className={cn(styles.submit, !created && shared.primary, created && styles.submitDone)}
          disabled={!title.trim() || created || pending || !!review}
          whileTap={created ? undefined : { scale: 0.98 }}
        >
          {created ? (
            <>
              <HiCheck size={15} aria-hidden="true" /> {t("已创建")}
            </>
          ) : pending ? (
            t("organize.saving")
          ) : (
            t("Create Task")
          )}
        </motion.button>
      )}
      {!commands && (
        <>
          {(quickDraft.date || quickDraft.time) && (
            <p className={shared.muted} role="status">
              {quickDraft.title} · {quickDraft.date || t("tasks.unscheduled")} ·{" "}
              {quickDraft.time || t("随时")}
            </p>
          )}
          <button
            type="button"
            className={shared.button}
            disabled={!title.trim() || pending || created}
            onClick={async () => {
              if (pendingRef.current) return;
              pendingRef.current = true;
              setPending(true);
              const controller = new AbortController();
              requestRef.current = controller;
              try {
                const parsed = await parseTranscript(title, locale, controller.signal);
                if (controller.signal.aborted) return;
                const drafts = parsed
                  .filter((item) => item.isTodo)
                  .map((item) => ({
                    id: createId(),
                    title: item.title ?? title,
                    list: item.list ?? initialList,
                    date: item.date ?? "",
                    time: item.time ?? undefined,
                  }));
                if (drafts.length) {
                  setReview(drafts);
                  onReviewStateChange(true);
                } else notify({ key: "capture.noTasks" });
              } catch (error) {
                if (!controller.signal.aborted) {
                  const code = error instanceof Error ? error.message : "parse_failed";
                  notify({
                    key:
                      code === "not_configured"
                        ? "capture.notConfigured"
                        : code === "auth_required"
                          ? "capture.authRequired"
                          : code === "rate_limited"
                            ? "capture.rateLimited"
                            : "AI 整理失败，请重试",
                  });
                }
              } finally {
                pendingRef.current = false;
                setPending(false);
                requestRef.current = null;
              }
            }}
          >
            {pending ? t("capture.parsing") : t("capture.parse")}
          </button>
          <p className={shared.muted}>{t("capture.parseHint")}</p>
          <button
            type="button"
            className={shared.textButton}
            disabled={!title.trim() || pending || created}
            onClick={() => {
              setReview([quickDraft]);
              onReviewStateChange(true);
            }}
          >
            {t("organize.adjust")}
          </button>
        </>
      )}
      {review && (
        <TaskCaptureReview
          key={review.map((draft) => draft.id).join(",")}
          open
          drafts={review}
          onOpenChange={(open) => {
            if (!open) {
              setReview(null);
              onReviewStateChange(false);
              if (preset.captures) setQuickAdd(null);
            }
          }}
          onSave={async (drafts) => {
            pendingRef.current = true;
            try {
              const result = await saveCapturedTasks(drafts);
              if (preset.sourceVoice && result.savedIds.length) {
                const saved = drafts.filter((draft) => result.savedIds.includes(draft.id));
                recordVoiceCapture({
                  transcript: preset.sourceVoice.transcript,
                  durationSeconds: preset.sourceVoice.durationSeconds,
                  taskCount: saved.length,
                  parsed: saved.map((draft) => ({
                    isTodo: true,
                    title: draft.title,
                    list: draft.list,
                    date: draft.date || null,
                    time: draft.time ?? null,
                    reason: "",
                  })),
                });
              }
              if (!result.failedIds.length) setQuickAdd(null);
              return result;
            } finally {
              pendingRef.current = false;
            }
          }}
        />
      )}
      <p className={shared.muted}>{t("Enter to create · Esc to close · / to navigate")}</p>
    </form>
  );
}
