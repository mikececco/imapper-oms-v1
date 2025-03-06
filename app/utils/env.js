/**
 * Environment variable utility to ensure consistent access across the application
 */

// Supabase configuration
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ppvcladrmrprkqclyycr.supabase.co';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdmNsYWRybXJwcmtxY2x5eWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExODcxMTMsImV4cCI6MjA1Njc2MzExM30.MtKxAaj-XiDdlritn2G3OtCFLoTzsayL8-Pget09sMA';

// Server-side Supabase configuration
export const SERVER_SUPABASE_URL = process.env.NEXT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ppvcladrmrprkqclyycr.supabase.co';
export const SERVER_SUPABASE_ANON_KEY = process.env.NEXT_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdmNsYWRybXJwcmtxY2x5eWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExODcxMTMsImV4cCI6MjA1Njc2MzExM30.MtKxAaj-XiDdlritn2G3OtCFLoTzsayL8-Pget09sMA';

// Stripe configuration
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_8J2R6srhPFSFN4FWjyRrDfGT00yM8f3TcY';
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_6ed010a3847d553a430c642df7f28b14e9feceb1d637270b9160d7ee5fc0da08';

// SendCloud configuration
export const SENDCLOUD_API_KEY = process.env.SENDCLOUD_API_KEY || '';
export const SENDCLOUD_API_SECRET = process.env.SENDCLOUD_API_SECRET || '';

// API configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Environment
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_TEST = process.env.NODE_ENV === 'test';

// Validate environment variables
export function validateEnvironment() {
  const warnings = [];
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL is not set. Using fallback value.');
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Using fallback value.');
  }
  
  if (!process.env.NEXT_SUPABASE_URL) {
    warnings.push('NEXT_SUPABASE_URL is not set. Using fallback value.');
  }
  
  if (!process.env.NEXT_SUPABASE_ANON_KEY) {
    warnings.push('NEXT_SUPABASE_ANON_KEY is not set. Using fallback value.');
  }
  
  if (!process.env.SENDCLOUD_API_KEY || !process.env.SENDCLOUD_API_SECRET) {
    warnings.push('SendCloud API credentials are not set. Tracking functionality will be limited.');
  }
  
  if (warnings.length > 0) {
    console.warn('Environment validation warnings:', warnings);
  }
  
  return warnings.length === 0;
}

// Export all environment variables
export default {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SERVER_SUPABASE_URL,
  SERVER_SUPABASE_ANON_KEY,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  SENDCLOUD_API_KEY,
  SENDCLOUD_API_SECRET,
  API_URL,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  IS_TEST,
  validateEnvironment,
}; 