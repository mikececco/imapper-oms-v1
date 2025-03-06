/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure API routes are properly handled
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? `${process.env.NEXT_PUBLIC_API_URL || '/api'}/:path*`
          : 'http://localhost:5000/api/:path*',
      },
    ];
  },
  // Add output configuration for Vercel
  output: 'standalone',
  // Disable image optimization if not needed
  images: {
    unoptimized: true,
  },
  // Add environment variables that should be available at build time
  env: {
    NEXT_SUPABASE_URL: process.env.NEXT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_SUPABASE_ANON_KEY: process.env.NEXT_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  },
  // Ensure environment variables are properly exposed
  publicRuntimeConfig: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  serverRuntimeConfig: {
    NEXT_SUPABASE_URL: process.env.NEXT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_SUPABASE_ANON_KEY: process.env.NEXT_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  },
};

module.exports = nextConfig; 