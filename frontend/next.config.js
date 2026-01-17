// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Environment variables that should be available on both server and client
  env: {
    NEXT_PUBLIC_ALCHEMY_ARBITRUM_TESTNET_URL: process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_TESTNET_URL,
    NEXT_PUBLIC_COREWRITER_ORACLE: process.env.NEXT_PUBLIC_COREWRITER_ORACLE,
    NEXT_PUBLIC_V4_SWAP_EXECUTOR: process.env.NEXT_PUBLIC_V4_SWAP_EXECUTOR,
    NEXT_PUBLIC_CRON_SECRET: process.env.NEXT_PUBLIC_CRON_SECRET,
  },
  
  // Server-only environment variables (won't be exposed to browser)
  serverRuntimeConfig: {
    ALCHEMY_ARBITRUM_TESTNET_URL: process.env.ALCHEMY_ARBITRUM_TESTNET_URL,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    WS_URL: process.env.WS_URL,
  },
  
  // Fixed the experimental config (serverComponentsExternalPackages moved to top level)
  serverExternalPackages: ['viem', '@wagmi/core', 'ethers', 'dotenv'],
  
  // Webpack configuration for ethers.js
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
      }
    }
    return config
  }
}

module.exports = nextConfig