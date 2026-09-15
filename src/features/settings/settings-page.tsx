"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import { LanguageSelect, ThemeToggle } from "@/features/preferences/preference-controls";
import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/features/tasks/workspace-provider";
import { Select } from "@/components/ui/select";
import { AvatarView } from "@/components/shared/avatar-view";
import { avatarImageSrc, avatarSeed, randomAvatarSeed } from "@/lib/avatar";
import { meetsPasswordPolicy, PASSWORD_RULES } from "@/lib/password-policy";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import shared from "@/styles/workspace.module.css";
import styles from "./settings.module.css";

const sections = [
  "General",
  "Tasks & Rules",
  "Focus (Pomodoro)",
  "Notifications",
  "Appearance",
  "Account & Sync",
];
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
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
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
/**
 * 登录后修改密码：updateUser 不要求旧密码，前端校验两次一致后提交。
 * 错误文案键与 auth-dialog 共用，label() 对未知文本原样返回。
 */
function PasswordForm() {
  const { t, label } = useI18n();
  const { notify } = useWorkspace();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) {
      setError("两次输入的密码不一致。");
      return;
    }
    if (!meetsPasswordPolicy(password)) {
      setError("密码不满足要求，请对照下方规则修改。");
      return;
    }
    setPending(true);
    setError("");
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        const text = error.message.toLowerCase();
        setError(
          error.code === "weak_password" || text.includes("password should be")
            ? "密码强度不足，请更换更复杂的密码。"
            : error.message,
        );
        return;
      }
      setPassword("");
      setConfirm("");
      notify({ key: "密码已更新。" });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.passwordForm} onSubmit={handleSubmit}>
      <input
        type="password"
        aria-label={t("新密码")}
        autoComplete="new-password"
        placeholder={t("设置密码 (不少于8位)")}
        minLength={8}
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <input
        type="password"
        aria-label={t("确认新密码")}
        autoComplete="new-password"
        placeholder={t("确认新密码")}
        minLength={8}
        required
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
      />
      <ul className={styles.passwordRules} aria-label={t("密码要求")}>
        {PASSWORD_RULES.map(({ key, test }) => (
          <li key={key} data-valid={test(password)}>
            {test(password) ? "✓" : "·"} {t(key)}
          </li>
        ))}
      </ul>
      <button type="submit" className={shared.button} disabled={pending}>
        {t("更新密码")}
      </button>
      {error && (
        <p className={styles.passwordNotice} role="alert">
          {label(error)}
        </p>
      )}
    </form>
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
  const { preferences, setPreferences, notify, user, signOut } = useWorkspace();
  // 密码重置链接经 /auth/callback 换会话后落到 ?recovery=1：直达账户区改密码
  const isRecovery = useSearchParams().get("recovery") === "1";
  const [section, setSection] = useState(isRecovery ? "Account & Sync" : "General");
  function save(patch: Parameters<typeof setPreferences>[0]) {
    setPreferences(patch);
    notify({ key: user ? "已保存到你的账户" : "已更新本次预览的偏好设置" });
  }
  return (
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
        {["General", "Focus (Pomodoro)"].includes(section) && (
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
            <p className={shared.muted}>{t("提醒偏好仅用于页面预览，通知服务尚未接入。")}</p>
          </section>
        )}
        {section === "Appearance" && (
          <section className={styles.section}>
            <h2>{t("Appearance")}</h2>
            <SettingRow title={t("Theme")} description={t("A quiet, warm space for focused work.")}>
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
                {isRecovery && (
                  <p className={shared.muted}>
                    {t("你已通过密码重置链接登录，请设置新密码并保存。")}
                  </p>
                )}
                <SettingRow title={user.displayName || profileName} description={user.email}>
                  <div className={styles.accountActions}>
                    <Link href="/profile" className={shared.button}>
                      {t("View Profile")}
                    </Link>
                    <button
                      type="button"
                      className={shared.textButton}
                      onClick={() => void signOut()}
                    >
                      {t("退出登录")}
                    </button>
                  </div>
                </SettingRow>
                {user.email && (
                  <AvatarRow avatarUrl={avatarUrl} email={user.email} userId={user.id} />
                )}
                <div className={styles.passwordBlock}>
                  <div>
                    <div className={styles.title}>{t("修改密码")}</div>
                    <div className={styles.description}>
                      {t("设置新密码后，其他设备需使用新密码重新登录。")}
                    </div>
                  </div>
                  <PasswordForm />
                </div>
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
          </section>
        )}
      </div>
    </div>
  );
}
