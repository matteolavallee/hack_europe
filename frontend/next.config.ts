/// <reference types="node" />
import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "node:path";

const isLocal = process.env.VERCEL !== "1";

// En local, charger .env du répertoire parent (monorepo). Sur Vercel, ignoré.
if (isLocal) {
  try {
    const projectDir = process.cwd();
    loadEnvConfig(path.resolve(projectDir, ".."));
  } catch {
    // Ignore si le fichier parent n'existe pas
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
