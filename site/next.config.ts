import type { NextConfig } from 'next';
import { withPayload } from '@payloadcms/next/withPayload';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Deploy a minimal server bundle; avoids Hostinger packaging the full dependency tree.
  output: 'standalone',
};

export default withPayload(nextConfig);
