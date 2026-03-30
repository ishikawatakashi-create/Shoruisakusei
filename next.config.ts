import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "puppeteer",
    "puppeteer-core",
    "@sparticuz/chromium",
    "@prisma/client",
    ".prisma/client",
  ],
  outputFileTracingIncludes: {
    "/api/documents/\\[id\\]/pdf": [
      "./node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff2",
      "./node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff2",
    ],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
