import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The desktop preview uses 127.0.0.1 while `pnpm dev` defaults to localhost.
  allowedDevOrigins: ["127.0.0.1"],
  // 旧日程路由已并入 Inbox；保留两级跳转，兼容已缓存过 /schedule 的客户端。
  async redirects() {
    return [
      { source: "/upcoming", destination: "/inbox", permanent: true },
      { source: "/schedule", destination: "/inbox", permanent: true },
    ];
  },
};

export default nextConfig;
