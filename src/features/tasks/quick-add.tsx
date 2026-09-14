"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { useDialogFocus } from "@/hooks/use-dialog-focus";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { HiCheck } from "react-icons/hi2";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { workspaceLinks } from "@/components/layout/workspace-nav";
import { useWorkspace } from "./workspace-provider";
import type { TaskList } from "@/types/task";
import { cn } from "@/lib/utils";
import shared from "@/styles/workspace.module.css";
import styles from "./quick-add.module.css";

export function QuickAdd() {
  const { t } = useI18n();
  const focusReturn = useDialogFocus();
  const { quickAdd, setQuickAdd } = useWorkspace();
  const pathname = usePathname();
  return (
    <Dialog
      open={quickAdd !== null}
      onOpenChange={(open) => {
        if (!open) setQuickAdd(null);
      }}
    >
      <DialogContent
        {...focusReturn}
        className={shared.dialog}
        overlayClassName={shared.overlay}
        closeButtonClassName={shared.close}
      >
        <DialogTitle>{t("Quick Add")}</DialogTitle>
        <DialogDescription>{t("记录一个想法，或者输入 / 跳转到其他页面。")}</DialogDescription>
        {quickAdd && (
          <QuickAddForm
            key={`${quickAdd.list}-${quickAdd.date ?? ""}-${quickAdd.time ?? ""}-${pathname}`}
            initialList={quickAdd.list}
            initialDate={quickAdd.date}
            initialTime={quickAdd.time}
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
}: {
  initialList: TaskList;
  initialDate?: string;
  initialTime?: string;
}) {
  const { t, label } = useI18n();
  const { addTask, setQuickAdd } = useWorkspace();
  const router = useRouter();
  const [title, setTitle] = useState("");
  // 预设的清单/日期/时间不再铺开成表单，静默生效：从日程页进入时任务直接落在选中日
  const [created, setCreated] = useState(false);

  const commands = title.startsWith("/");
  const matchingLinks = workspaceLinks.filter((link) =>
    `${link.label} ${link.description} ${label(link.label)} ${label(link.description)}`
      .toLowerCase()
      .includes(title.slice(1).toLowerCase()),
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || created) return;
    if (commands) {
      if (matchingLinks[0]) {
        router.push(matchingLinks[0].href);
        setQuickAdd(null);
      }
      return;
    }
    addTask(title, initialList, initialDate, initialTime || undefined);
    setCreated(true);
    setTimeout(() => setQuickAdd(null), 560);
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <div className={styles.titleBox}>
        <label className="sr-only" htmlFor="quick-task-title">
          {t("任务标题或页面名称")}
        </label>
        <input
          id="quick-task-title"
          className={styles.title}
          placeholder={t("What needs to be done?")}
          maxLength={200}
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
          disabled={!title.trim() || created}
          whileTap={created ? undefined : { scale: 0.98 }}
        >
          {created ? (
            <>
              <HiCheck size={15} aria-hidden="true" /> {t("已创建")}
            </>
          ) : (
            t("Create Task")
          )}
        </motion.button>
      )}
      <p className={shared.muted}>{t("Enter to create · Esc to close · / to navigate")}</p>
    </form>
  );
}
