"use client";

import { motion, useReducedMotion } from "framer-motion";

import styles from "./insights.module.css";

export type RhythmDay = {
  key: string;
  /** 星期缩写（一 / M） */
  label: string;
  /** 已本地化的时长文案（如 “25 分钟”） */
  valueLabel: string;
  /** 悬停提示（日期 + 时长） */
  title: string;
  minutes: number;
  level: number;
  isToday: boolean;
};

const TRACK_HEIGHT = 118;
const MIN_BAR_HEIGHT = 4;

/**
 * 近 7 天专注节奏：条形从基线生长，数值随条形顶部上移；
 * 空白天保持一条浅色基线，今天一列以金色强调。
 */
export function FocusRhythm({ days, ariaLabel }: { days: RhythmDay[]; ariaLabel: string }) {
  const reduceMotion = useReducedMotion();
  const maxMinutes = Math.max(...days.map((day) => day.minutes), 60);
  return (
    <div className={styles.rhythm} role="img" aria-label={ariaLabel}>
      {days.map((day, index) => {
        const height =
          day.minutes === 0
            ? MIN_BAR_HEIGHT
            : Math.max(16, Math.round((day.minutes / maxMinutes) * TRACK_HEIGHT));
        return (
          <div
            key={day.key}
            className={styles.rhythmColumn}
            data-today={day.isToday || undefined}
            title={day.title}
          >
            <div className={styles.rhythmTrack}>
              <motion.div
                className={styles.rhythmBar}
                data-level={day.level}
                data-empty={day.minutes === 0 || undefined}
                initial={reduceMotion ? false : { height: MIN_BAR_HEIGHT }}
                animate={{ height }}
                transition={{ duration: 0.7, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className={styles.rhythmValue}>{day.valueLabel}</span>
              </motion.div>
            </div>
            <span className={styles.rhythmDay}>{day.label}</span>
          </div>
        );
      })}
    </div>
  );
}
