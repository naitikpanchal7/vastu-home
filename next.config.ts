import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  serverExternalPackages: ["@anthropic-ai/sdk"],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Use the browser build of paper.js (avoids the jsdom/Node.js canvas dependency)
      config.resolve.alias = {
        ...config.resolve.alias,
        paper: path.resolve("node_modules/paper/dist/paper-full.js"),
      };
    } else {
      // Prevent paper.js from being bundled server-side at all
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
        "paper",
      ].filter(Boolean);
    }
    return config;
  },
};

export default nextConfig;
