import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["generated/prisma/**/*"],
  },
};

export default nextConfig;
