"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { LanguageSelect, ThemeToggle } from "@/features/preferences/preference-controls";
import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/features/tasks/workspace-provider";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { HiArrowLeft, HiCheck, HiPencil, HiPower } from "react-icons/hi2";
import { SiGithub } from "react-icons/si";
import { AvatarView } from "@/components/shared/avatar-view";
import { avatarImageSrc, avatarSeed, randomAvatarSeed } from "@/lib/avatar";
import { ResetPasswordPanel } from "@/features/auth/reset-password-panel";
import { authErrorText, isValidEmail } from "@/features/auth/auth-errors";
import resetStyles from "@/features/auth/reset-password-panel.module.css";
import { messages, type MessageKey } from "@/i18n/messages";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import shared from "@/styles/workspace.module.css";
import styles from "./settings.module.css";

const sections = ["General", "Tasks & Rules", "Notifications", "Appearance", "Account & Sync"];
function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <div>
        <div className={styles.title}>{title}</div>
        <div className={styles.description}>{description}</div>
      </div>
      {children}
    </div>
  );
}
function Switch({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      className={styles.switch}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
/**
 * 数字输入允许清空与中途非法态（本地草稿），失焦或回车时才校验提交，
 * 避免受控值拒绝空串导致用户无法删除重输。
 */
function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);
  const commit = () => {
    if (draft === null) return;
    const next = Math.round(Number(draft));
    setDraft(null);
    if (Number.isFinite(next) && next >= min && next <= max) onChange(next);
  };
  return (
    <input
      aria-label={label}
      type="number"
      min={min}
      max={max}
      value={shown}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}
/** 邮箱换绑：独立一行 + 弹窗输入新邮箱，确认邮件发送至新地址后生效 */
function EmailBindingRow({
  email,
  onToast,
}: {
  email: string;
  onToast: (text: string, duration?: number) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = next.trim();
    if (!isValidEmail(value)) {
      onToast("邮箱格式不正确，请检查后重试。", 5000);
      return;
    }
    if (value === email) {
      onToast("新邮箱不能与当前邮箱相同。", 5000);
      return;
    }
    setPending(true);
    try {
      const { error } = await createClient().auth.updateUser(
        { email: value },
        { emailRedirectTo: `${window.location.origin}/settings` },
      );
      if (error) {
        onToast(authErrorText(error), 5000);
        return;
      }
      onToast("确认邮件已发送至新邮箱，请查收并点击确认完成换绑。");
      setOpen(false);
      setNext("");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <SettingRow title={t("邮箱")} description={t("用于登录与接收通知")}>
        <button type="button" className={shared.button} onClick={() => setOpen(true)}>
          {t("换绑邮箱")}
        </button>
      </SettingRow>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={resetStyles.dialogCard}
          overlayClassName={resetStyles.dialogOverlay}
          closeButtonClassName={resetStyles.dialogClose}
        >
          <div className={resetStyles.dialogHeading}>
            <DialogTitle className={resetStyles.dialogTitle}>{t("换绑邮箱")}</DialogTitle>
            <DialogDescription className={resetStyles.dialogDescription}>
              <span>{t("当前邮箱：{email}", { email })}</span>{" "}
              <span>{t("换绑需验证新邮箱：确认邮件将发送至新邮箱，点击邮件中的链接后生效。")}</span>
            </DialogDescription>
          </div>
          <form className={styles.emailForm} onSubmit={(event) => void submit(event)}>
            <label htmlFor="new-email">{t("新的邮箱地址")}</label>
            <input
              id="new-email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              required
            />
            <button type="submit" className={shared.button} disabled={pending}>
              {pending ? t("正在发送…") : t("发送确认邮件")}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** 昵称编辑：行内输入 + 保存后 router.refresh 全局同步展示 */
function DisplayNameRow({ userId, initialName }: { userId: string; initialName: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { notify } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);

  function cancel() {
    setEditing(false);
    setName(initialName);
  }

  async function save() {
    const value = name.trim();
    if (!value || value === initialName) {
      cancel();
      return;
    }
    setPending(true);
    try {
      const { error } = await createClient()
        .from("profiles")
        .update({ display_name: value.slice(0, 30) })
        .eq("id", userId);
      if (error) throw error;
      notify({ key: "已保存到你的账户" });
      setEditing(false);
      router.refresh();
    } catch {
      notify({ key: "操作失败，请稍后重试。" });
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingRow title={t("昵称")} description={t("在个人主页与工作台中展示")}>
      {editing ? (
        <div className={styles.nameEdit}>
          <input
            className={styles.nameInput}
            value={name}
            aria-label={t("昵称")}
            maxLength={30}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void save();
              } else if (event.key === "Escape") {
                event.stopPropagation();
                cancel();
              }
            }}
            disabled={pending}
          />
          <button
            type="button"
            className={styles.nameSave}
            aria-label={t("保存昵称")}
            disabled={pending || !name.trim()}
            onClick={() => void save()}
          >
            <HiCheck size={15} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.nameEditTrigger}
          onClick={() => setEditing(true)}
          aria-label={t("编辑昵称")}
          title={t("编辑昵称")}
        >
          <span className={styles.nameValue}>{initialName}</span>
          <HiPencil size={14} aria-hidden="true" />
        </button>
      )}
    </SettingRow>
  );
}

/** 账户头像：按种子（邮箱/随机）客户端生成 nice-avatar，「换一个」写入新随机种子 */
function AvatarRow({
  avatarUrl,
  email,
  userId,
}: {
  avatarUrl: string | null;
  email: string;
  userId: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const imageSrc = avatarImageSrc(avatarUrl);
  const seed = avatarSeed(avatarUrl, email);

  async function shuffle() {
    setPending(true);
    try {
      const { error } = await createClient()
        .from("profiles")
        .update({ avatar_url: `niceavatar://${randomAvatarSeed()}` })
        .eq("id", userId);
      if (!error) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingRow title={t("头像")} description={t("根据你的邮箱生成专属形象，可随时更换。")}>
      <div className={styles.accountActions}>
        {seed && <AvatarView seed={seed} className={styles.avatarPreview} />}
        {imageSrc && (
          // eslint-disable-next-line @next/next/no-img-element -- authenticated avatar URLs are dynamic
          <img className={styles.avatarPreview} src={imageSrc} alt={t("头像")} />
        )}
        <button
          type="button"
          className={shared.textButton}
          disabled={pending}
          onClick={() => void shuffle()}
        >
          {pending ? t("正在生成…") : t("换一个头像")}
        </button>
      </div>
    </SettingRow>
  );
}

export function SettingsPage({
  profileName,
  avatarUrl,
}: {
  profileName: string;
  avatarUrl: string | null;
}) {
  const { t, label } = useI18n();
  const router = useRouter();
  const { preferences, setPreferences, notify, user, signOut } = useWorkspace();
  // recovery 只定位账户区，不是身份验证凭证；所有改密都重新验证邮箱。
  const isRecovery = useSearchParams().get("recovery") === "1";
  const [section, setSection] = useState(isRecovery ? "Account & Sync" : "General");
  const [resetOpen, setResetOpen] = useState(false);
  /** 认证面板的错误文案可能是 i18n 键或原始英文；键直接翻译，否则给通用提示 */
  function notifyAuthText(text: string) {
    notify({
      key: (Object.hasOwn(messages, text) ? text : "操作失败，请稍后重试。") as MessageKey,
    });
  }
  function save(patch: Parameters<typeof setPreferences>[0]) {
    setPreferences(patch);
    notify({ key: user ? "已保存到你的账户" : "已更新本次预览的偏好设置" });
  }
  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.backButton} onClick={() => router.back()}>
        <HiArrowLeft size={14} aria-hidden="true" />
        {t("返回")}
      </button>
      <div className={styles.page}>
        <h1 className="sr-only">{t("Settings")}</h1>
        <nav className={styles.sidebar} aria-label={t("设置分类")}>
          {sections.map((item) => (
            <button
              className={cn(styles.sidebarItem, section === item && styles.active)}
              aria-current={section === item ? "page" : undefined}
              onClick={() => setSection(item)}
              key={item}
            >
              {label(item)}
            </button>
          ))}
        </nav>
        <div className={styles.content}>
          {section === "General" && (
            <section className={styles.section}>
              <h2>{t("General Preferences")}</h2>
              <SettingRow
                title={t("Language")}
                description={t("Select your preferred interface language.")}
              >
                <LanguageSelect />
              </SettingRow>
              <SettingRow
                title={t("First Day of Week")}
                description={t("Set the starting day for calendar and weekly views.")}
              >
                <Select
                  ariaLabel={t("First Day of Week")}
                  value={preferences.firstDay}
                  onValueChange={(firstDay) => save({ firstDay })}
                  align="end"
                  options={[
                    { value: "Monday", label: t("Monday") },
                    { value: "Sunday", label: t("Sunday") },
                  ]}
                />
              </SettingRow>
              <SettingRow
                title={t("Sound Effects")}
                description={t("Play gentle chime upon completing a task.")}
              >
                <Switch
                  label={t("Sound Effects")}
                  checked={preferences.sound}
                  onChange={(value) => save({ sound: value })}
                />
              </SettingRow>
            </section>
          )}
          {section === "General" && (
            <section className={styles.section}>
              <h2>{t("Focus (Pomodoro) Settings")}</h2>
              <SettingRow
                title={t("Pomodoro Duration")}
                description={t("Standard deep work session length in minutes.")}
              >
                <NumberField
                  label={t("Pomodoro Duration")}
                  value={preferences.duration}
                  min={5}
                  max={120}
                  onChange={(duration) => save({ duration })}
                />
              </SettingRow>
              <SettingRow
                title={t("Auto-start Breaks")}
                description={t("Automatically start break timer when focus session finishes.")}
              >
                <Switch
                  label={t("Auto-start Breaks")}
                  checked={preferences.autoBreak}
                  onChange={(value) => save({ autoBreak: value })}
                />
              </SettingRow>
            </section>
          )}
          {section === "Tasks & Rules" && (
            <section className={styles.section}>
              <h2>{t("Tasks & Rules")}</h2>
              <SettingRow
                title={t("Daily Capacity")}
                description={t("Choose a comfortable number of tasks for your day.")}
              >
                <NumberField
                  label={t("Daily Capacity")}
                  value={preferences.dailyCapacity}
                  min={1}
                  max={20}
                  onChange={(dailyCapacity) => save({ dailyCapacity })}
                />
              </SettingRow>
              <Link href="/today" className={shared.textButton}>
                {t("View today's capacity →")}
              </Link>
            </section>
          )}
          {section === "Notifications" && (
            <section className={styles.section}>
              <h2>{t("Notifications")}</h2>
              <SettingRow
                title={t("Task Reminders")}
                description={t("Keep track of upcoming tasks and focus sessions.")}
              >
                <Switch
                  label={t("Task Reminders")}
                  checked={preferences.reminders}
                  onChange={(value) => save({ reminders: value })}
                />
              </SettingRow>
              <p className={shared.muted}>{t("notifications.inAppHint")}</p>
            </section>
          )}
          {section === "Appearance" && (
            <section className={styles.section}>
              <h2>{t("Appearance")}</h2>
              <SettingRow
                title={t("Theme")}
                description={t("A quiet, warm space for focused work.")}
              >
                <ThemeToggle />
              </SettingRow>
              <p className={shared.muted}>
                {t("Your display preferences are saved on this device.")}
              </p>
            </section>
          )}
          {section === "Account & Sync" && (
            <section className={styles.section}>
              <h2>{t("Account & Sync")}</h2>
              {user ? (
                <>
                  {isRecovery && <p className={shared.muted}>{t("auth.recoveryHint")}</p>}
                  <DisplayNameRow userId={user.id} initialName={user.displayName || profileName} />
                  {user.email && <EmailBindingRow email={user.email} onToast={notifyAuthText} />}
                  {user.email && (
                    <AvatarRow avatarUrl={avatarUrl} email={user.email} userId={user.id} />
                  )}
                  <SettingRow
                    title={t("修改密码")}
                    description={t("为确保是你本人操作，需通过邮箱验证码验证后才能设置新密码。")}
                  >
                    <button
                      type="button"
                      className={shared.button}
                      onClick={() => setResetOpen(true)}
                    >
                      {t("修改密码")}
                    </button>
                  </SettingRow>
                  <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                    <DialogContent
                      className={resetStyles.dialogCard}
                      overlayClassName={resetStyles.dialogOverlay}
                      closeButtonClassName={resetStyles.dialogClose}
                    >
                      <div className={resetStyles.dialogHeading}>
                        <DialogTitle className={resetStyles.dialogTitle}>
                          {t("修改密码")}
                        </DialogTitle>
                        <DialogDescription className={resetStyles.dialogDescription}>
                          {t("为确保是你本人操作，需通过邮箱验证码验证后才能设置新密码。")}
                        </DialogDescription>
                      </div>
                      {user.email && (
                        <ResetPasswordPanel
                          lockedEmail={user.email}
                          autoSend
                          onToast={notifyAuthText}
                          onDone={() => {
                            setResetOpen(false);
                            router.replace("/settings");
                          }}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                  <p className={shared.muted}>{t("任务、偏好与语音记录已同步到你的账户。")}</p>
                </>
              ) : (
                <>
                  <SettingRow title={profileName} description={t("Preview account")}>
                    <Link href="/profile" className={shared.button}>
                      {t("View Profile")}
                    </Link>
                  </SettingRow>
                  <p className={shared.muted}>
                    {t("当前使用前端示例数据。账号、同步与云端保存尚未接入。")}
                  </p>
                </>
              )}
              <div className={styles.accountFooter}>
                {user && (
                  <button
                    type="button"
                    className={styles.signOutIcon}
                    aria-label={t("退出登录")}
                    title={t("退出登录")}
                    onClick={() => void signOut()}
                  >
                    <HiPower size={17} aria-hidden="true" />
                  </button>
                )}
                <a
                  href="https://github.com/Yohoia/DiDa-todo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.githubLink}
                  aria-label={t("View source on GitHub")}
                  title={t("View source on GitHub")}
                >
                  <SiGithub size={16} aria-hidden="true" />
                </a>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
