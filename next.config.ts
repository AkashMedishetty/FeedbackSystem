import type { NextConfig } from "next";
import { InjectManifest } from 'workbox-webpack-plugin';

const nextConfig: NextConfig = {
  serverExternalPackages: ['mongoose'],
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // PWA configuration with Workbox
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      config.plugins.push(
        new InjectManifest({
          swSrc: './src/lib/sw/sw.ts',
          swDest: '../public/sw.js',
        })
      );
    }
    return config;
  },
  // Headers for PWA support
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
