import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  
  // Environment variable configuration
  env: {
    // Make environment switching available to client-side
    PROD_DB: process.env.PROD_DB,
    SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
  },

  // Experimental features
  experimental: {
    // Add experimental features as needed
  },

  // Rewrites for local development
  async rewrites() {
    // Only apply rewrites in development and when using local DB
    if (process.env.NODE_ENV === 'development' && process.env.PROD_DB !== 'true') {
      return [
        // Proxy Supabase requests to local instance
        {
          source: '/api/supabase/:path*',
          destination: 'http://127.0.0.1:54321/:path*',
        },
      ]
    }
    return []
  },

  // Headers for CORS and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
