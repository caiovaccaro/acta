/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@acta/shared', '@acta/db'],
}

module.exports = nextConfig
