import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "puppeteer",
    "puppeteer-core",
    "@sparticuz/chromium",
    "@prisma/client",
    ".prisma/client",
  ],
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
