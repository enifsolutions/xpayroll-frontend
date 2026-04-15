import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    API_TARGET: process.env.API_TARGET,
  },
  devIndicators: false,
}

export default nextConfig