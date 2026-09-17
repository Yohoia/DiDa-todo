import type { Repository, StoredPreferences } from "@/lib/data/repository";
import type { Task } from "@/types/task";
import type { AppNotification } from "@/types/notification";

export type WorkspaceSnapshot = {
  tasks: Task[];
  preferences: StoredPreferences;
  notifications: AppNotification[];
};

/** 串行写入；恢复回读前后都校验版本，绝不覆盖期间发生的新操作。 */
export function createWorkspaceSync({
  getRepository,
  isActive,
  onSnapshot,
  onError,
}: {
  getRepository: () => Repository;
  isActive: () => boolean;
  onSnapshot: (snapshot: WorkspaceSnapshot) => void;
  onError: (error: unknown, recovery: boolean) => void;
}) {
  let queue: Promise<void> = Promise.resolve();
  let revision = 0;
  let recoveryNeeded = false;

  return {
    enqueue(action: (repository: Repository) => Promise<void>) {
      if (!isActive()) return queue;
      const repository = getRepository();
      const actionRevision = ++revision;
      queue = queue
        .then(async () => {
          if (!isActive()) return;
          try {
            await action(repository);
          } catch (error) {
            recoveryNeeded = true;
            if (isActive()) onError(error, false);
          }
        })
        .then(async () => {
          if (!isActive() || !recoveryNeeded || actionRevision !== revision) return;
          try {
            const [tasks, preferences, notifications] = await Promise.all([
              repository.loadTasks(),
              repository.loadPreferences(),
              repository.listNotifications(),
            ]);
            // 回读期间可能又有操作入队或账户退出，旧快照必须丢弃。
            // 保留 recoveryNeeded，让新队列的末项重新读取最新服务器状态。
            if (!isActive() || actionRevision !== revision) return;
            onSnapshot({ tasks, preferences, notifications });
            recoveryNeeded = false;
          } catch (error) {
            if (isActive()) onError(error, true);
          }
        });
      return queue;
    },
  };
}
