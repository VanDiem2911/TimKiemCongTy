import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  ...(process.env.DOCKER_BUILD === '1' ? { output: 'standalone' } : {}),
  async redirects() {
    return [
      {
        source: '/tra-cuu-ma-so-thue-ca-nhan/:path*',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
