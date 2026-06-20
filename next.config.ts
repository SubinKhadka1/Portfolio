import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
    proxyClientMaxBodySize: "200mb",
  },
  // Public media is served as static assets; avoid copying ~450MB into every serverless function.
  outputFileTracingExcludes: {
    "/*": ["./public/videos/**", "./public/designs/**", "./public/logos/**"],
  },
};

export default nextConfig;
