import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Temporarily disable React Compiler for stable builds
  // reactCompiler: true,
  experimental: {
    // Enable other experimental features if needed
  },
  typescript: {
    // Ignore TypeScript errors during build (temporary)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
