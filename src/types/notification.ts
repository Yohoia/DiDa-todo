/** 站内通知：任务到期提醒与当日摘要。 */
export type AppNotification = {
  id: string;
  type: "task_due" | "daily_digest";
  taskId?: string;
  /** 聚合通知的幂等键（任务提醒使用 task:<id>）。 */
  dedupeKey?: string;
  /** 任务标题快照（任务后续改名不影响已生成的通知可读性） */
  title: string;
  /** 聚合通知展示所需的稳定数据，避免把界面语言固化进事实行。 */
  dailyDigest?: { count: number };
  /** 应提醒的时间（ISO 字符串） */
  remindAt: string;
  read: boolean;
  createdAt: string;
  /** 手动清空后隐藏，但保留任务去重记录，避免再次补扫生成。 */
  dismissedAt?: string;
};
