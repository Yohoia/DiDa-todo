"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
            <TabsList className={styles.tabs} aria-label="登录或注册">
              <TabsTrigger className={styles.tab} value="login">
                Log In
              </TabsTrigger>
              <TabsTrigger className={styles.tab} value="register">
                Sign Up
              </TabsTrigger>
            </TabsList>
            <div className={styles.heading}>
              <DialogTitle className={styles.title}>
                {view === "login" ? (
                  <>
                    Welcome <span>Back</span>
                  </>
                ) : (
                  <>
                    Join <span>DiDa-todo</span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription className={styles.description}>
                {view === "login"
                  ? "请输入您的凭证以进入工作台。"
                  : "注册账号，开启优雅的效率之旅。"}
              </DialogDescription>
            </div>
            <TabsContent value="login" className={styles.view}>
              <AuthForm view="login" />
            </TabsContent>
            <TabsContent value="register" className={styles.view}>
              <AuthForm view="register" />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}

function AuthForm({ view }: { view: AuthView }) {
  const [notice, setNotice] = useState("");
  const isLogin = view === "login";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(
      isLogin
        ? "当前为界面预览，登录服务尚未接入，您的凭证不会被提交。"
        : "当前为界面预览，注册服务尚未接入，您的信息不会被提交。",
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {!isLogin && (
        <div className={styles.inputGroup}>
          <label htmlFor="register-name">Full Name</label>
          <input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="您的姓名"
            required
            maxLength={80}
          />
        </div>
      )}
      <div className={styles.inputGroup}>
        <label htmlFor={`${view}-email`}>Email Address</label>
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
        <label htmlFor={`${view}-password`}>Password</label>
        <input
          id={`${view}-password`}
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          placeholder={isLogin ? "••••••••" : "设置密码 (不少于8位)"}
          minLength={isLogin ? undefined : 8}
          required
        />
      </div>
      {isLogin && (
        <div className={styles.formActions}>
          <label className={styles.remember}>
            <input type="checkbox" name="remember" />
            记住我
          </label>
          <button
            className={styles.link}
            type="button"
            onClick={() => setNotice("密码找回服务尚未开放，请在账号服务上线后使用。")}
          >
            忘记密码?
          </button>
        </div>
      )}
      <button className={styles.submit} type="submit">
        {isLogin ? "Sign In" : "Create Account"}
      </button>
      <p className={styles.notice} role="status" aria-live="polite">
        {notice}
      </p>
    </form>
  );
}
