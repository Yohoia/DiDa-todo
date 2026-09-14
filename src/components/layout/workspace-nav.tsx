"use client";
import { useI18n } from "@/features/preferences/preferences-provider";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { HiCalendar, HiClock, HiInbox, HiMicrophone, HiUser } from "react-icons/hi2";
import { useWorkspace } from "@/features/tasks/workspace-provider";
import { VoiceCaptureBar, useVoiceCapture } from "@/features/tasks/voice-capture";
import { VoiceConfirmCard } from "@/features/tasks/voice-confirm-card";
import { cn } from "@/lib/utils";
import styles from "./workspace-nav.module.css";

export const workspaceLinks = [
  { href: "/today", label: "Today", description: "今日计划" },
  { href: "/inbox", label: "Inbox", description: "收集想法" },
  { href: "/schedule", label: "Schedule", description: "按日期查看待办" },
  { href: "/list-detail", label: "Work & Projects", description: "工作清单" },
  { href: "/completed", label: "Archive", description: "已完成任务" },
  { href: "/insight", label: "Insights", description: "效率统计" },
  { href: "/settings", label: "Settings", description: "偏好设置" },
  { href: "/profile", label: "Profile", description: "个人主页" },
];

/* 变形编排（正向·黑洞吸入）：四组图标加速涌向 dock 正中，交替旋转着缩没，
   声纹在吸入完成后才弹现"点亮"，整段约 0.65s 慢速可读；
   反向：胶囊快速退场，dock 弹簧回弹，图标从中心旋出归位。 */
const rowVariants: Variants = {
  nav: { transition: { staggerChildren: 0.05, delayChildren: 0.16 } },
  voice: { transition: { staggerChildren: 0.02 } },
};
/* 各 slot 收向 dock 正中（640px）所需的位移，按当前图标布局标定 */
const CONVERGE_X = [100, 51, -25, -100];
const itemVariants: Variants = {
  nav: {
    opacity: 1,
    scale: 1,
    x: 0,
    rotate: 0,
    transition: { type: "spring", stiffness: 320, damping: 22 },
  },
  voice: (index: number) => ({
    opacity: 0,
    scale: 0,
    /* 交替旋向 + 加速曲线：像被引力卷入黑洞的螺旋轨迹 */
    rotate: (index % 2 === 0 ? 1 : -1) * 110,
    x: CONVERGE_X[index],
    transition: {
      /* 先保持可见走完大半程，最后随吸入加速消隐 */
      opacity: { duration: 0.36, ease: "easeIn", delay: 0.1 },
      default: { duration: 0.52, ease: [0.6, 0, 0.9, 0.4] },
    },
  }),
};

/** dock 水平 padding(16×2) + 边框(1×2)，用于从胶囊内容尺寸推算整体宽高 */
const DOCK_CHROME = 34;
/** dock 垂直 padding(10×2) + 边框(1×2) */
const DOCK_CHROME_Y = 22;

export function WorkspaceNav() {
  const { t, label: translateLabel } = useI18n();
  const pathname = usePathname();
  const { tasks, voiceCapture } = useWorkspace();
  const { startVoice, confirmVoice, cancelVoice, addConfirmed, editConfirmed, audioLevel } =
    useVoiceCapture();
  const navRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const capsuleMode = voiceCapture !== null;
  const [capsuleSize, setCapsuleSize] = useState<{ w: number; h: number } | null>(null);
  const measureCapsule = useCallback(
    (w: number, h: number) => setCapsuleSize({ w: w + DOCK_CHROME, h: h + DOCK_CHROME_Y }),
    [],
  );
  const [navSize, setNavSize] = useState<{ w: number; h: number } | null>(null);
  /**
   * 宽高用真实数值动画（非 layout 的 scaleX 变换）：nav 全程零 transform，
   * 图标的吸入轨迹不会被容器形变挤压。导航态目标尺寸在每次翻转后用
   * offsetWidth 实测（transform 无关；悬浮态下即自然内容宽），目标值稳定，
   * 不会在回弹中途被重测 retarget 打断；窄屏按媒体查询口径取整行宽度。
   */
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const w =
      window.innerWidth <= 600
        ? Math.min(window.innerWidth - 40, 380)
        : row.offsetWidth + DOCK_CHROME;
    const h = row.offsetHeight + DOCK_CHROME_Y;
    setNavSize((prev) => (prev?.w === w && prev?.h === h ? prev : { w, h }));
  }, [capsuleMode]);
  const size = capsuleMode ? capsuleSize : navSize;
  const items = [
    { href: "/today", label: "今日待办", Icon: HiClock, active: pathname === "/today" },
    { href: "/inbox", label: "Inbox", Icon: HiInbox, active: pathname === "/inbox" },
    {
      href: "/schedule",
      label: "日程安排",
      Icon: HiCalendar,
      active: pathname === "/schedule",
    },
    {
      href: "/profile",
      label: "个人中心",
      Icon: HiUser,
      active: ["/profile", "/settings", "/insight", "/completed", "/list-detail"].includes(
        pathname,
      ),
    },
  ];
  return (
    <motion.nav
      ref={navRef}
      animate={size ? { width: size.w, height: size.h } : undefined}
      transition={
        voiceCapture
          ? /* 正向收缩：与黑洞吸入同步的丝绸 easeOut，慢速可读 */
            { duration: 0.5, ease: [0.32, 0.72, 0, 1] }
          : /* 反向回弹：无延迟 easeOut，避免 retarget 竞态；弹性交给图标自身的弹簧 */
            { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }
      }
      /* 回到导航态收尾后清掉行内宽高，交还 CSS（含窄屏媒体查询）接管 */
      onAnimationComplete={() => {
        if (!voiceCapture && navRef.current) {
          navRef.current.style.width = "";
          navRef.current.style.height = "";
        }
      }}
      className={cn(styles.dock, voiceCapture && styles.voiceDock)}
      aria-label={t("工作台导航")}
    >
      {/* layout 只负责悬浮/回流切换时的盒模型过渡（窄屏图标间距平滑归位）；
          nav 已无缩放变换，不存在需要修正的畸变 */}
      <motion.div
        layout
        ref={rowRef}
        className={cn(styles.row, voiceCapture && styles.floating)}
        variants={rowVariants}
        initial="nav"
        animate={voiceCapture ? "voice" : "nav"}
        inert={voiceCapture ? true : undefined}
      >
        {items.map(({ href, label, Icon, active }, index) => (
          <motion.span className={styles.slot} key={href} variants={itemVariants} custom={index}>
            {index === 2 && (
              <button
                type="button"
                className={styles.add}
                data-quick-add
                aria-label={t("语音输入")}
                title={t("语音输入")}
                onClick={startVoice}
              >
                <HiMicrophone size={19} />
              </button>
            )}
            <Link
              href={href}
              aria-label={translateLabel(label)}
              aria-current={active ? "page" : undefined}
              className={cn(styles.item, active && styles.active)}
            >
              <span className={styles.label}>{translateLabel(label)}</span>
              <Icon size={22} />
              {href === "/inbox" &&
                tasks.some((task) => task.list === "Inbox" && !task.completed) && (
                  <span className={styles.dot} />
                )}
            </Link>
          </motion.span>
        ))}
      </motion.div>
      <VoiceCaptureBar
        state={voiceCapture}
        audioLevel={audioLevel}
        onPrimary={voiceCapture?.phase === "confirming" ? addConfirmed : confirmVoice}
        onCancel={cancelVoice}
        onMeasure={measureCapsule}
      />
      {voiceCapture?.phase === "confirming" && (
        <VoiceConfirmCard
          state={voiceCapture}
          onDiscard={cancelVoice}
          onEdit={editConfirmed}
          onAdd={addConfirmed}
        />
      )}
    </motion.nav>
  );
}
