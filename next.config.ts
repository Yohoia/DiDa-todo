import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The desktop preview uses 127.0.0.1 while `pnpm dev` defaults to localhost.
  allowedDevOrigins: ["127.0.0.1"],
  // 旧的 /upcoming 路由已更名为 /schedule，保留跳转兼容旧链接。
  async redirects() {
    return [{ source: "/upcoming", destination: "/schedule", permanent: true }];
  },
};

export default nextConfig;
