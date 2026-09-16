import { getI18n } from "@/i18n/server";
import Link from "next/link";
import { HiArrowRight, HiClock, HiSparkles } from "react-icons/hi2";
import { TbTarget } from "react-icons/tb";

import { Brand } from "@/components/shared/brand";
import { AvatarView } from "@/components/shared/avatar-view";
import { AuthDialogProvider, AuthTrigger } from "@/features/auth/auth-dialog";
import { avatarSeed } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { features, reviews } from "./landing-content";
import styles from "./landing.module.css";
import { TaskPreview } from "./task-preview";

export async function LandingPage() {
  const { t, label } = await getI18n();
  // 登录用户头部显示头像+名字直达工作台；访客保持登录按钮
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  let avatarUrl: string | null = null;
  if (user) {
    const { data: row } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    avatarUrl = row?.avatar_url ?? null;
  }
  const displayName =
    (user?.user_metadata?.name as string | undefined)?.trim() || user?.email?.split("@")[0] || "";
  const seed = user ? avatarSeed(avatarUrl, user.email) : null;
  return (
    <AuthDialogProvider>
      <div className={styles.page} id="home">
        <a href="#main-content" className={styles.skipLink}>
          {t("跳转到主要内容")}
        </a>
        <header className={styles.header}>
          <Brand className={styles.logo} />
          <nav className={styles.navLinks} aria-label={t("主导航")}>
            <a href="#home">{t("Home")}</a>
            <a href="#features">{t("Features")}</a>
            <a href="#get-started">{t("Pricing")}</a>
            <a href="#about">{t("About")}</a>
          </nav>
          <div className={styles.navActions}>
            {user && seed ? (
              <Link href="/today" className={styles.userChip} title={displayName}>
                <AvatarView seed={seed} className={styles.userAvatar} />
                <span>{displayName}</span>
              </Link>
            ) : (
              <AuthTrigger className={cn(styles.btn, styles.btnOutline)}>{t("Log In")}</AuthTrigger>
            )}
          </div>
        </header>

        <main id="main-content">
          <section className={cn(styles.hero, styles.container)} aria-labelledby="hero-title">
            <div className={styles.heroGrid}>
              <div>
                <div className={styles.tagline}>{t("Elegant Productivity")}</div>
                <h1 id="hero-title">
                  {t("滴滴待办")}
                  <br />
                  {t("从想法到完成")}
                  <br />
                  <span>{t("掌控每一天。")}</span>
                </h1>
                <p className={styles.desc}>
                  {t(
                    "DiDa-todo 是一款克制、优雅且强大的待办事项应用。剔除繁杂，聚焦核心，将您的时间管理升华为一门艺术。",
                  )}
                </p>
                {user ? (
                  <Link href="/today" className={cn(styles.btn, styles.btnGold, styles.heroButton)}>
                    {t("进入工作台")}
                  </Link>
                ) : (
                  <AuthTrigger
                    view="register"
                    className={cn(styles.btn, styles.btnGold, styles.heroButton)}
                  >
                    {t("立即开始探索")}
                  </AuthTrigger>
                )}
                <div className={styles.stats}>
                  <div className={styles.statItem}>
                    <h3>500k+</h3>
                    <p>{t("Global Elites")}</p>
                  </div>
                  <div className={styles.statItem}>
                    <h3>98%</h3>
                    <p>{t("Satisfaction")}</p>
                  </div>
                </div>
              </div>
              <TaskPreview />
            </div>
          </section>

          <section
            id="features"
            className={cn(styles.features, styles.container)}
            aria-labelledby="features-title"
          >
            <div className={styles.sectionSub}>{t("Core Features")}</div>
            <h2 id="features-title" className={styles.sectionTitle}>
              {t("Minimalism Meets Power")}
            </h2>
            <div className={styles.featuresGrid}>
              {features.map((feature) => (
                <article className={styles.featureCard} key={feature.title}>
                  <div className={styles.fIcon} aria-hidden="true">
                    {feature.number}
                  </div>
                  <h3>{label(feature.title)}</h3>
                  <p>{label(feature.description)}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="about" className={styles.promo} aria-labelledby="about-title">
            <div className={cn(styles.container, styles.promoGrid)}>
              <div className={styles.promoText}>
                <div className={cn(styles.tagline, styles.mutedTagline)}>{t("Beyond Todo")}</div>
                <h2 id="about-title">
                  {t("不仅是清单，")}
                  <br />
                  {t("更是您的效率挚友。")}
                </h2>
                <p>
                  {t(
                    "DiDa-todo 摒弃了花哨的焦虑感设计。我们用最纯粹的视觉呈现，帮助您规划时间、追踪进度，在平静中实现那些不可思议的成就。",
                  )}
                </p>
                <a
                  href="#testimonials"
                  className={cn(styles.btn, styles.btnOutline, styles.philosophyLink)}
                >
                  {t("探索哲学")}
                  <HiArrowRight size={16} />
                </a>
              </div>
              <div className={styles.promoCards}>
                {[
                  { Icon: TbTarget, title: "设定目标", text: "摒弃杂念，直击靶心" },
                  { Icon: HiClock, title: "记录成长", text: "让时间的刻度可见" },
                  { Icon: HiSparkles, title: "持续进化", text: "在平静中蜕变" },
                ].map(({ Icon, title, text }) => (
                  <article className={styles.pCard} key={title}>
                    <Icon className={styles.icon} size={24} aria-hidden="true" />
                    <h3>{label(title)}</h3>
                    <p>{label(text)}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section
            id="testimonials"
            className={cn(styles.testimonials, styles.container)}
            aria-labelledby="testimonials-title"
          >
            <div className={styles.sectionSub}>{t("Testimonials")}</div>
            <h2 id="testimonials-title" className={styles.sectionTitle}>
              {t("深受全球极简主义者青睐")}
            </h2>
            <div className={styles.reviewGrid}>
              {reviews.map((review) => (
                <figure className={styles.reviewCard} key={review.name}>
                  <span className={styles.quoteMark} aria-hidden="true">
                    “
                  </span>
                  <blockquote className={styles.reviewText}>{label(review.text)}</blockquote>
                  <figcaption className={styles.reviewer}>
                    <h3>{review.name}</h3>
                    <span>{label(review.role)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>

          <section id="get-started" className={styles.bottomCta} aria-labelledby="start-title">
            <div className={styles.container}>
              <h2 id="start-title">{t("重塑您的时间秩序。")}</h2>
              {user ? (
                <Link href="/today" className={cn(styles.btn, styles.btnGold, styles.ctaButton)}>
                  {t("进入工作台")}
                </Link>
              ) : (
                <AuthTrigger
                  view="register"
                  className={cn(styles.btn, styles.btnGold, styles.ctaButton)}
                >
                  {t("开启尊享体验")}
                </AuthTrigger>
              )}
            </div>
          </section>
        </main>
        <footer className={styles.footer}>
          {t("© 2026 DIDA-TODO. DESIGNED FOR THE FOCUSED MIND.")}
        </footer>
      </div>
    </AuthDialogProvider>
  );
}
