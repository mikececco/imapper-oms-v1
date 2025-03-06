// Script to create customers table using available permissions
const { createClient } = require('@supabase/supabase-js');
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

async function createCustomersTable() {
  try {
    console.log('Checking if customers table exists...');
    
    // Try to query the customers table to see if it exists
    const { data: existingTable, error: tableError } = await supabase
      .from('customers')
      .select('count(*)', { count: 'exact', head: true })
      .limit(1);
    
    // If we get a specific error about the relation not existing, we need to create the table
    const needToCreateTable = tableError && tableError.message && 
      (tableError.message.includes('relation "customers" does not exist') || 
       tableError.message.includes('relation "public.customers" does not exist'));
    
    if (needToCreateTable) {
      console.log('Customers table does not exist. Creating table...');
      
      // Create the customers table
      const { error: createError } = await supabase.rpc('create_customers_table');
      
      if (createError) {
        console.error('Error creating customers table via RPC:', createError);
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
CREATE INDEX idx_customers_stripe_customer_id ON customers(stripe_customer_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_created_at ON customers(created_at);

-- Add customer_id column to orders table if it doesn't exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
        `);
        process.exit(1);
      }
      
      console.log('Customers table created successfully!');
    } else if (tableError) {
      console.error('Error checking customers table:', tableError);
      process.exit(1);
    } else {
      console.log('Customers table already exists.');
    }
    
    // Check if there are any existing orders with stripe_customer_id
    console.log('Checking for orders with Stripe customer IDs...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, stripe_customer_id, name, email, phone, shipping_address_line1, shipping_address_line2, shipping_address_city, shipping_address_postal_code, shipping_address_country')
      .not('stripe_customer_id', 'is', null)
      .is('customer_id', null);
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      process.exit(1);
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
    
    console.log('Customer setup completed successfully!');
  } catch (error) {
    console.error('Error setting up customers:', error);
    process.exit(1);
  }
}

// Run the script
createCustomersTable().catch(console.error); 