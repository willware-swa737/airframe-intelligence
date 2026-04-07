import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allow production builds to succeed even with TypeScript errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow production builds to succeed even with ESLint errors
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.trade-a-plane.com" },
      { protocol: "https", hostname: "**.controller.com" },
      { protocol: "https", hostname: "**.barnstormers.com" },
    ],
  },
};

export default nextConfig;
