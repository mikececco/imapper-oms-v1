// Script to check environment variables
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.development' });

console.log('Checking environment variables...');

// Check Supabase URL
const supabaseUrl = process.env.NEXT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing');

// Check Supabase Anon Key
const supabaseAnonKey = process.env.NEXT_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Found' : 'Missing');

// Check Supabase Service Role Key
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('Supabase Service Role Key:', supabaseServiceRoleKey ? 'Found' : 'Missing');

// List all environment variables (without showing actual values)
console.log('\nAll environment variables:');
Object.keys(process.env)
  .filter(key => key.includes('SUPABASE') || key.includes('NEXT'))
  .forEach(key => {
    const value = process.env[key];
    const maskedValue = value ? `${value.substring(0, 3)}...${value.substring(value.length - 3)}` : 'undefined';
    console.log(`${key}: ${maskedValue}`);
  });

console.log('\nEnvironment check completed.'); 