"use client";

import { useId, useState } from "react";
import { HiCheck } from "react-icons/hi2";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/features/preferences/preferences-provider";
import type { Task } from "@/types/task";
import type { TaskOrganizationDraft, TaskOrganizationSuggestion } from "@/types/task-organization";
import type { MessageKey } from "@/i18n/messages";
import {
  isOrganizationEdited,
  organizationDraftError,
  parseOrganizationTags,
} from "./organization-editor";
import styles from "./ai-organize-dialog.module.css";

export function OrganizationDraftRow({
  task,
  original,
  draft,
  checked,
  disabled,
  onToggle,
  onChange,
}: {
  task: Task;
  original: TaskOrganizationSuggestion;
  draft: TaskOrganizationDraft;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  onChange: (draft: TaskOrganizationDraft) => void;
}) {
  const { t, label } = useI18n();
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [tagInput, setTagInput] = useState(draft.tags.join(", "));
  const edited = isOrganizationEdited(original, draft);
  const error = organizationDraftError(draft);
  return (
    <article className={styles.result}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={t("应用任务整理：{title}", { title: task.title })}
        className={styles.check}
        disabled={disabled}
        onClick={onToggle}
      >
        {checked && <HiCheck size={12} aria-hidden="true" />}
      </button>
      <div className={styles.resultBody}>
        <div className={styles.rowHeading}>
          <h3>{task.title}</h3>
          <span className={styles.source}>
            {edited ? t("organize.humanAdjusted") : t("organize.aiSuggestion")}
          </span>
        </div>
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
        <div className={styles.editActions}>
          <button
            type="button"
            aria-expanded={editing}
            aria-controls={`${id}-editor`}
            disabled={disabled}
            onClick={() => setEditing(!editing)}
          >
            {editing ? t("organize.collapse") : t("organize.adjust")}
          </button>
          {edited && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange({ ...original });
                setTagInput(original.tags.join(", "));
              }}
            >
              {t("organize.restoreAi")}
            </button>
          )}
        </div>
        {editing && (
          <div id={`${id}-editor`} className={styles.editor}>
            <label htmlFor={`${id}-time`}>
              {t("Time")}
              <input
                id={`${id}-time`}
                type="time"
                value={draft.time ?? ""}
                disabled={disabled}
                onChange={(event) =>
                  onChange({ ...draft, time: event.target.value || null, timeEdited: true })
                }
              />
            </label>
            <div className={styles.editorField}>
              <span>{t("List")}</span>
              <Select
                value={draft.list}
                ariaLabel={t("List")}
                disabled={disabled}
                options={(["Inbox", "Work", "Study", "Life"] as const).map((value) => ({
                  value,
                  label: label(value),
                }))}
                onValueChange={(list) => onChange({ ...draft, list })}
              />
            </div>
            <div className={styles.editorField}>
              <span>{t("Priority")}</span>
              <Select
                value={String(draft.priority)}
                ariaLabel={t("Priority")}
                disabled={disabled}
                options={([1, 2, 3] as const).map((value) => ({
                  value: String(value),
                  label: `P${value}`,
                }))}
                onValueChange={(priority) =>
                  onChange({ ...draft, priority: Number(priority) as 1 | 2 | 3 })
                }
              />
            </div>
            <label htmlFor={`${id}-estimate`}>
              {t("Estimate")}
              <input
                id={`${id}-estimate`}
                type="number"
                min={1}
                max={16}
                step={1}
                value={Number.isFinite(draft.estimate) ? draft.estimate : ""}
                disabled={disabled}
                onChange={(event) => onChange({ ...draft, estimate: event.target.valueAsNumber })}
              />
            </label>
            <label className={styles.tagsField} htmlFor={`${id}-tags`}>
              {t("Tags")}
              <input
                id={`${id}-tags`}
                value={tagInput}
                disabled={disabled}
                placeholder={t("organize.tagsHint")}
                onChange={(event) => {
                  setTagInput(event.target.value);
                  onChange({ ...draft, tags: parseOrganizationTags(event.target.value) });
                }}
              />
            </label>
            <p className={styles.editorHint}>{t("organize.draftHint")}</p>
          </div>
        )}
        {checked && error && (
          <p className={styles.validation} role="alert">
            {t(error as MessageKey)}
          </p>
        )}
      </div>
    </article>
  );
}
