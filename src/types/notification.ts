/** 站内通知：目前只有任务到期提醒一种类型。 */
export type AppNotification = {
  id: string;
  type: "task_due";
  taskId: string;
  /** 任务标题快照（任务后续改名不影响已生成的通知可读性） */
  title: string;
  /** 应提醒的时间（ISO 字符串） */
  remindAt: string;
  read: boolean;
  createdAt: string;
  /** 手动清空后隐藏，但保留任务去重记录，避免再次补扫生成。 */
  dismissedAt?: string;
};
