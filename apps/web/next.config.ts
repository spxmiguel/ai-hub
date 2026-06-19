import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@ai-hub/provider-core',
    '@ai-hub/memory-manager',
    '@ai-hub/skills-registry',
    '@ai-hub/keystore',
    '@ai-hub/drive-sync',
  ],
};

export default nextConfig;
