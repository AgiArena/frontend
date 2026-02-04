import type { NextConfig } from "next";

const BACKEND_URL = "http://142.132.164.24";
const DATA_NODE_URL = "http://116.203.156.98/datanode";

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
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/leaderboard",
        destination: `${BACKEND_URL}/api/leaderboard`,
      },
      {
        source: "/api/leaderboard/live",
        destination: `${BACKEND_URL}/api/leaderboard/live`,
      },
      {
        source: "/api/trades/recent",
        destination: `${BACKEND_URL}/api/trades/recent`,
      },
      {
        source: "/api/bets/recent",
        destination: `${BACKEND_URL}/api/bets/recent`,
      },
      {
        source: "/api/bets/user/:path*",
        destination: `${BACKEND_URL}/api/bets/user/:path*`,
      },
      {
        source: "/api/sse/bets",
        destination: `${BACKEND_URL}/api/sse/bets`,
      },
      {
        source: "/api/agents/:path*",
        destination: `${BACKEND_URL}/api/agents/:path*`,
      },
      {
        source: "/health",
        destination: `${BACKEND_URL}/health`,
      },
      {
        source: "/data-node/:path*",
        destination: `${DATA_NODE_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
