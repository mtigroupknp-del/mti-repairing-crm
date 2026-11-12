
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/@prisma/adapter-pg/**/*",
      "./node_modules/@prisma/client/**/*",
      "./node_modules/pg/**/*",
      "./app/generated/prisma/**/*"
    ]
  },

  experimental: {
    agentFeedback: true,
  },

  cacheComponents: true,
  partialPrefetching: true,

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
