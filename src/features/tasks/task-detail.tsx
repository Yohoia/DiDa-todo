"use client";

import { usePathname } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { useWorkspace } from "./workspace-provider";
import { TaskDetailForm, preserveSubtaskEditOnEscape } from "./task-detail-form";
import shared from "@/styles/workspace.module.css";
import styles from "./task-detail.module.css";

export function TaskDetail() {
  const focusReturn = useDialogFocus();
  const pathname = usePathname();
  const {
    selectedId,
    selectTask,
    tasks,
    updateTask,
    deleteTask,
    startFocus,
    notify,
    recurrenceAvailable,
  } = useWorkspace();
  const task = tasks.find((item) => item.id === selectedId);
  return (
    <Dialog
      open={!!task}
      onOpenChange={(open) => {
        if (!open) selectTask(null);
      }}
    >
      <DialogContent
        {...focusReturn}
        variant="drawer"
        className={styles.drawer}
        overlayClassName={shared.overlay}
        closeButtonClassName={shared.close}
        onEscapeKeyDown={preserveSubtaskEditOnEscape}
      >
        {task && (
          <TaskDetailForm
            key={task.id}
            task={task}
            recurrenceAvailable={recurrenceAvailable}
            onChange={(patch) => updateTask(task.id, patch)}
            onDelete={() => deleteTask(task.id)}
            onStartFocus={() => startFocus(task.id)}
            onListChange={(list) => {
              notify({ key: "tasks.movedToList", values: { list } });
              if (task.list === "Inbox" && pathname === "/inbox") selectTask(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
