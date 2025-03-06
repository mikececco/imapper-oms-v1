/**
 * Database Migration Script for Supabase
 * 
 * This script reads the SQL migration files from the migrations directory
 * and executes them against your Supabase database.
 * 
 * Usage:
 * 1. Make sure your .env file contains NEXT_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * 2. Run: node app/utils/push_migration.js [filename]
 *    - If filename is provided, only that migration will be run
 *    - If no filename is provided, all migrations will be run
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`
});

// Validate environment variables
if (!process.env.NEXT_SUPABASE_URL) {
  console.error('Error: NEXT_SUPABASE_URL is not defined in your environment');
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
  process.env.NEXT_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Executes a SQL statement using Supabase
 */
async function executeSql(statement, index, total) {
  console.log(`Executing statement ${index}/${total}...`);
  
  try {
    // First try using the RPC method
    const { error } = await supabase.rpc('exec_sql', { sql: statement });
    
    if (error) {
      console.warn(`Warning: RPC method failed: ${error.message}`);
      console.log('Trying alternative method...');
      
      // Try alternative method using the _exec_sql table
      const { error: insertError } = await supabase
        .from('_exec_sql')
        .insert({ query: statement });
      
      if (insertError) {
        throw new Error(`Failed to execute SQL: ${insertError.message}`);
      }
    }
    
    console.log(`Statement ${index} executed successfully`);
    return true;
  } catch (error) {
    console.error(`Error executing statement ${index}:`, error);
    return false;
  }
}

/**
 * Runs a single migration file
 */
async function runMigrationFile(filePath) {
  try {
    console.log(`Processing migration file: ${filePath}`);
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(filePath, 'utf8');
    
    console.log('Migration SQL file loaded successfully');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    let successCount = 0;
    for (let i = 0; i < statements.length; i++) {
      const success = await executeSql(statements[i], i + 1, statements.length);
      if (success) successCount++;
    }
    
    console.log(`Migration completed: ${successCount}/${statements.length} statements executed successfully`);
    return successCount === statements.length;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

/**
 * Sets up the required SQL functions in Supabase
 */
async function setupSupabaseFunctions() {
  console.log('Setting up Supabase functions...');
  
  const setupSQL = `
  -- Create a function to execute arbitrary SQL
  CREATE OR REPLACE FUNCTION exec_sql(sql text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    EXECUTE sql;
  END;
  $$;

  -- Create a table to execute SQL via a query if the RPC method doesn't work
  CREATE TABLE IF NOT EXISTS _exec_sql (
    id SERIAL PRIMARY KEY,
    query TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Create a trigger to execute the SQL when inserted into the table
  CREATE OR REPLACE FUNCTION trigger_exec_sql()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    EXECUTE NEW.query;
    RETURN NEW;
  END;
  $$;

  -- Create the trigger
  DROP TRIGGER IF EXISTS exec_sql_trigger ON _exec_sql;
  CREATE TRIGGER exec_sql_trigger
  BEFORE INSERT ON _exec_sql
  FOR EACH ROW
  EXECUTE FUNCTION trigger_exec_sql();
  `;
  
  // Split the setup SQL into individual statements
  const statements = setupSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
  
  // Execute each statement directly using the Supabase query method
  for (let i = 0; i < statements.length; i++) {
    try {
      const { error } = await supabase.query(statements[i]);
      if (error) {
        console.warn(`Warning: Setup statement ${i + 1} failed: ${error.message}`);
        console.warn('This may be normal if the function already exists');
      }
    } catch (error) {
      console.warn(`Warning: Setup statement ${i + 1} failed: ${error.message}`);
      console.warn('This may be normal if the function already exists');
    }
  }
  
  console.log('Supabase functions setup completed');
}

/**
 * Runs all migration files in the migrations directory
 */
async function runAllMigrations() {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  
  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Error: Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }
  
  // Get all SQL files in the migrations directory
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => path.join(migrationsDir, file));
  
  if (migrationFiles.length === 0) {
    console.error('Error: No migration files found');
    process.exit(1);
  }
  
  console.log(`Found ${migrationFiles.length} migration files`);
  
  // Run each migration file
  let successCount = 0;
  for (const file of migrationFiles) {
    const success = await runMigrationFile(file);
    if (success) successCount++;
  }
  
  console.log(`Migration completed: ${successCount}/${migrationFiles.length} files processed successfully`);
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting database migration...');
    
    // Setup Supabase functions
    await setupSupabaseFunctions();
    
    // Check if a specific migration file was specified
    const specificFile = process.argv[2];
    
    if (specificFile) {
      // Run a specific migration file
      const filePath = path.join(process.cwd(), 'migrations', specificFile);
      
      if (!fs.existsSync(filePath)) {
        console.error(`Error: Migration file not found: ${filePath}`);
        process.exit(1);
      }
      
      await runMigrationFile(filePath);
    } else {
      // Run all migration files
      await runAllMigrations();
    }
    
    console.log('Migration process completed');
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  }
}

// Run the migration
main(); 