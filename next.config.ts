import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [384, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [128, 168, 256, 336, 380, 440, 512],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
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
