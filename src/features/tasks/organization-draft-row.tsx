"use client";

import { useState } from "react";
import { HiCheck, HiOutlinePencil } from "react-icons/hi2";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/features/preferences/preferences-provider";
import type { Task } from "@/types/task";
import type { TaskOrganizationDraft, TaskOrganizationSuggestion } from "@/types/task-organization";
import type { MessageKey } from "@/i18n/messages";
import { isOrganizationEdited, organizationDraftError } from "./organization-editor";
import { OrganizationTaskDetail } from "./organization-task-detail";
import styles from "./ai-organize-dialog.module.css";

export function OrganizationDraftRow({
  task,
  original,
  draft,
  checked,
  disabled,
  recurrenceAvailable,
  onToggle,
  onChange,
}: {
  task: Task;
  original: TaskOrganizationSuggestion;
  draft: TaskOrganizationDraft;
  checked: boolean;
  disabled: boolean;
  recurrenceAvailable: boolean;
  onToggle: () => void;
  onChange: (draft: TaskOrganizationDraft) => void;
}) {
  const { t, label } = useI18n();
  const [editing, setEditing] = useState(false);
  const edited = isOrganizationEdited(original, draft, task);
  const title = draft.title ?? task.title;
  const description = draft.description ?? task.description;
  const error = organizationDraftError(draft);
  return (
    <article className={styles.result}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={t("应用任务整理：{title}", { title })}
        className={styles.check}
        disabled={disabled}
        onClick={onToggle}
      >
        <span className={styles.checkMark}>
          {checked && <HiCheck size={12} aria-hidden="true" />}
        </span>
      </button>
      <div className={styles.resultBody}>
        <h3>{title}</h3>
        {description && <p className={styles.taskDescription}>{description}</p>}
        <div className={styles.meta}>
          <span>{draft.time ?? t("随时")}</span>
          <span>{label(draft.list)}</span>
          <span>P{draft.priority}</span>
          <span>{t("{count} 个番茄钟", { count: String(draft.estimate) })}</span>
        </div>
        <div className={styles.tags}>
          {draft.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
        {original.reason && <p>{original.reason}</p>}
        {edited && (
          <div className={styles.editActions}>
            <button type="button" disabled={disabled} onClick={() => onChange({ ...original })}>
              {t("organize.restoreAi")}
            </button>
          </div>
        )}
        {checked && error && (
          <p className={styles.validation} role="alert">
            {t(error as MessageKey)}
          </p>
        )}
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogTrigger asChild>
          <button
            type="button"
            className={styles.editIcon}
            aria-label={t("organize.editTask", { title })}
            title={t("organize.adjust")}
            disabled={disabled}
          >
            <HiOutlinePencil size={16} aria-hidden="true" />
          </button>
        </DialogTrigger>
        {editing && (
          <OrganizationTaskDetail
            task={task}
            recurrenceAvailable={recurrenceAvailable}
            draft={draft}
            onCancel={() => setEditing(false)}
            onSave={(next) => {
              onChange(next);
              setEditing(false);
            }}
          />
        )}
      </Dialog>
    </article>
  );
}
