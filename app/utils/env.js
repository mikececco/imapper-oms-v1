/**
 * Environment variable utility to ensure consistent access across the application
 */

// Supabase configuration
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Server-side Supabase configuration
export const SERVER_SUPABASE_URL = process.env.NEXT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SERVER_SUPABASE_ANON_KEY = process.env.NEXT_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Stripe configuration
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// SendCloud configuration
export const SENDCLOUD_API_KEY = process.env.SENDCLOUD_API_KEY || '';
export const SENDCLOUD_API_SECRET = process.env.SENDCLOUD_API_SECRET || '';

// API configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

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

// Check if required environment variables are set
export function checkRequiredEnvVars() {
  const requiredVars = [
    { name: 'SUPABASE_URL', value: SUPABASE_URL },
    { name: 'SUPABASE_ANON_KEY', value: SUPABASE_ANON_KEY },
    { name: 'STRIPE_SECRET_KEY', value: STRIPE_SECRET_KEY },
    { name: 'STRIPE_WEBHOOK_SECRET', value: STRIPE_WEBHOOK_SECRET },
    { name: 'SENDCLOUD_API_KEY', value: SENDCLOUD_API_KEY },
    { name: 'SENDCLOUD_API_SECRET', value: SENDCLOUD_API_SECRET }
  ];
  
  const missingVars = requiredVars.filter(v => !v.value);
  
  if (missingVars.length > 0) {
    console.warn(`Missing required environment variables: ${missingVars.map(v => v.name).join(', ')}`);
    return false;
  }
  
  return true;
}

// Export all environment variables
export default {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
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
  checkRequiredEnvVars,
}; 