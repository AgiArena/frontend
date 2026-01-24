import type { NextConfig } from "next";

const BACKEND_URL = "https://63.179.141.230";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Webpack config to handle WalletConnect's pino-pretty optional dependency
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/api/leaderboard",
        destination: `${BACKEND_URL}/api/leaderboard`,
      },
      {
        source: "/api/leaderboard/:path*",
        destination: `${BACKEND_URL}/api/leaderboard/:path*`,
      },
      {
        source: "/api/bets/:path*",
        destination: `${BACKEND_URL}/api/bets/:path*`,
      },
      {
        source: "/api/agents/:path*",
        destination: `${BACKEND_URL}/api/agents/:path*`,
      },
      {
        source: "/api/resolutions/:path*",
        destination: `${BACKEND_URL}/api/resolutions/:path*`,
      },
      {
        source: "/api/telegram/:path*",
        destination: `${BACKEND_URL}/api/telegram/:path*`,
      },
      {
        source: "/api/sse/:path*",
        destination: `${BACKEND_URL}/api/sse/:path*`,
      },
      {
        source: "/api/keepers/:path*",
        destination: `${BACKEND_URL}/api/keepers/:path*`,
      },
      {
        source: "/health",
        destination: `${BACKEND_URL}/health`,
      },
    ];
  },
};

export default nextConfig;
