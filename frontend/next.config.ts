/// <reference types="node" />
import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "node:path";

const isLocal = process.env.VERCEL !== "1";

// Locally, load .env from the parent directory (monorepo). On Vercel, this is ignored.
if (isLocal) {
  try {
    const projectDir = process.cwd();
    loadEnvConfig(path.resolve(projectDir, ".."));
  } catch {
    // Ignore if the parent file doesn't exist
  }
}

const nextConfig: NextConfig = {
  // Only use custom distDir locally (Vercel manages its own build output)
  ...(isLocal && { distDir: '/tmp/hack_europe_next' }),
  // Silence the Turbopack/webpack conflict warning; webpack config only applies locally
  turbopack: {},
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/.git/**',
        '**/node_modules/**',
        '**/tmp/**',
        '**/.next/**',
      ],
      aggregateTimeout: 500,
    };
    return config;
  },
};

export default nextConfig;
