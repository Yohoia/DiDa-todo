"use client";

import { useId } from "react";
import { useI18n } from "@/features/preferences/preferences-provider";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";
import { TASK_DESCRIPTION_LIMIT, TASK_TITLE_LIMIT } from "./task-content";
import styles from "./task-detail.module.css";

export function TaskContentFields({
  value,
  onChange,
}: {
  value: Pick<Task, "title" | "description">;
  onChange: (patch: Partial<Pick<Task, "title" | "description">>) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <>
      <label className="sr-only" htmlFor={`${id}-title`}>
        {t("任务标题")}
      </label>
      <input
        id={`${id}-title`}
        className={styles.title}
        value={value.title}
        aria-required="true"
        maxLength={TASK_TITLE_LIMIT}
        onChange={(event) => onChange({ title: event.target.value })}
      />
      <div className={styles.descriptionWrap}>
        <label className="sr-only" htmlFor={`${id}-description`}>
          {t("任务描述")}
        </label>
        <textarea
          id={`${id}-description`}
          className={styles.description}
          value={value.description}
          placeholder={t("Add a description...")}
          maxLength={TASK_DESCRIPTION_LIMIT}
          onChange={(event) => onChange({ description: event.target.value })}
        />
        <span
          className={cn(
            styles.counter,
            value.description.length >= TASK_DESCRIPTION_LIMIT && styles.counterMax,
          )}
          aria-hidden="true"
        >
          {value.description.length}/{TASK_DESCRIPTION_LIMIT}
        </span>
      </div>
    </>
  );
}
