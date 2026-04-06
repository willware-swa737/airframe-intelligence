import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
