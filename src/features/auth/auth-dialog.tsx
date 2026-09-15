"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";

import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

import styles from "./auth-dialog.module.css";

type AuthView = "login" | "register";
type LoginMode = "password" | "code";

/** 验证码注册的默认用户名：取邮箱前缀，异常时随机生成，用户可事后在资料页修改。 */
function defaultName(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  if (local.length >= 2 && local.length <= 30) return local;
  return `用户${Math.floor(1000 + Math.random() * 9000)}`;
}
const AuthContext = createContext<((view: AuthView, trigger: HTMLButtonElement) => void) | null>(
  null,
);

export function AuthTrigger({
  view = "login",
  children,
  onClick,
  ...props
}: ComponentProps<"button"> & { view?: AuthView }) {
  const openAuth = useContext(AuthContext);
  if (!openAuth) throw new Error("AuthTrigger must be inside AuthDialogProvider");

  return (
    <button
      {...props}
      type="button"
      aria-haspopup="dialog"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) openAuth(view, event.currentTarget);
      }}
    >
      {children}
    </button>
  );
}

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AuthView>("login");
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <AuthContext.Provider
      value={(nextView, trigger) => {
        triggerRef.current = trigger;
        setView(nextView);
        setOpen(true);
      }}
    >
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={styles.card}
          overlayClassName={styles.overlay}
          closeButtonClassName={styles.closeButton}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <Tabs value={view} onValueChange={(value) => setView(value as AuthView)}>
            <TabsList className={styles.tabs} aria-label={t("登录或注册")}>
              <TabsTrigger className={styles.tab} value="login">
                {t("Log In")}
              </TabsTrigger>
              <TabsTrigger className={styles.tab} value="register">
                {t("Sign Up")}
              </TabsTrigger>
            </TabsList>
            <div className={styles.heading}>
              <DialogTitle className={styles.title}>
                {view === "login" ? (
                  <>
                    {t("Welcome")} <span>{t("Back")}</span>
                  </>
                ) : (
                  <>
                    {t("Join")} <span>DiDa-todo</span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription className={styles.description}>
                {view === "login"
                  ? t("请输入您的凭证以进入工作台。")
                  : t("注册账号，开启优雅的效率之旅。")}
              </DialogDescription>
            </div>
            <TabsContent value="login" className={styles.view}>
              <AuthForm view="login" onAuthed={() => setOpen(false)} />
            </TabsContent>
            <TabsContent value="register" className={styles.view}>
              <AuthForm view="register" onAuthed={() => setOpen(false)} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}

function AuthForm({ view, onAuthed }: { view: AuthView; onAuthed: () => void }) {
  const { t, label } = useI18n();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("password");
  const [cooldown, setCooldown] = useState(0);
  const isLogin = view === "login";
  // 注册固定走验证码；登录默认密码、可切验证码
  const useCode = !isLogin || loginMode === "code";

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // 切换视图/登录方式时清掉旧提示（渲染期间调整状态，避免 effect 级联渲染）
  const modeKey = `${view}:${loginMode}`;
  const [prevModeKey, setPrevModeKey] = useState(modeKey);
  if (prevModeKey !== modeKey) {
    setPrevModeKey(modeKey);
    setNotice("");
  }

  /** Supabase 英文错误 → 可读文案；未知错误原样展示（label 对非键文本原样返回）。 */
  function authErrorText(error: { code?: string; message: string }): string {
    const text = error.message.toLowerCase();
    if (error.code === "invalid_credentials" || text.includes("invalid login credentials")) {
      return "邮箱或密码不正确。";
    }
    if (error.code === "email_not_confirmed") return "邮箱尚未验证，请先查收确认邮件。";
    if (error.code === "otp_expired" || text.includes("otp") || text.includes("expired")) {
      return "验证码错误或已过期。";
    }
    if (text.includes("not found")) return "该邮箱尚未注册，请先注册。";
    if (error.code === "user_already_exists" || text.includes("already registered")) {
      return "该邮箱已注册，可以直接登录。";
    }
    if (error.code === "weak_password" || text.includes("password should be")) {
      return "密码强度不足，请更换更复杂的密码。";
    }
    if (error.code === "over_request_rate_limit" || text.includes("rate limit")) {
      return "尝试太频繁，请稍后再试。";
    }
    return error.message;
  }

  function fieldValue(form: HTMLFormElement, name: string): string {
    const control = form.elements.namedItem(name);
    return control instanceof HTMLInputElement ? control.value : "";
  }

  /** 发送邮箱验证码：注册允许创建新用户（带默认用户名/头像），登录只对已注册邮箱发码。 */
  async function handleSendCode() {
    const email = currentEmail();
    if (!email) {
      setNotice("请先填写邮箱，再发送验证码。");
      return;
    }
    setPending(true);
    setNotice("");
    try {
      const { error } = await createClient().auth.signInWithOtp({
        email,
        options:
          view === "register"
            ? {
                shouldCreateUser: true,
                // name/avatar_url 经注册触发器写入 profiles（见 supabase/migrations/0003）
                data: { name: defaultName(email), avatar_url: "/avatar-default.svg" },
              }
            : { shouldCreateUser: false },
      });
      if (error) {
        setNotice(authErrorText(error));
        return;
      }
      setCooldown(60);
      setNotice("验证码已发送，请查收邮件。");
    } finally {
      setPending(false);
    }
  }

  function currentEmail(): string {
    return (
      formRef.current?.querySelector<HTMLInputElement>('input[name="email"]')?.value.trim() ?? ""
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = fieldValue(form, "email").trim();
    const password = fieldValue(form, "password");
    const supabase = createClient();
    setPending(true);
    setNotice("");
    try {
      if (isLogin && loginMode === "password") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setNotice(authErrorText(error));
          return;
        }
      } else {
        const token = fieldValue(form, "code").trim();
        // 注册的验证码类型按账号状态兜底：新用户 signup → 已注册未确认 email_confirm → 老用户 magiclink
        const types: ("signup" | "email_confirm" | "magiclink")[] =
          view === "register" ? ["signup", "email_confirm", "magiclink"] : ["magiclink"];
        let verifyError: { code?: string; message: string } | null = null;
        for (const type of types) {
          const { error } = await supabase.auth.verifyOtp({ email, token, type });
          if (!error) {
            verifyError = null;
            break;
          }
          verifyError = error;
          const text = error.message.toLowerCase();
          // 验证码本身错误/过期时换类型也没有意义，避免无谓的重试消耗风控额度
          if (error.code === "otp_expired" || text.includes("otp") || text.includes("expired")) {
            break;
          }
        }
        if (verifyError) {
          setNotice(authErrorText(verifyError));
          return;
        }
      }
      onAuthed();
      router.push("/today");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleResetPassword() {
    const email = formRef.current?.querySelector<HTMLInputElement>('input[name="email"]')?.value;
    if (!email?.trim()) {
      setNotice("请先填写邮箱，再找回密码。");
      return;
    }
    setPending(true);
    setNotice("");
    try {
      // 重置链接经 /auth/callback 换会话后直达设置页改密码
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/settings?recovery=1")}`,
      });
      setNotice(error ? authErrorText(error) : "重置密码邮件已发送，请查收。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <div className={styles.inputGroup}>
        <label htmlFor={`${view}-email`}>{t("Email Address")}</label>
        <input
          id={`${view}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          required
        />
      </div>
      {useCode ? (
        <div className={styles.inputGroup}>
          <label htmlFor={`${view}-code`}>{t("验证码")}</label>
          <div className={styles.codeRow}>
            <input
              id={`${view}-code`}
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t("请输入邮件中的 6 位验证码。")}
              maxLength={6}
              pattern="[0-9]*"
              required
            />
            <button
              type="button"
              className={styles.codeButton}
              disabled={pending || cooldown > 0}
              onClick={() => void handleSendCode()}
            >
              {cooldown > 0 ? t("重发 ({seconds}s)", { seconds: cooldown }) : t("发送验证码")}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.inputGroup}>
          <label htmlFor={`${view}-password`}>{t("Password")}</label>
          <input
            id={`${view}-password`}
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>
      )}
      {isLogin && loginMode === "password" && (
        <div className={styles.formActions}>
          <label className={styles.remember}>
            <input type="checkbox" name="remember" />
            {t("记住我")}
          </label>
          <button
            className={styles.link}
            type="button"
            disabled={pending}
            onClick={() => void handleResetPassword()}
          >
            {t("忘记密码?")}
          </button>
        </div>
      )}
      <motion.button
        className={styles.submit}
        type="submit"
        disabled={pending}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        {isLogin ? t("Sign In") : t("Create Account")}
      </motion.button>
      {isLogin && (
        <button
          type="button"
          className={`${styles.link} ${styles.switchMode}`}
          disabled={pending}
          onClick={() => setLoginMode(loginMode === "password" ? "code" : "password")}
        >
          {loginMode === "password" ? t("使用验证码登录") : t("使用密码登录")}
        </button>
      )}
      <Link href="/today" className={styles.previewLink}>
        {t("直接预览工作台 →")}
      </Link>
      <p className={styles.notice} role="status" aria-live="polite">
        {label(notice)}
      </p>
    </form>
  );
}
