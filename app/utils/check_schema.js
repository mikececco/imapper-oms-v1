/**
 * Script to check the database schema
 * 
 * Usage:
 * node app/utils/check_schema.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.development' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env.development file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    console.log('Checking database schema...');
    
    // Get list of tables
    const { data: tables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
      
    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return;
    }
    
    console.log('Tables in the database:');
    console.log(tables.map(t => t.tablename).join(', '));
    
    // Check orders table columns
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'orders' });
      
    if (columnsError) {
      console.error('Error fetching columns for orders table:', columnsError);
      
      // Try alternative approach
      console.log('Trying alternative approach...');
      const { data: info, error: infoError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'orders')
        .eq('table_schema', 'public');
        
      if (infoError) {
        console.error('Error fetching columns from information_schema:', infoError);
        return;
      }
      
      console.log('Columns in the orders table:');
      console.table(info);
      return;
    }
    
    console.log('Columns in the orders table:');
    console.table(columns);
    
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

// Run the function
checkSchema().catch(console.error); 