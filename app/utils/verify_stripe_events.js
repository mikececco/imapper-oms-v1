// Utility script to verify Stripe events are being stored in the database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.development' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your configuration.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyStripeEvents() {
  try {
    console.log('Checking Stripe events table...');
    
    // Check if the stripe_events table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('stripe_events')
      .select('count(*)', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('Error checking stripe_events table:', tableError);
      console.log('The stripe_events table may not exist. Please run the database migrations.');
      return;
    }
    
    // Get the total count of events
    const { count, error: countError } = await supabase
      .from('stripe_events')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting Stripe events:', countError);
      return;
    }
    
    console.log(`Found ${count} Stripe events in the database.`);
    
    // Get the most recent events
    const { data: recentEvents, error: recentError } = await supabase
      .from('stripe_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentError) {
      console.error('Error fetching recent Stripe events:', recentError);
      return;
    }
    
    if (recentEvents.length === 0) {
      console.log('No Stripe events found in the database.');
      return;
    }
    
    console.log('\nMost recent Stripe events:');
    recentEvents.forEach(event => {
      console.log(`- Event ID: ${event.event_id}`);
      console.log(`  Type: ${event.event_type}`);
      console.log(`  Created: ${new Date(event.created_at).toLocaleString()}`);
      console.log(`  Processed: ${event.processed ? 'Yes' : 'No'}`);
      if (event.processed && event.processed_at) {
        console.log(`  Processed at: ${new Date(event.processed_at).toLocaleString()}`);
      }
      console.log('');
    });
    
    // Check for unprocessed events
    const { data: unprocessedEvents, error: unprocessedError } = await supabase
      .from('stripe_events')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: false });
    
    if (unprocessedError) {
      console.error('Error fetching unprocessed Stripe events:', unprocessedError);
      return;
    }
    
    if (unprocessedEvents.length > 0) {
      console.log(`\nFound ${unprocessedEvents.length} unprocessed Stripe events:`);
      unprocessedEvents.forEach(event => {
        console.log(`- Event ID: ${event.event_id}`);
        console.log(`  Type: ${event.event_type}`);
        console.log(`  Created: ${new Date(event.created_at).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('\nAll Stripe events have been processed.');
    }
    
    // Check for events by type
    const eventTypes = {};
    const { data: allEvents, error: allError } = await supabase
      .from('stripe_events')
      .select('event_type');
    
    if (allError) {
      console.error('Error fetching all Stripe events:', allError);
      return;
    }
    
    allEvents.forEach(event => {
      eventTypes[event.event_type] = (eventTypes[event.event_type] || 0) + 1;
    });
    
    console.log('\nEvent types summary:');
    Object.entries(eventTypes).forEach(([type, count]) => {
      console.log(`- ${type}: ${count} events`);
    });
    
    console.log('\nVerification complete!');
  } catch (error) {
    console.error('Error verifying Stripe events:', error);
  }
}

// Run the verification
verifyStripeEvents().catch(console.error); 