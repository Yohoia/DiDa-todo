"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

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

import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { randomAvatarSeed } from "@/lib/avatar";
import { meetsPasswordPolicy, PASSWORD_RULES } from "@/lib/password-policy";
import { authErrorText, isValidEmail } from "./auth-errors";
import { ResetPasswordPanel } from "./reset-password-panel";
import { CodeField } from "@/components/ui/code-field";
import { createClient } from "@/lib/supabase/client";

import styles from "./auth-dialog.module.css";

type AuthView = "login" | "register" | "reset";
type LoginMode = "password" | "code";

/** 验证码注册的默认用户名：取邮箱前缀，异常时随机生成，用户可事后在资料页修改。 */
function defaultName(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  if (local.length >= 2 && local.length <= 30) return local;
  return `用户${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * 密码输入框：右侧带查看密码按钮（HTML 无原生显隐，需自行实现）；
 * status 驱动状态图标——不合规为感叹号（悬浮展开规则气泡），合规为绿色对勾。
 */
function PasswordField({
  id,
  name,
  autoComplete,
  placeholder,
  minLength,
  value,
  onChange,
  status,
}: {
  id: string;
  name: string;
  autoComplete: string;
  placeholder: string;
  minLength?: number;
  value: string;
  onChange: (value: string) => void;
  status: "none" | "broken" | "ok";
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const iconRef = useRef<HTMLSpanElement | null>(null);
  const [tipAt, setTipAt] = useState<{ left: number; top: number } | null>(null);

  /** 气泡定位到图标右侧，经 Portal 挂到 body：弹窗容器带 transform，会劫持 fixed 定位 */
  function openTip() {
    const rect = iconRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTipAt({
      left: Math.min(rect.right + 12, window.innerWidth - 212),
      top: rect.top + rect.height / 2,
    });
  }

  return (
    <div className={styles.passwordWrap}>
      <div className={styles.passwordInput}>
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          minLength={minLength}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className={styles.eyeButton}
          aria-label={visible ? t("隐藏密码") : t("显示密码")}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
              <circle cx="12" cy="12" r="3" />
              <path d="M4.5 4.5l15 15" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {status === "broken" && (
        <span
          ref={iconRef}
          className={styles.statusIcon}
          tabIndex={0}
          role="img"
          aria-label={t("密码不满足要求，请对照下方规则修改。")}
          onMouseEnter={openTip}
          onMouseLeave={() => setTipAt(null)}
          onFocus={openTip}
          onBlur={() => setTipAt(null)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5" strokeLinecap="round" />
            <circle cx="12" cy="16.6" r="1" fill="currentColor" stroke="none" />
          </svg>
        </span>
      )}
      {status === "ok" && (
        <span className={`${styles.statusIcon} ${styles.statusOk}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {tipAt &&
        createPortal(
          <span className={styles.tip} role="tooltip" style={{ left: tipAt.left, top: tipAt.top }}>
            <span className={styles.tipTitle}>{t("密码要求")}</span>
            <ul className={styles.rules}>
              {PASSWORD_RULES.map(({ key, test }) => {
                const ok = test(value);
                return (
                  <li key={key} className={ok ? styles.ruleOk : undefined}>
                    {ok ? "✓" : "·"} {t(key)}
                  </li>
                );
              })}
            </ul>
          </span>,
          document.body,
        )}
    </div>
  );
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

export function AuthDialogProvider({
  children,
  initialOpen = false,
}: {
  children: ReactNode;
  initialOpen?: boolean;
}) {
  const { t, label } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [view, setView] = useState<AuthView>("login");
  const [resetEmail, setResetEmail] = useState("");
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  /** 顶部轻提示：成功反馈 3 秒、错误提示 5 秒自动消失 */
  function showToast(text: string, duration = 3000) {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text });
    toastTimer.current = window.setTimeout(() => setToast(null), duration);
  }

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    },
    [],
  );

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
          {view === "reset" ? (
            <div className={styles.view}>
              <div className={styles.heading}>
                <DialogTitle className={styles.title}>{t("重置密码")}</DialogTitle>
                <DialogDescription className={styles.description}>
                  {t("输入注册邮箱接收验证码，验证后即可设置新密码。")}
                </DialogDescription>
              </div>
              <ResetPasswordPanel
                initialEmail={resetEmail}
                onToast={showToast}
                onBack={() => setView("login")}
                onDone={() => {
                  setOpen(false);
                  router.push("/today");
                  router.refresh();
                }}
              />
            </div>
          ) : (
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
                <AuthForm
                  view="login"
                  onAuthed={() => setOpen(false)}
                  onToast={showToast}
                  onForgotPassword={(email) => {
                    setResetEmail(email);
                    setView("reset");
                  }}
                />
              </TabsContent>
              <TabsContent value="register" className={styles.view}>
                <AuthForm
                  view="register"
                  onAuthed={() => setOpen(false)}
                  onToast={showToast}
                  onForgotPassword={(email) => {
                    setResetEmail(email);
                    setView("reset");
                  }}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className={styles.toast}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {label(toast.text)}
          </motion.div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
}

function AuthForm({
  view,
  onAuthed,
  onToast,
  onForgotPassword,
}: {
  view: "login" | "register";
  onAuthed: () => void;
  onToast: (text: string, duration?: number) => void;
  onForgotPassword: (email: string) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("password");
  const [cooldown, setCooldown] = useState(0);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const isLogin = view === "login";
  // 注册固定走验证码；登录默认密码、可切验证码
  const useCode = !isLogin || loginMode === "code";
  // 密码已输入但不合规时亮感叹号（悬浮出规则气泡），合规变绿勾
  const rulesBroken = password.length > 0 && !PASSWORD_RULES.every(({ test }) => test(password));
  const registerStatus: "none" | "broken" | "ok" = !password
    ? "none"
    : rulesBroken
      ? "broken"
      : "ok";

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function fieldValue(form: HTMLFormElement, name: string): string {
    const control = form.elements.namedItem(name);
    return control instanceof HTMLInputElement ? control.value : "";
  }

  /** 发送邮箱验证码：注册允许创建新用户（带默认用户名/头像），登录只对已注册邮箱发码。 */
  async function handleSendCode() {
    const email = currentEmail();
    if (!email) {
      onToast("请先填写邮箱，再发送验证码。");
      return;
    }
    if (!isValidEmail(email)) {
      onToast("邮箱格式不正确，请检查后重试。");
      return;
    }
    setPending(true);
    try {
      const { error } = await createClient().auth.signInWithOtp({
        email,
        options:
          view === "register"
            ? {
                shouldCreateUser: true,
                // name/avatar_url 经注册触发器写入 profiles（见 supabase/migrations/0003）
                data: {
                  name: defaultName(email),
                  avatar_url: `niceavatar://${randomAvatarSeed()}`,
                },
              }
            : { shouldCreateUser: false },
      });
      if (error) {
        onToast(authErrorText(error));
        return;
      }
      setCooldown(60);
      onToast("验证码已发送，请查收邮件。");
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
    // 邮箱格式 + 注册密码规则在发起请求前拦截（native 校验之外的双保险）
    if (!isValidEmail(email)) {
      onToast("邮箱格式不正确，请检查后重试。", 5000);
      return;
    }
    if (view === "register" && !meetsPasswordPolicy(password)) {
      onToast("密码不满足要求，请对照下方规则修改。", 5000);
      return;
    }
    const supabase = createClient();
    setPending(true);
    try {
      if (isLogin && loginMode === "password") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          onToast(authErrorText(error), 5000);
          return;
        }
      } else {
        if (code.length !== 6) {
          onToast("请输入完整的 6 位验证码。", 5000);
          return;
        }
        // signInWithOtp 发送的是邮箱 OTP；注册和登录均使用 email 类型验证。
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
        if (error) {
          onToast(authErrorText(error), 5000);
          return;
        }
        // OTP 建号默认无密码：注册流程验证通过后立即写入用户设置的密码
        if (view === "register" && password) {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) {
            onToast(authErrorText(error), 5000);
            return;
          }
        }
      }
      onAuthed();
      router.push("/today");
      router.refresh();
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
      {!isLogin && (
        <div className={styles.inputGroup}>
          <label htmlFor="register-password">{t("Password")}</label>
          <PasswordField
            id="register-password"
            name="password"
            autoComplete="new-password"
            placeholder={t("设置密码 (不少于8位)")}
            minLength={8}
            value={password}
            onChange={setPassword}
            status={registerStatus}
          />
        </div>
      )}
      {useCode ? (
        <div className={styles.inputGroup}>
          <div className={styles.codeHeader}>
            <label htmlFor={`${view}-code-0`}>{t("验证码")}</label>
            <button
              type="button"
              className={styles.codeButton}
              disabled={pending || cooldown > 0}
              onClick={() => void handleSendCode()}
            >
              {cooldown > 0 ? t("重发 ({seconds}s)", { seconds: cooldown }) : t("发送验证码")}
            </button>
          </div>
          <CodeField id={`${view}-code-0`} value={code} onChange={setCode} disabled={pending} />
        </div>
      ) : (
        <div className={styles.inputGroup}>
          <label htmlFor="login-password">{t("Password")}</label>
          <PasswordField
            id="login-password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
            status="none"
          />
        </div>
      )}
      {isLogin && loginMode === "password" && (
        <div className={styles.formActions}>
          <button
            className={styles.link}
            type="button"
            disabled={pending}
            onClick={() => onForgotPassword(currentEmail())}
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
    </form>
  );
}
