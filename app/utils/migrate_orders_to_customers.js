// Script to migrate existing orders to customers
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.development' });

// Initialize Supabase client with available keys
const supabaseUrl = process.env.NEXT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using Anon Key for migration');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your configuration.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateOrdersToCustomers() {
  try {
    console.log('Starting migration of orders to customers...');
    
    // Verify the customers table exists
    console.log('Verifying customers table...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('customers')
      .select('count(*)', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('Error verifying customers table:', tableError);
      console.log('Please make sure the customers table exists before running this script.');
      console.log('You can create it by running the SQL in app/utils/migrations/customers_table_manual.sql');
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
      let successCount = 0;
      let errorCount = 0;
      
      for (const order of orders) {
        try {
          // Check if customer already exists
          const { data: existingCustomer, error: findError } = await supabase
            .from('customers')
            .select('id')
            .eq('stripe_customer_id', order.stripe_customer_id)
            .single();
          
          if (findError && findError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
            console.error(`Error finding customer for order ${order.id}:`, findError);
            errorCount++;
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
              errorCount++;
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
            errorCount++;
            continue;
          }
          
          console.log(`Updated order ${order.id} with customer ID ${customerId}`);
          successCount++;
        } catch (error) {
          console.error(`Unexpected error processing order ${order.id}:`, error);
          errorCount++;
        }
      }
      
      console.log(`Finished creating customers for existing orders. Success: ${successCount}, Errors: ${errorCount}`);
    } else {
      console.log('No orders found that need customer association.');
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateOrdersToCustomers().catch(console.error); 