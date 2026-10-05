import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  ...(process.env.DOCKER_BUILD === '1' ? { output: 'standalone' } : {}),
};

export default nextConfig;
