/**
 * Database Migration Script for Supabase
 * 
 * This script reads the SQL migration file and executes it against your Supabase database.
 * It uses the Supabase JavaScript client with the service role key for authentication.
 * 
 * Usage:
 * 1. Make sure your .env file contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * 2. Run: node src/utils/run_migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`
});

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL is not defined in your environment');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not defined in your environment');
  console.error('Note: You need the service role key (not the anon key) to run migrations');
  console.error('You can find it in your Supabase dashboard under Project Settings > API');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Runs the database migration
 */
async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Migration SQL file loaded successfully');
    
    // Split the SQL into individual statements
    // This is a simple split by semicolon, which works for basic SQL
    // For more complex SQL with functions, triggers, etc., you might need a more sophisticated parser
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      // Execute the SQL statement using Supabase's rpc function
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
        
        // Try alternative method if the rpc method fails
        console.log('Trying alternative method...');
        const { error: queryError } = await supabase.from('_exec_sql').select('*').eq('query', statement);
        
        if (queryError) {
          throw new Error(`Failed to execute statement ${i + 1}: ${error.message}\nSQL: ${statement}`);
        }
      }
      
      console.log(`Statement ${i + 1} executed successfully`);
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration(); 