"use client";

import { useI18n } from "@/features/preferences/preferences-provider";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import { useMemo, useState, type CSSProperties } from "react";
import { useTodayKey } from "@/hooks/use-today-key";
import { buildMonthCalendar, parseDateKey } from "@/lib/date-utils";
import { MonthPickerModal } from "./month-picker-modal";
import { cn } from "@/lib/utils";
import styles from "./day-calendar.module.css";

type DayCalendarProps = {
  /** Selected day as YYYY-MM-DD; the collapsed strip shows this day's week. */
  selectedKey: string;
  onSelect: (key: string) => void;
  firstDay: "Monday" | "Sunday";
  /** Date keys that have at least one task; rendered as a dot under the day. */
  datesWithTodos: Set<string>;
};

/**
 * Collapsible month calendar: collapsed it shows only the selected day's week
 * (weekday labels + one row), expanded the full month with a nav header. The
 * whole 6-week grid is always rendered; collapsing just slides the sheet up so
 * the selected row lands under the weekday labels.
 */
export function DayCalendar({ selectedKey, onSelect, firstDay, datesWithTodos }: DayCalendarProps) {
  const { t, date: formatDate } = useI18n();
  const todayKey = useTodayKey();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // The viewed month always follows the selected day: month arrows select the
  // 1st, grey adjacent days select themselves, so no separate anchor state.
  const anchor = useMemo(() => parseDateKey(selectedKey), [selectedKey]);

  const weekStartsOn = firstDay === "Sunday" ? 0 : 1;
  const cells = useMemo(
    () => buildMonthCalendar(anchor.year, anchor.month, weekStartsOn),
    [anchor, weekStartsOn],
  );
  // Row of the selected day inside the flat 6-week grid drives the collapsed shift.
  const selectedRow = useMemo(() => {
    const index = cells.findIndex((cell) => cell.key === selectedKey);
    return index === -1 ? null : Math.floor(index / 7);
  }, [cells, selectedKey]);

  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, column) => {
        // 2024-01-01 is a Monday; offset by week start to get each column's weekday.
        const day = new Date(2024, 0, 1 + ((weekStartsOn + column + 6) % 7));
        return formatDate(day, { weekday: "short" });
      }),
    [formatDate, weekStartsOn],
  );

  function selectCell(key: string) {
    if (key === selectedKey) {
      setOpen((value) => !value);
      return;
    }
    onSelect(key);
    // 选定日期后自动收起，回到单周视图（收起状态下为无操作）
    setOpen(false);
  }
  function shiftMonth(direction: 1 | -1) {
    const month = anchor.month + direction;
    const year = month < 0 ? anchor.year - 1 : month > 11 ? anchor.year + 1 : anchor.year;
    const clamped = ((month + 12) % 12) as number;
    // Demo behaviour: switching months lands on the 1st, keeping a day selected.
    onSelect(`${year}-${String(clamped + 1).padStart(2, "0")}-01`);
  }
  function confirmMonth(year: number, month: number) {
    // Keep the selected day, clamped into the picked month's length.
    const day = Math.min(parseDateKey(selectedKey).day, new Date(year, month + 1, 0).getDate());
    onSelect(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }

  const title = formatDate(new Date(anchor.year, anchor.month, 1), {
    year: "numeric",
    month: "long",
  });

  return (
    <div className={styles.anchor}>
      <section
        className={cn(styles.box, open && styles.open)}
        style={{ "--shift": selectedRow ?? 0 } as CSSProperties}
        aria-label={t("schedule.calendarRegion")}
      >
        <div className={styles.topMask} aria-hidden="true" />
        <button
          type="button"
          className={styles.handle}
          aria-expanded={open}
          aria-label={open ? t("schedule.collapseCalendar") : t("schedule.expandCalendar")}
          onClick={() => setOpen((value) => !value)}
        />
        <div className={cn(styles.sheet, !open && styles.collapsedSheet)}>
          {/* 收起时月份标题被遮罩盖住，inert 让其退出焦点序列并挡住穿透点击 */}
          <div className={styles.monthHeader} inert={!open}>
            <button
              type="button"
              className={styles.monthArrow}
              aria-label={t("上一月")}
              onClick={() => shiftMonth(-1)}
            >
              <HiChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.monthTitle}
              aria-label={t("选择月份")}
              title={t("选择月份")}
              onClick={() => setPickerOpen(true)}
            >
              {title}
            </button>
            <button
              type="button"
              className={styles.monthArrow}
              aria-label={t("下一月")}
              onClick={() => shiftMonth(1)}
            >
              <HiChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.spacer} aria-hidden="true" />
          <div className={styles.grid}>
            {cells.map((cell) => {
              const isSelected = cell.key === selectedKey;
              // 收起时只有选中行可见，其余行 inert：不可聚焦也不可点击
              const rowHidden = !open && Math.floor(cell.id / 7) !== (selectedRow ?? 0);
              return (
                <button
                  type="button"
                  key={cell.id}
                  className={cn(
                    styles.day,
                    cell.type !== "normal" && styles.adjacent,
                    isSelected && styles.selected,
                  )}
                  aria-label={t("schedule.selectDay", { date: cell.key })}
                  aria-current={isSelected ? "date" : undefined}
                  inert={rowHidden}
                  onClick={() => selectCell(cell.key)}
                >
                  <span
                    className={cn(styles.dayNum, cell.key === todayKey && styles.today)}
                    aria-hidden="true"
                  >
                    {cell.day}
                  </span>
                  <span
                    className={cn(
                      styles.dot,
                      datesWithTodos.has(cell.key) && styles.hasTodo,
                      cell.type !== "normal" && styles.adjacentDot,
                    )}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>
        <div className={cn(styles.weekdays, open && styles.weekdaysOpen)} aria-hidden="true">
          {weekdayLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </section>
      <MonthPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        year={anchor.year}
        month={anchor.month}
        onConfirm={confirmMonth}
      />
    </div>
  );
}
