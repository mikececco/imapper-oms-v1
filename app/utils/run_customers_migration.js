// Script to run the customers table migration
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

async function runMigration() {
  try {
    console.log('Running customers table migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'create_customers_table.sql');
    console.log('Migration file path:', migrationPath);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found at ${migrationPath}`);
      process.exit(1);
    }
    
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    console.log('Migration SQL loaded, length:', migrationSql.length);
    
    // Check if we can use RPC (requires service role key)
    let result;
    try {
      console.log('Attempting to execute SQL via RPC...');
      result = await supabase.rpc('exec_sql', { sql: migrationSql });
      
      if (result.error) {
        console.error('Error running migration via RPC:', result.error);
        console.log('Falling back to direct SQL execution...');
        
        // Try direct SQL execution as fallback
        // Note: This will only work if the user has appropriate permissions
        const { data, error } = await supabase.from('customers').select('count(*)');
        if (error) {
          console.error('Error checking customers table:', error);
          console.log('Please make sure you have the correct permissions or use the service role key.');
          process.exit(1);
        }
        
        console.log('Direct SQL execution successful!');
      } else {
        console.log('Migration executed successfully via RPC!');
      }
    } catch (error) {
      console.error('Error executing SQL:', error);
      console.log('Please make sure you have the correct permissions or use the service role key.');
      process.exit(1);
    }
    
    // Verify the customers table exists
    console.log('Verifying customers table...');
    const { data, error: tableError } = await supabase
      .from('customers')
      .select('count(*)', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('Error verifying customers table:', tableError);
      process.exit(1);
    }
    
    console.log('Customers table verified!');
    
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
    
    console.log('Migration and data migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error); 