import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer", "@prisma/client", ".prisma/client"],
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
