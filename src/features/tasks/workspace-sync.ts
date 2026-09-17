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
  getSupplementalTaskIds = () => [],
}: {
  getRepository: () => Repository;
  isActive: () => boolean;
  onSnapshot: (snapshot: WorkspaceSnapshot) => void;
  onError: (error: unknown, recovery: boolean) => void;
  getSupplementalTaskIds?: () => string[];
}) {
  let queue: Promise<void> = Promise.resolve();
  let revision = 0;
  let recoveryNeeded = false;

  const loadSnapshot = async (repository: Repository, actionRevision: number) => {
    const supplementalIds = getSupplementalTaskIds();
    const [tasks, supplementalTasks, preferences, notifications] = await Promise.all([
      repository.loadWorkspaceTasks(),
      supplementalIds.length ? repository.loadTasksByIds(supplementalIds) : [],
      repository.loadPreferences(),
      repository.listNotifications(),
    ]);
    const byId = new Map([...supplementalTasks, ...tasks].map((task) => [task.id, task] as const));
    // 回读期间可能又有操作入队或账户退出，旧快照必须丢弃。
    if (!isActive() || actionRevision !== revision) return;
    onSnapshot({ tasks: [...byId.values()], preferences, notifications });
    recoveryNeeded = false;
  };

  return {
    /** Queue a complete read after pending writes, so Realtime signals never race edits. */
    refresh() {
      if (!isActive()) return queue;
      const actionRevision = ++revision;
      queue = queue.then(async () => {
        if (!isActive()) return;
        try {
          await loadSnapshot(getRepository(), actionRevision);
        } catch (error) {
          if (isActive()) onError(error, true);
        }
      });
      return queue;
    },
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
            await loadSnapshot(repository, actionRevision);
          } catch (error) {
            if (isActive()) onError(error, true);
          }
        });
      return queue;
    },
  };
}
