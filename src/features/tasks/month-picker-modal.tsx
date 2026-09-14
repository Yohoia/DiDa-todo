"use client";

import { useI18n } from "@/features/preferences/preferences-provider";

import { useState } from "react";
import Picker from "react-mobile-picker";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import styles from "./month-picker-modal.module.css";

const YEARS = Array.from({ length: 101 }, (_, index) => 1950 + index);
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

/**
 * Scroll-wheel month picker opened from the calendar's month title, mirroring
 * the reference demo: cancel / title / confirm header plus year & month wheels.
 */
export function MonthPickerModal({
  open,
  onOpenChange,
  year,
  month,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Currently viewed year. */
  year: number;
  /** Currently viewed month, 0-11. */
  month: number;
  onConfirm: (year: number, month: number) => void;
}) {
  const { t } = useI18n();
  const [wheel, setWheel] = useState(() => ({ year, month: month + 1 }));
  // Re-align the wheels with the current month every time the dialog opens.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) setWheel({ year, month: month + 1 });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={styles.dialog}
        closeButtonClassName={styles.hidden}
        onOpenAutoFocus={(event) => event.preventDefault()}
        /* 只允许取消 / 确定 / Esc 关闭；点击遮罩与其他区域不关闭 */
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogTitle className={styles.srTitle}>{t("选择月份")}</DialogTitle>
        <DialogDescription className="sr-only">{t("选择月份")}</DialogDescription>
        <div className={styles.header}>
          <button type="button" className={styles.cancel} onClick={() => onOpenChange(false)}>
            {t("取消")}
          </button>
          <strong className={styles.title}>{t("选择月份")}</strong>
          <button
            type="button"
            className={styles.confirm}
            onClick={() => {
              onConfirm(wheel.year, wheel.month - 1);
              onOpenChange(false);
            }}
          >
            {t("确定")}
          </button>
        </div>
        <div className={styles.captions} aria-hidden="true">
          <span className={styles.captionYear}>{t("年")}</span>
          <span className={styles.captionMonth}>{t("月")}</span>
        </div>
        <div className={styles.wheelGrid}>
          <Picker
            value={wheel}
            onChange={(next) => setWheel({ year: Number(next.year), month: Number(next.month) })}
            className={styles.wheel}
            height={180}
            itemHeight={36}
            wheelMode="natural"
          >
            <Picker.Column name="year" style={{ width: 96, flex: "0 0 96px" }}>
              {YEARS.map((value) => (
                <Picker.Item key={value} value={value}>
                  {({ selected }) => (
                    <span className={cn(styles.item, selected && styles.itemSelected)}>
                      {value}
                      {t("年")}
                    </span>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
            <Picker.Column name="month" style={{ width: 72, flex: "0 0 72px" }}>
              {MONTHS.map((value) => (
                <Picker.Item key={value} value={value}>
                  {({ selected }) => (
                    <span className={cn(styles.item, selected && styles.itemSelected)}>
                      {value}
                      {t("月")}
                    </span>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
          </Picker>
          <div className={styles.highlight} aria-hidden="true" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
