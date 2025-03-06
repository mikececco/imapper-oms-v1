/**
 * Script to check the schema of the orders table
 * 
 * Usage:
 * node app/utils/check_orders_schema.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.development
dotenv.config({ path: resolve(__dirname, '../../.env.development') });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your configuration.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrdersSchema() {
  try {
    console.log('Fetching a sample order to infer schema...');
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error fetching sample order:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Orders table schema (inferred from sample):');
      const columns = Object.keys(data[0]);
      columns.forEach(column => {
        const value = data[0][column];
        const type = typeof value;
        console.log(`- ${column}: ${type} ${value !== null ? `(example: ${JSON.stringify(value)})` : '(null)'}`);
      });
    } else {
      console.log('No orders found in the table. Creating a dummy order to check schema...');
      
      // Try to create a dummy order
      const { error: insertError } = await supabase
        .from('orders')
        .insert({
          name: 'Test Order',
          email: 'test@example.com',
          phone: '1234567890',
          status: 'pending'
        });
      
      if (insertError) {
        console.error('Error creating dummy order:', insertError);
        console.log('Error details:', insertError.details);
        console.log('Error hint:', insertError.hint);
        
        // Try to get table information directly
        const { data: tableInfo, error: tableError } = await supabase
          .rpc('exec_sql_select', { 
            sql: `
              SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'orders'
              ORDER BY ordinal_position
            `
          });
        
        if (tableError) {
          console.error('Error getting table information:', tableError);
        } else if (tableInfo) {
          console.log('Orders table schema (from information_schema):');
          tableInfo.forEach(col => {
            console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable ? 'nullable' : 'not null'})`);
          });
        }
      }
    }
  } catch (error) {
    console.error('Exception checking orders schema:', error);
  }
}

// Run the function
checkOrdersSchema().catch(console.error); 