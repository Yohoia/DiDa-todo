"use client";

import { useRef, useState } from "react";
import Picker from "react-mobile-picker";
import * as Popover from "@radix-ui/react-popover";
import { HiCalendarDays } from "react-icons/hi2";

import { useI18n } from "@/features/preferences/preferences-provider";
import { cn } from "@/lib/utils";

import styles from "./datetime-picker.module.css";

export type DateTimeValue = { date: string; time?: string };

const pad = (value: number) => String(value).padStart(2, "0");
const digits = (text: string) => text.replace(/\D/g, "");
const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const HOUR_ITEMS = Array.from({ length: 24 }, (_, hour) => ({ value: hour, label: pad(hour) }));
const MINUTE_ITEMS = Array.from({ length: 60 }, (_, minute) => ({
  value: minute,
  label: pad(minute),
}));
// react-mobile-picker stretches columns by default (inline flex:1); pin the width.
const COLUMN_STYLE = { width: 64, flex: "0 0 64px" } as const;

function parseISODate(iso: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
}
function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function parseTime(time?: string): { hour: number; minute: number } {
  const [hour, minute] = (time || "09:00").split(":").map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function DateTimePicker({
  value,
  onChange,
  className,
  dateLocked = false,
}: {
  value: DateTimeValue;
  onChange: (value: DateTimeValue) => void;
  className?: string;
  /** AI organization may adjust time but must keep the original task day. */
  dateLocked?: boolean;
}) {
  const { t, date: formatDate } = useI18n();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [wheel, setWheel] = useState(() => parseTime(value.time));
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);

  const syncFromValue = () => {
    const base = parseISODate(value.date) ?? new Date();
    setYear(String(base.getFullYear()));
    setMonth(pad(base.getMonth() + 1));
    setDay(pad(base.getDate()));
    setWheel(parseTime(value.time));
  };

  const handleYear = (raw: string) => {
    const next = digits(raw).slice(0, 4);
    setYear(next);
    if (next.length === 4) monthRef.current?.focus();
  };

  const handleMonth = (raw: string) => {
    const next = digits(raw).slice(0, 2);
    if (next.length === 2 && Number(next) > 12) {
      setMonth("12");
      dayRef.current?.focus();
      return;
    }
    setMonth(next);
    if (next.length === 2) dayRef.current?.focus();
  };

  const handleDay = (raw: string) => {
    const next = digits(raw).slice(0, 2);
    const max = daysInMonth(Number(year) || new Date().getFullYear(), Number(month) || 1);
    if (next.length === 2 && Number(next) > max) {
      setDay(String(max));
      return;
    }
    setDay(next);
  };

  const focusPrevious = (
    event: React.KeyboardEvent<HTMLInputElement>,
    target: "year" | "month",
  ) => {
    if (event.key === "Backspace" && event.currentTarget.value === "") {
      event.preventDefault();
      (target === "year" ? yearRef : monthRef).current?.focus();
    }
  };

  const padOnBlur =
    (setValue: (next: string) => void) => (event: React.FocusEvent<HTMLInputElement>) => {
      const next = digits(event.target.value);
      setValue(next ? pad(Number(next)) : next);
    };

  const commit = (withTime: boolean) => {
    const now = new Date();
    const finalYear = clamp(Number(year) || now.getFullYear(), 1900, 2100);
    const finalMonth = clamp(Number(month) || now.getMonth() + 1, 1, 12);
    const finalDay = clamp(Number(day) || now.getDate(), 1, daysInMonth(finalYear, finalMonth));
    onChange({
      date: dateLocked ? value.date : toISODate(new Date(finalYear, finalMonth - 1, finalDay)),
      time: withTime ? `${pad(wheel.hour)}:${pad(wheel.minute)}` : undefined,
    });
    setOpen(false);
  };

  const triggerLabel = value.date
    ? formatDate(value.date, { month: "short", day: "numeric" }) +
      (value.time ? ` ${value.time}` : "")
    : t("选择日期");

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) syncFromValue();
        setOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(styles.trigger, className)}
          aria-label={t("选择日期与时间")}
        >
          <HiCalendarDays size={13} aria-hidden="true" />
          {triggerLabel}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={styles.panel}
          align="end"
          sideOffset={8}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          {
            <div className={styles.dateRow}>
              <input
                ref={yearRef}
                disabled={dateLocked}
                className={cn(styles.dateInput, styles.year)}
                inputMode="numeric"
                placeholder="YYYY"
                aria-label={t("年")}
                value={year}
                onFocus={(event) => event.target.select()}
                onChange={(event) => handleYear(event.target.value)}
              />
              <span className={styles.slash} aria-hidden="true">
                /
              </span>
              <input
                ref={monthRef}
                disabled={dateLocked}
                className={styles.dateInput}
                inputMode="numeric"
                placeholder="MM"
                aria-label={t("月")}
                value={month}
                onFocus={(event) => event.target.select()}
                onChange={(event) => handleMonth(event.target.value)}
                onBlur={padOnBlur(setMonth)}
                onKeyDown={(event) => focusPrevious(event, "year")}
              />
              <span className={styles.slash} aria-hidden="true">
                /
              </span>
              <input
                ref={dayRef}
                disabled={dateLocked}
                className={styles.dateInput}
                inputMode="numeric"
                placeholder="DD"
                aria-label={t("日")}
                value={day}
                onFocus={(event) => event.target.select()}
                onChange={(event) => handleDay(event.target.value)}
                onBlur={padOnBlur(setDay)}
                onKeyDown={(event) => focusPrevious(event, "month")}
              />
            </div>
          }
          <div className={styles.wheelCaptions}>
            <span className={styles.wheelCaption}>{t("时")}</span>
            {/* Ghost colon keeps the captions on the same grid as the wheels. */}
            <span className={cn(styles.colon, styles.colonGhost)} aria-hidden="true">
              :
            </span>
            <span className={styles.wheelCaption}>{t("分")}</span>
          </div>
          <div className={styles.wheelGrid}>
            <Picker
              value={wheel}
              onChange={(next) =>
                setWheel({ hour: Number(next.hour), minute: Number(next.minute) })
              }
              className={styles.wheelRow}
              height={144}
              itemHeight={36}
              wheelMode="natural"
            >
              <Picker.Column name="hour" style={COLUMN_STYLE}>
                {HOUR_ITEMS.map((item) => (
                  <Picker.Item key={item.value} value={item.value}>
                    {({ selected }) => (
                      <span className={cn(styles.wheelItem, selected && styles.wheelItemSelected)}>
                        {item.label}
                      </span>
                    )}
                  </Picker.Item>
                ))}
              </Picker.Column>
              <span className={styles.colon} aria-hidden="true">
                :
              </span>
              <Picker.Column name="minute" style={COLUMN_STYLE}>
                {MINUTE_ITEMS.map((item) => (
                  <Picker.Item key={item.value} value={item.value}>
                    {({ selected }) => (
                      <span className={cn(styles.wheelItem, selected && styles.wheelItemSelected)}>
                        {item.label}
                      </span>
                    )}
                  </Picker.Item>
                ))}
              </Picker.Column>
            </Picker>
            <div className={styles.wheelHighlight} aria-hidden="true" />
          </div>
          <div className={styles.footer}>
            <button type="button" className={styles.ghost} onClick={() => commit(false)}>
              {t("Any")}
            </button>
            <button type="button" className={styles.primary} onClick={() => commit(true)}>
              {t("确定")}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
