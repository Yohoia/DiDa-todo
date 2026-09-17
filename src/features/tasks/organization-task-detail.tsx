"use client";

import { useState } from "react";
import { DialogContent } from "@/components/ui/dialog";
import { useI18n } from "@/features/preferences/preferences-provider";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/i18n/messages";
import type { Task } from "@/types/task";
import type { TaskOrganizationDraft } from "@/types/task-organization";
import { organizationDraftError, updateOrganizationDraft } from "./organization-editor";
import { TaskDetailForm, preserveSubtaskEditOnEscape } from "./task-detail-form";
import shared from "@/styles/workspace.module.css";
import detail from "./task-detail.module.css";
import styles from "./ai-organize-dialog.module.css";

/** Dialog and draft state only: all editable fields come from the complete task detail form. */
export function OrganizationTaskDetail({
  task,
  draft,
  recurrenceAvailable,
  onCancel,
  onSave,
}: {
  task: Task;
  draft: TaskOrganizationDraft;
  recurrenceAvailable: boolean;
  onCancel: () => void;
  onSave: (draft: TaskOrganizationDraft) => void;
}) {
  const { t } = useI18n();
  const [localDraft, setLocalDraft] = useState<TaskOrganizationDraft>(() => ({
    ...draft,
    tags: [...draft.tags],
  }));
  const error = organizationDraftError(localDraft);
  const draftTask: Task = { ...task, ...localDraft, time: localDraft.time ?? undefined };
  return (
    <DialogContent
      variant="drawer"
      className={cn(detail.drawer, styles.detailDrawer)}
      overlayClassName={styles.detailOverlay}
      closeButtonClassName={shared.close}
      onEscapeKeyDown={preserveSubtaskEditOnEscape}
    >
      <TaskDetailForm
        task={draftTask}
        draft
        dateLocked
        recurrenceAvailable={recurrenceAvailable}
        onChange={(patch) => setLocalDraft((current) => updateOrganizationDraft(current, patch))}
      >
        {error && (
          <p className={styles.validation} role="alert">
            {t(error as MessageKey)}
          </p>
        )}
        <footer className={styles.detailActions}>
          <button type="button" className={shared.button} onClick={onCancel}>
            {t("取消")}
          </button>
          <button
            type="button"
            className={styles.apply}
            disabled={!!error}
            onClick={() => onSave(localDraft)}
          >
            {t("确定")}
          </button>
        </footer>
      </TaskDetailForm>
    </DialogContent>
  );
}
