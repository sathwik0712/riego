import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  webpack: (config) => {
    const oneOfRule = config.module.rules.find((r: any) => r && r.oneOf);
    if (oneOfRule) {
      oneOfRule.oneOf.forEach((rule: any) => {
        if (rule.use && Array.isArray(rule.use)) {
          const hasCssLoader = rule.use.some(
            (u: any) =>
              (typeof u === "string" && u.includes("css-loader")) ||
              (u && u.loader && u.loader.includes("css-loader"))
          );
          if (hasCssLoader) {
            // Push @tailwindcss/turbopack as the first loader to run (rightmost in Webpack array)
            rule.use.push({
              loader: require.resolve("@tailwindcss/turbopack"),
            });
          }
        }
      });
    }
    return config;
  },
};

export default nextConfig;
