-- Create stripe_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create index on event_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(event_id);

-- Create index on event_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_type ON stripe_events(event_type);

-- Create index on processed for faster filtering
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON stripe_events(processed);

-- Create index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at ON stripe_events(created_at); 