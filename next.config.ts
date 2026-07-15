import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel optimization
  output: 'standalone',
  experimental: {
    // Helps with static generation
  },
};

export default nextConfig;
