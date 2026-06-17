import type { NextConfig } from 'next'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

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
