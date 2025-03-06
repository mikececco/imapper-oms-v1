/**
 * Environment variable utility to ensure consistent access across the application
 */

// Check if we're in a build context
const isBuildTime = process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.VERCEL_ENV;

// Helper function to safely get environment variables
const getEnvVar = (name, defaultValue = '') => {
  // For client-side code
  if (typeof window !== 'undefined') {
    // Check if the variable is available in window.__ENV__
    if (window.__ENV__ && window.__ENV__[name]) {
      return window.__ENV__[name];
    }
    
    // Check if Next.js exposed it via NEXT_PUBLIC_
    const publicName = name.startsWith('NEXT_PUBLIC_') ? name : `NEXT_PUBLIC_${name}`;
    if (process.env[publicName]) {
      return process.env[publicName];
    }
    
    // For variables that should be available on the client
    if (process.env[name]) {
      return process.env[name];
    }
  } else {
    // For server-side code
    if (process.env[name]) {
      return process.env[name];
    }
  }
  
  return defaultValue;
};

// Environment variables for the application

// Supabase Configuration
export const SUPABASE_URL = getEnvVar('NEXT_PUBLIC_SUPABASE_URL', 
  !isBuildTime ? (process.env.NEXT_PUBLIC_SUPABASE_URL || '') : 'build-placeholder');
export const SUPABASE_ANON_KEY = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY',
  !isBuildTime ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '') : 'build-placeholder');
export const SUPABASE_SERVICE_ROLE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY',
  !isBuildTime ? (process.env.SUPABASE_SERVICE_ROLE_KEY || '') : 'build-placeholder');

// Server-side Supabase Configuration
export const SERVER_SUPABASE_URL = getEnvVar('NEXT_SUPABASE_URL', 
  !isBuildTime ? (process.env.NEXT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '') : 'build-placeholder');
export const SERVER_SUPABASE_ANON_KEY = getEnvVar('NEXT_SUPABASE_ANON_KEY',
  !isBuildTime ? (process.env.NEXT_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '') : 'build-placeholder');

// Stripe Configuration
export const STRIPE_SECRET_KEY = getEnvVar('STRIPE_SECRET_KEY',
  !isBuildTime ? (process.env.STRIPE_SECRET_KEY || '') : 'build-placeholder');
export const STRIPE_WEBHOOK_SECRET = getEnvVar('STRIPE_WEBHOOK_SECRET',
  !isBuildTime ? (process.env.STRIPE_WEBHOOK_SECRET || '') : 'build-placeholder');

// SendCloud Configuration
export const SENDCLOUD_API_KEY = getEnvVar('SENDCLOUD_API_KEY',
  !isBuildTime ? (process.env.SENDCLOUD_API_KEY || '') : 'build-placeholder');
export const SENDCLOUD_API_SECRET = getEnvVar('SENDCLOUD_API_SECRET',
  !isBuildTime ? (process.env.SENDCLOUD_API_SECRET || '') : 'build-placeholder');

// API URL
export const API_URL = getEnvVar('NEXT_PUBLIC_API_URL',
  !isBuildTime ? (process.env.NEXT_PUBLIC_API_URL || '') : 'build-placeholder');

// Environment
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_TEST = process.env.NODE_ENV === 'test';

// Log environment variables in development for debugging
if (IS_DEVELOPMENT && typeof window !== 'undefined') {
  console.log('Environment variables loaded:', {
    SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? '[REDACTED]' : undefined,
    API_URL,
    IS_DEVELOPMENT,
    IS_PRODUCTION
  });
}

// Validate environment variables
export function validateEnvironment() {
  const warnings = [];
  
  // Only validate in development mode
  if (!IS_DEVELOPMENT) {
    return true;
  }
  
  if (!SUPABASE_URL) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL is not defined');
  }
  
  if (!SUPABASE_ANON_KEY) {
    warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined');
  }
  
  if (!STRIPE_SECRET_KEY) {
    warnings.push('STRIPE_SECRET_KEY is not defined');
  }
  
  if (!STRIPE_WEBHOOK_SECRET) {
    warnings.push('STRIPE_WEBHOOK_SECRET is not defined');
  }
  
  if (!SENDCLOUD_API_KEY) {
    warnings.push('SENDCLOUD_API_KEY is not defined');
  }
  
  if (!SENDCLOUD_API_SECRET) {
    warnings.push('SENDCLOUD_API_SECRET is not defined');
  }
  
  if (warnings.length > 0) {
    console.warn('Environment validation warnings:');
    warnings.forEach(warning => console.warn(`- ${warning}`));
    return false;
  }
  
  return true;
}

// Check if required environment variables are set
export function checkRequiredEnvVars() {
  // During build time, we don't want to throw errors
  if (isBuildTime) {
    return true;
  }
  
  const requiredVars = [
    { name: 'SUPABASE_URL', value: SUPABASE_URL },
    { name: 'SUPABASE_ANON_KEY', value: SUPABASE_ANON_KEY },
    { name: 'STRIPE_SECRET_KEY', value: STRIPE_SECRET_KEY },
    { name: 'STRIPE_WEBHOOK_SECRET', value: STRIPE_WEBHOOK_SECRET },
    { name: 'SENDCLOUD_API_KEY', value: SENDCLOUD_API_KEY },
    { name: 'SENDCLOUD_API_SECRET', value: SENDCLOUD_API_SECRET }
  ];
  
  const missingVars = requiredVars.filter(v => !v.value || v.value === 'build-placeholder');
  
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
  IS_DEVELOPMENT,
  IS_PRODUCTION,
  IS_TEST,
  validateEnvironment,
  checkRequiredEnvVars,
}; 