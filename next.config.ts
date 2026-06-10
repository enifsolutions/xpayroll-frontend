import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    API_TARGET: process.env.API_TARGET,
  },
  devIndicators: false,
  allowedDevOrigins: [
    '192.168.8.110',
    '192.168.8.135',
  ],
}

export default nextConfig