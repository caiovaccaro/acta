/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@acta/shared', '@acta/db', '@acta/core', '@acta/api'],
  // Optimize for serverless
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  // Don't fail build on ESLint errors during build (we'll fix them)
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors. Only use this if you know what you're doing.
    ignoreDuringBuilds: false,
  },
  // Output mode: standalone for Vercel deployment
  output: 'standalone',
}

module.exports = nextConfig
