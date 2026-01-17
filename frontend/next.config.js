/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Client env vars
  env: {
    NEXT_PUBLIC_ALCHEMY_ARBITRUM_TESTNET_URL: process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_TESTNET_URL,
    NEXT_PUBLIC_COREWRITER_ORACLE: process.env.NEXT_PUBLIC_COREWRITER_ORACLE,
    NEXT_PUBLIC_V4_SWAP_EXECUTOR: process.env.NEXT_PUBLIC_V4_SWAP_EXECUTOR,
    NEXT_PUBLIC_CRON_SECRET: process.env.NEXT_PUBLIC_CRON_SECRET,
  },
  
  // Server packages
  serverExternalPackages: ['viem', '@wagmi/core', 'ethers', 'dotenv'],
  
  // Silence Turbopack webpack warning
  turbopack: {},
  
  // Keep webpack config (Turbopack will ignore it safely)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        path: require.resolve('path-browserify'),
        os: require.resolve('os-browserify/browser'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
      };
    }
    return config;
  }
};

module.exports = nextConfig;