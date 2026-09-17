"use client";

import { useRef, useState } from "react";
import { HiXMark } from "react-icons/hi2";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Stepper } from "@/components/ui/stepper";
import { useI18n } from "@/features/preferences/preferences-provider";
import { cn } from "@/lib/utils";
import { ORGANIZED_LISTS, type Task, type TaskList } from "@/types/task";
import shared from "@/styles/workspace.module.css";
import styles from "./task-detail.module.css";

export type TaskOrganizationValues = Pick<
  Task,
  "date" | "time" | "priority" | "list" | "tags" | "estimate"
>;

/** Shared by live task details and local AI drafts; persistence belongs to the caller. */
export function TaskOrganizationFields({
  value,
  onChange,
  dateLocked = false,
  allowInbox = false,
}: {
  value: TaskOrganizationValues;
  onChange: (patch: Partial<TaskOrganizationValues>) => void;
  dateLocked?: boolean;
  allowInbox?: boolean;
}) {
  const { t, label } = useI18n();
  const [tagDraft, setTagDraft] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);
  const addTag = () => {
    const tag = tagDraft.trim().replace(/^#/, "");
    setTagDraft("");
    if (!tag || value.tags.includes(tag) || value.tags.length >= 3) return;
    onChange({ tags: [...value.tags, tag] });
  };
  const lists: readonly TaskList[] = allowInbox ? ["Inbox", ...ORGANIZED_LISTS] : ORGANIZED_LISTS;

  return (
    <>
      <div className={styles.property}>
        <span>{t("Date")}</span>
        <DateTimePicker
          value={{ date: value.date, time: value.time }}
          dateLocked={dateLocked}
          onChange={(next) =>
            onChange(dateLocked ? { time: next.time } : { date: next.date, time: next.time })
          }
        />
      </div>
      <div className={styles.property}>
        <span>{t("Priority")}</span>
        <SegmentedControl
          ariaLabel={t("Priority")}
          value={value.priority}
          onChange={(priority) => onChange({ priority })}
          options={[
            { value: 1 as const, label: t("P1 · High"), dot: "var(--destructive)" },
            { value: 2 as const, label: t("P2 · Medium"), dot: "var(--brand-gold)" },
            { value: 3 as const, label: t("P3 · Low"), dot: "var(--muted-foreground)" },
          ]}
        />
      </div>
      <div className={styles.property}>
        <span>{t("List")}</span>
        <Select
          ariaLabel={t("List")}
          value={value.list}
          placeholder={t("待整理")}
          onValueChange={(list) => onChange({ list })}
          align="end"
          options={lists.map((list) => ({ value: list, label: label(list) }))}
        />
      </div>
      <div className={styles.property}>
        <span>{t("Tags")}</span>
        <div
          className={styles.tagField}
          onClick={(event) => {
            if (!(event.target as HTMLElement).closest("button")) tagInputRef.current?.focus();
          }}
        >
          {value.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={cn(shared.tag, styles.tagChip)}
              aria-label={t("tasks.removeTag", { tag })}
              onClick={() => onChange({ tags: value.tags.filter((item) => item !== tag) })}
            >
              <span className={styles.tagChipLabel}>#{tag}</span>
              <span className={styles.tagChipX} aria-hidden="true">
                <HiXMark size={11} />
              </span>
            </button>
          ))}
          {value.tags.length < 3 && (
            <input
              ref={tagInputRef}
              className={styles.tagInput}
              value={tagDraft}
              placeholder={value.tags.length === 0 ? t("Add a tag") : ""}
              maxLength={12}
              aria-label={t("Add a tag")}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "," || event.key === "，") {
                  event.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
            />
          )}
        </div>
      </div>
      <div className={styles.property}>
        <span>{t("Estimate")}</span>
        <span>
          <Stepper
            label={t("预计番茄钟数量")}
            decreaseLabel={t("减少")}
            increaseLabel={t("增加")}
            value={value.estimate}
            min={1}
            max={16}
            onChange={(estimate) => onChange({ estimate })}
          />{" "}
          {t("Pomodoros")}
        </span>
      </div>
    </>
  );
}
