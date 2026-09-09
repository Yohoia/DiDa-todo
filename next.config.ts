import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The desktop preview uses 127.0.0.1 while `pnpm dev` defaults to localhost.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
