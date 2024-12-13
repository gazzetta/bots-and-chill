/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false
    };
    return config;
  }
};

module.exports = nextConfig; 