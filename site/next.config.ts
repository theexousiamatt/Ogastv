import type { NextConfig } from 'next';
import { withPayload } from '@payloadcms/next/withPayload';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Deploy a minimal server bundle; avoids Hostinger packaging the full dependency tree.
  output: 'standalone',
  // Payload displays its own create-first-user form on empty installations,
  // but this newsroom requires a verified private invitation instead.
  async redirects() {
    return [{ source: '/admin/create-first-user', destination: '/activate-newsroom', permanent: false }];
  },
};

export default withPayload(nextConfig);
