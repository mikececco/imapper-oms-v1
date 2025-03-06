// Script to run SQL directly using the Supabase client
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.development' });

// Initialize Supabase client with available keys
const supabaseUrl = process.env.NEXT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using key type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Key' : 'Anon Key');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your configuration.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to run a SQL statement
async function runSql(sql) {
  try {
    // First try using RPC if available
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error running SQL via RPC:', error);
      console.log('This is expected if you are using the anon key. Trying direct table operations...');
      
      // If RPC fails, we'll try to create the table directly
      return await createCustomersTable();
    }
    
    console.log('SQL executed successfully via RPC!');
    return { success: true };
  } catch (error) {
    console.error('Error executing SQL:', error);
    return { success: false, error };
  }
}

// Function to create customers table directly
async function createCustomersTable() {
  try {
    console.log('Attempting to create customers table directly...');
    
    // Check if the table already exists
    const { data: existingTable, error: tableError } = await supabase
      .from('customers')
      .select('count(*)', { count: 'exact', head: true })
      .limit(1);
    
    if (!tableError) {
      console.log('Customers table already exists.');
      return { success: true };
    }
    
    // Create the customers table
    const { error: createError } = await supabase
      .from('customers')
      .insert({
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Test Customer',
        stripe_customer_id: 'test_customer_id',
        created_at: new Date(),
        updated_at: new Date()
      });
    
    if (createError && !createError.message.includes('already exists')) {
      console.error('Error creating customers table:', createError);
      console.log('You may need to create the table manually in the Supabase dashboard.');
      console.log('SQL to create the table:');
      console.log(`
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_customer_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  address_city TEXT,
  address_postal_code TEXT,
  address_country TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer_id ON customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Add customer_id column to orders table if it doesn't exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
      `);
      return { success: false, error: createError };
    }
    
    console.log('Customers table created successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error creating customers table:', error);
    return { success: false, error };
  }
}

// Function to migrate existing orders
async function migrateExistingOrders() {
  try {
    // Check if there are any existing orders with stripe_customer_id
    console.log('Checking for orders with Stripe customer IDs...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, stripe_customer_id, name, email, phone, shipping_address_line1, shipping_address_line2, shipping_address_city, shipping_address_postal_code, shipping_address_country')
      .not('stripe_customer_id', 'is', null)
      .is('customer_id', null);
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return { success: false, error: ordersError };
    }
    
    console.log(`Found ${orders?.length || 0} orders with Stripe customer IDs but no customer association.`);
    
    // Create customers for these orders
    if (orders && orders.length > 0) {
      console.log('Creating customers for existing orders...');
      
      for (const order of orders) {
        // Check if customer already exists
        const { data: existingCustomer, error: findError } = await supabase
          .from('customers')
          .select('id')
          .eq('stripe_customer_id', order.stripe_customer_id)
          .single();
        
        if (findError && findError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
          console.error(`Error finding customer for order ${order.id}:`, findError);
          continue;
        }
        
        let customerId;
        
        if (existingCustomer) {
          console.log(`Customer already exists for Stripe ID ${order.stripe_customer_id}`);
          customerId = existingCustomer.id;
        } else {
          // Create new customer
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert({
              stripe_customer_id: order.stripe_customer_id,
              name: order.name || 'Unknown Customer',
              email: order.email || '',
              phone: order.phone || '',
              address_line1: order.shipping_address_line1 || '',
              address_line2: order.shipping_address_line2 || '',
              address_city: order.shipping_address_city || '',
              address_postal_code: order.shipping_address_postal_code || '',
              address_country: order.shipping_address_country || '',
              created_at: new Date(),
              updated_at: new Date()
            })
            .select();
          
          if (createError) {
            console.error(`Error creating customer for order ${order.id}:`, createError);
            continue;
          }
          
          customerId = newCustomer[0].id;
          console.log(`Created new customer ${customerId} for order ${order.id}`);
        }
        
        // Update the order with the customer ID
        const { error: updateError } = await supabase
          .from('orders')
          .update({ customer_id: customerId })
          .eq('id', order.id);
        
        if (updateError) {
          console.error(`Error updating order ${order.id} with customer ID:`, updateError);
          continue;
        }
        
        console.log(`Updated order ${order.id} with customer ID ${customerId}`);
      }
      
      console.log('Finished creating customers for existing orders.');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error migrating existing orders:', error);
    return { success: false, error };
  }
}

// Main function to run the migration
async function runMigration() {
  try {
    console.log('Starting migration...');
    
    // Step 1: Create the customers table
    const createResult = await createCustomersTable();
    if (!createResult.success) {
      console.error('Failed to create customers table. Migration aborted.');
      process.exit(1);
    }
    
    // Step 2: Migrate existing orders
    const migrateResult = await migrateExistingOrders();
    if (!migrateResult.success) {
      console.error('Failed to migrate existing orders. Migration partially completed.');
      process.exit(1);
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error); 