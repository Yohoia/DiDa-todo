"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { CodeField } from "@/components/ui/code-field";
import { useI18n } from "@/features/preferences/preferences-provider";
import { meetsPasswordPolicy, PASSWORD_RULES } from "@/lib/password-policy";
import { createClient } from "@/lib/supabase/client";
import { authErrorText, isValidEmail } from "./auth-errors";

import styles from "./reset-password-panel.module.css";

type Props = {
  onToast: (text: string, duration?: number) => void;
  onDone: () => void;
  /** 登录弹窗带入的邮箱：预填但仍可编辑 */
  initialEmail?: string;
  /** 设置页：邮箱已知且只读 */
  lockedEmail?: string;
  /** 弹窗场景：打开即自动发送验证码（55 秒内重复打开不重发，直接进入输码步） */
  autoSend?: boolean;
  onBack?: () => void;
};

const AUTO_SEND_GUARD_KEY = "dida-reset-code-sent-at";
const AUTO_SEND_WINDOW_MS = 55_000;

/** autoSend 初始状态：55 秒内发过则直接进入输码步并恢复倒计时，否则待发码 */
function autoSendInitial(autoSend: boolean, locked: boolean) {
  if (!autoSend || !locked || typeof window === "undefined") {
    return { step: "email" as Step, cooldown: 0, shouldSend: false };
  }
  const last = Number(window.localStorage.getItem(AUTO_SEND_GUARD_KEY) ?? 0);
  const elapsed = Date.now() - last;
  if (Number.isFinite(last) && elapsed >= 0 && elapsed < AUTO_SEND_WINDOW_MS) {
    return {
      step: "code" as Step,
      cooldown: Math.ceil((AUTO_SEND_WINDOW_MS - elapsed) / 1000),
      shouldSend: false,
    };
  }
  return { step: "code" as Step, cooldown: 0, shouldSend: true };
}

type Step = "email" | "code" | "password";

/**
 * 邮箱验证码重置密码（登录弹窗与设置页共用）：
 * 发送 6 位验证码 → verifyOtp(type=recovery) 换取 recovery 会话 → 设置新密码。
 * 验证码方式不受 PKCE 同浏览器限制，任何设备收码均可完成。
 */
export function ResetPasswordPanel({
  onToast,
  onDone,
  initialEmail = "",
  lockedEmail,
  autoSend = false,
  onBack,
}: Props) {
  const { t } = useI18n();
  const locked = Boolean(lockedEmail);
  const initial = useRef(autoSendInitial(autoSend, locked)).current;
  const [email, setEmail] = useState(lockedEmail ?? initialEmail);
  const [step, setStep] = useState<Step>(initial.step);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(initial.cooldown);
  const verifiedEmailRef = useRef<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  // autoSend：打开弹窗即发码（延迟一拍避开 effect 内同步状态写入）
  useEffect(() => {
    if (!initial.shouldSend) return;
    const timer = window.setTimeout(() => void sendCode(true), 0);
    return () => window.clearTimeout(timer);
    // 仅挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendCode(force = false, event?: FormEvent) {
    event?.preventDefault();
    if (!force && (pending || cooldown > 0)) return;
    const value = email.trim();
    if (!locked && !isValidEmail(value)) {
      onToast("邮箱格式不正确，请检查后重试。", 5000);
      return;
    }
    setPending(true);
    verifiedEmailRef.current = null;
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(value);
      if (error) {
        onToast(authErrorText(error), 5000);
        return;
      }
      setCooldown(60);
      setStep("code");
      try {
        window.localStorage.setItem(AUTO_SEND_GUARD_KEY, String(Date.now()));
      } catch {
        // 写入失败仅失去防重发护栏
      }
      onToast("重置验证码已发送，请查收邮箱。");
    } finally {
      setPending(false);
    }
  }

  async function verify() {
    if (pending) return;
    if (code.length !== 6) {
      onToast("请输入完整的 6 位验证码。", 5000);
      return;
    }
    setPending(true);
    try {
      const { error } = await createClient().auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: "recovery",
      });
      if (error) {
        onToast(authErrorText(error), 5000);
        return;
      }
      verifiedEmailRef.current = email.trim();
      setStep("password");
    } finally {
      setPending(false);
    }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (step !== "password" || verifiedEmailRef.current !== email.trim()) {
      onToast("请输入完整的 6 位验证码。", 5000);
      return;
    }
    if (password !== confirm) {
      onToast("两次输入的密码不一致。", 5000);
      return;
    }
    if (!meetsPasswordPolicy(password)) {
      onToast("密码不满足要求，请对照下方规则修改。", 5000);
      return;
    }
    setPending(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        onToast(authErrorText(error), 5000);
        return;
      }
      onToast("密码已更新。");
      verifiedEmailRef.current = null;
      onDone();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.panel}>
      {step === "email" && (
        <form className={styles.step} onSubmit={(event) => void sendCode(false, event)}>
          <div className={styles.field}>
            <label htmlFor="reset-email">{t("Email Address")}</label>
            {locked ? (
              <p className={styles.lockedEmail}>{lockedEmail}</p>
            ) : (
              <input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            )}
          </div>
          <button type="submit" className={styles.primary} disabled={pending || cooldown > 0}>
            {cooldown > 0
              ? t("重新发送（{seconds} 秒）", { seconds: cooldown })
              : pending
                ? t("正在发送…")
                : t("发送验证码")}
          </button>
        </form>
      )}

      {step === "code" && (
        <div className={styles.step}>
          <p className={styles.hint}>{t("重置验证码已发送至 {email}", { email: email.trim() })}</p>
          <CodeField id="reset-code" value={code} onChange={setCode} disabled={pending} />
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={pending || code.length !== 6}
              onClick={() => void verify()}
            >
              {pending ? t("正在验证…") : t("验证并继续")}
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={pending || cooldown > 0}
              onClick={() => void sendCode()}
            >
              {cooldown > 0
                ? t("重新发送（{seconds} 秒）", { seconds: cooldown })
                : t("重新发送验证码")}
            </button>
            {!locked && (
              <button
                type="button"
                className={styles.secondary}
                disabled={pending}
                onClick={() => setStep("email")}
              >
                {t("更换邮箱")}
              </button>
            )}
          </div>
        </div>
      )}

      {step === "password" && (
        <form className={styles.step} onSubmit={(event) => void resetPassword(event)}>
          <div className={styles.field}>
            <label htmlFor="reset-password">{t("新密码")}</label>
            <input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              placeholder={t("设置密码 (不少于8位)")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="reset-confirm">{t("确认新密码")}</label>
            <input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              placeholder={t("确认新密码")}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </div>
          <ul className={styles.rules} aria-label={t("密码要求")}>
            {PASSWORD_RULES.map(({ key, test }) => (
              <li key={key} data-valid={test(password)}>
                {test(password) ? "✓" : "·"} {t(key)}
              </li>
            ))}
          </ul>
          <button type="submit" className={styles.primary} disabled={pending}>
            {t("设置新密码")}
          </button>
        </form>
      )}

      {onBack && (
        <button type="button" className={styles.back} onClick={onBack}>
          {t("返回登录")}
        </button>
      )}
    </div>
  );
}
