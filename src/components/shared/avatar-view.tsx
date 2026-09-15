"use client";
import ReactNiceAvatar, { genConfig } from "react-nice-avatar";

/**
 * react-nice-avatar 渲染包装：库是 class 组件（服务端组件环境无 React.Component，
 * 不能在 RSC 中 import），统一包成客户端组件，按种子确定性生成形象。
 */
export function AvatarView({ seed, className }: { seed: string; className?: string }) {
  return <ReactNiceAvatar {...genConfig(seed)} className={className} shape="circle" />;
}
