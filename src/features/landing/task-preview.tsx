"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { Plus } from "lucide-react";

import { AuthTrigger } from "@/features/auth/auth-dialog";
import { cn } from "@/lib/utils";

import { previewTasks } from "./landing-content";
import styles from "./landing.module.css";

export function TaskPreview() {
  const { t, label } = useI18n();
  return (
    <div className={styles.heroRight} aria-label={t("今日任务预览")}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.mockupWindow}>
        <div className={styles.mockupHeader}>
          <div>
            <div className={styles.mTitle}>{t("Today")}</div>
            <div className={styles.mDate}>{t("FRIDAY, SEP 4")}</div>
          </div>
          <AuthTrigger className={styles.addTask} aria-label={t("登录以添加任务")}>
            <Plus size={22} strokeWidth={1.5} />
          </AuthTrigger>
        </div>
        <div className={styles.mockupBody}>
          {previewTasks.map((task, index) => (
            <label className={styles.taskItem} key={task.title}>
              <input
                type="checkbox"
                className={styles.taskCheckbox}
                aria-label={t("tasks.complete", { title: task.title })}
              />
              <span className={styles.taskContent}>
                <span className={styles.taskTitle}>{task.title}</span>
                <span className={styles.taskTime}>{task.time}</span>
              </span>
              <span className={cn(styles.taskTag, index === 0 && styles.tagGold)}>
                {label(task.tag)}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
