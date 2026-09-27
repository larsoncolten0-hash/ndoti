import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produces a small self-contained server in .next/standalone for a cheap VPS or Docker.
  output: 'standalone',
  images: { remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }] },
  async headers() {
    return [
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/' }] },
    ];
  },
};

export default nextConfig;
