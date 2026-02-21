import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: '/tmp/hack_europe_next',
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      // Ignore iCloud-synced metadata, build output, and node_modules
      ignored: [
        '**/.git/**',
        '**/node_modules/**',
        '**/tmp/**',
        '**/.next/**',
      ],
      // Debounce to avoid cascading recompiles from iCloud metadata changes
      aggregateTimeout: 500,
    };
    return config;
  },
};

export default nextConfig;
