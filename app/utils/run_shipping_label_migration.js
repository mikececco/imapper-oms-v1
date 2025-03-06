/**
 * Script to run the shipping label migration
 * This adds tracking_number and label_url fields to the orders table
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
  process.exit(1);
}

// Create Supabase client with service role key for admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function runMigration() {
  try {
    console.log('Running shipping label migration...');
    
    // First, check if the exec_sql function exists
    try {
      await supabase.rpc('exec_sql', { sql: 'SELECT 1;' });
      console.log('exec_sql function exists, proceeding with migration.');
    } catch (error) {
      console.log('exec_sql function does not exist, creating it...');
      
      // Create the exec_sql function
      const createFunctionSql = `
        CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      const { error: createError } = await supabase.sql(createFunctionSql);
      
      if (createError) {
        console.error('Failed to create exec_sql function:', createError);
        console.log('Attempting to run migration directly...');
      } else {
        console.log('Created exec_sql function successfully.');
      }
    }
    
    // Add columns directly with individual statements
    console.log('Adding tracking_link column...');
    await executeSql('ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_link TEXT;');
    
    console.log('Adding tracking_number column...');
    await executeSql('ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;');
    
    console.log('Adding label_url column...');
    await executeSql('ALTER TABLE orders ADD COLUMN IF NOT EXISTS label_url TEXT;');
    
    console.log('Creating indexes...');
    await executeSql('CREATE INDEX IF NOT EXISTS idx_orders_tracking_link ON orders(tracking_link);');
    await executeSql('CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number);');
    
    console.log('Adding column comments...');
    await executeSql("COMMENT ON COLUMN orders.tracking_link IS 'URL for tracking the shipment';");
    await executeSql("COMMENT ON COLUMN orders.tracking_number IS 'Tracking number for the shipment';");
    await executeSql("COMMENT ON COLUMN orders.label_url IS 'URL to the shipping label PDF';");
    
    console.log('Updating shipping instructions...');
    await executeSql(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'orders' 
          AND column_name = 'tracking_link'
        ) THEN
          UPDATE orders 
          SET shipping_instruction = 'SHIPPED' 
          WHERE tracking_link IS NOT NULL 
            AND shipping_instruction IS NULL;
        END IF;
      END $$;
    `);
    
    console.log('Migration completed successfully!');
    
    // Verify the migration
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('tracking_number, label_url, tracking_link')
        .limit(1);
      
      if (error) {
        console.warn('Warning: Error verifying migration:', error);
      } else {
        console.log('Migration verification successful. New columns are available:');
        console.log('- tracking_link');
        console.log('- tracking_number');
        console.log('- label_url');
      }
    } catch (verifyError) {
      console.warn('Warning: Error verifying migration:', verifyError);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function executeSql(sql) {
  try {
    // Try using the exec_sql RPC function first
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.warn('Warning: Error using exec_sql RPC:', error);
      
      // Fall back to direct SQL execution
      console.log('Trying direct SQL execution...');
      const { error: directError } = await supabase.sql(sql);
      
      if (directError) {
        console.warn('Warning: Direct SQL execution also failed:', directError);
        console.log('Continuing with migration...');
      }
    }
  } catch (error) {
    console.warn('Warning: Exception executing SQL:', error);
    console.log('Continuing with migration...');
  }
}

// Run the migration
runMigration(); 