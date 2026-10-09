import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['tesseract.js', 'sharp'],
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
