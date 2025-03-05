/**
 * Script to check the database schema in Supabase
 * 
 * This script connects to your Supabase database and checks what tables exist.
 * 
 * Usage:
 * node src/utils/check_schema.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`
});

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_SUPABASE_URL,
  process.env.NEXT_SUPABASE_ANON_KEY
);

async function checkSchema() {
  try {
    console.log('Checking Supabase database schema...');
    console.log('Using URL:', process.env.NEXT_SUPABASE_URL);
    
    // Check if we can connect to Supabase
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error connecting to Supabase:', userError.message);
      return;
    }
    
    console.log('Successfully connected to Supabase');
    
    // Try to query the orders table
    console.log('\nChecking orders table...');
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (ordersError) {
      console.error('Error querying orders table:', ordersError.message);
      console.log('The orders table might not exist or you might not have permission to access it.');
    } else {
      console.log('Orders table exists!');
      console.log(`Found ${ordersData.length} rows`);
      
      // Check columns in the orders table
      const { data: ordersColumns, error: columnsError } = await supabase
        .rpc('get_table_columns', { table_name: 'orders' });
      
      if (columnsError) {
        console.log('Could not get columns for orders table:', columnsError.message);
      } else {
        console.log('Columns in orders table:', ordersColumns);
      }
    }
    
    // Try to query the subscriptions table
    console.log('\nChecking subscriptions table...');
    const { data: subsData, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .limit(1);
    
    if (subsError) {
      console.error('Error querying subscriptions table:', subsError.message);
      console.log('The subscriptions table might not exist or you might not have permission to access it.');
    } else {
      console.log('Subscriptions table exists!');
      console.log(`Found ${subsData.length} rows`);
    }
    
    // Try a direct SQL query to list tables
    console.log('\nAttempting to list all tables using SQL...');
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('exec_sql_select', { 
        sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'" 
      });
    
    if (tablesError) {
      console.error('Error listing tables:', tablesError.message);
      console.log('You might need to create the exec_sql_select function in Supabase.');
      
      // Provide the SQL to create the function
      console.log('\nRun this SQL in the Supabase SQL Editor to create the function:');
      console.log(`
CREATE OR REPLACE FUNCTION exec_sql_select(sql text)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE sql;
END;
$$;
      `);
    } else {
      console.log('Tables in your database:');
      console.log(tablesData);
    }
    
    console.log('\nSchema check completed.');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the schema check
checkSchema(); 