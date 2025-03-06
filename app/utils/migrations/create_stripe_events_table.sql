-- Create the stripe_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS stripe_events (
  id SERIAL PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create an index on the event_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(event_id);

-- Create an index on the processed flag for faster filtering
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON stripe_events(processed);

-- Create an index on the event_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_type ON stripe_events(event_type); 