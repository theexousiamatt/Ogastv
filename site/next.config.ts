import type { NextConfig } from 'next';
import { withPayload } from '@payloadcms/next/withPayload';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Hostinger's quota-limited build filesystem cannot sustain webpack disk caches.
  // Disabling production caching avoids duplicating large cache packs per deployment.
  webpack: (config, {dev}) => {
    if (!dev) config.cache = false;
    return config;
  },
  // Deploy a minimal server bundle; avoids Hostinger packaging the full dependency tree.
  output: 'standalone',
  // Payload displays its own create-first-user form on empty installations,
  // but this newsroom requires a verified private invitation instead.
  async redirects() {
    return [{ source: '/admin/create-first-user', destination: '/activate-newsroom', permanent: false }];
  },
};

export default withPayload(nextConfig);
