"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  createContext,
  useContext,
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
  const isLogin = view === "login";

  /** Supabase 英文错误 → 可读文案；未知错误原样展示（label 对非键文本原样返回）。 */
  function authErrorText(error: { code?: string; message: string }): string {
    const text = error.message.toLowerCase();
    if (error.code === "invalid_credentials" || text.includes("invalid login credentials")) {
      return "邮箱或密码不正确。";
    }
    if (error.code === "email_not_confirmed") return "邮箱尚未验证，请先查收确认邮件。";
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = fieldValue(form, "email").trim();
    const password = fieldValue(form, "password");
    const supabase = createClient();
    setPending(true);
    setNotice("");
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setNotice(authErrorText(error));
          return;
        }
      } else {
        const name = fieldValue(form, "name").trim();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          // name 进 raw_user_meta_data，注册触发器据此写 profiles.display_name
          options: { data: { name } },
        });
        if (error) {
          setNotice(authErrorText(error));
          return;
        }
        // 开启邮箱确认时 signUp 不返回会话：提示查收，不跳转
        if (!data.session) {
          setNotice("确认邮件已发送，请查收后再登录。");
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
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim());
      setNotice(error ? authErrorText(error) : "重置密码邮件已发送，请查收。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      {!isLogin && (
        <div className={styles.inputGroup}>
          <label htmlFor="register-name">{t("Full Name")}</label>
          <input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder={t("您的姓名")}
            required
            maxLength={80}
          />
        </div>
      )}
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
      <div className={styles.inputGroup}>
        <label htmlFor={`${view}-password`}>{t("Password")}</label>
        <input
          id={`${view}-password`}
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          placeholder={isLogin ? "••••••••" : t("设置密码 (不少于8位)")}
          minLength={isLogin ? undefined : 8}
          required
        />
      </div>
      {isLogin && (
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
      <Link href="/today" className={styles.previewLink}>
        {t("直接预览工作台 →")}
      </Link>
      <p className={styles.notice} role="status" aria-live="polite">
        {label(notice)}
      </p>
    </form>
  );
}
