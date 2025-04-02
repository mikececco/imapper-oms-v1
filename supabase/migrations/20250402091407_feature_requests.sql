-- Create the feature_requests table
CREATE TABLE feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  description text NOT NULL,
  author text NOT NULL,
  status text DEFAULT 'Requested' NOT NULL
);

-- Add comments to the table and columns for clarity
COMMENT ON TABLE feature_requests IS 'Stores feature requests submitted by users.';
COMMENT ON COLUMN feature_requests.id IS 'Unique identifier for the feature request.';
COMMENT ON COLUMN feature_requests.created_at IS 'Timestamp when the request was created.';
COMMENT ON COLUMN feature_requests.description IS 'Detailed description of the feature request.';
COMMENT ON COLUMN feature_requests.author IS 'Name or identifier of the user who submitted the request.';
COMMENT ON COLUMN feature_requests.status IS 'Current status of the feature request (e.g., Requested, In Progress, Done).';

-- Enable Row Level Security (Recommended for security)
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

-- Grant permissions for the table to the authenticated role
-- Adjust roles (e.g., 'anon', 'service_role') and permissions as needed
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE feature_requests TO authenticated;
-- Removed the GRANT on the non-existent sequence

-- Create basic Row Level Security policies
-- Policy: Allow logged-in users to view all requests
CREATE POLICY "Allow authenticated users to view all requests"
  ON feature_requests FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Allow logged-in users to insert their own requests
CREATE POLICY "Allow authenticated users to insert requests"
  ON feature_requests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Example Policy: Allow users to update their own requests (if needed later, requires a user_id column)
-- ALTER TABLE feature_requests ADD COLUMN user_id uuid REFERENCES auth.users(id);
-- CREATE POLICY "Allow users to update their own requests"
--   ON feature_requests FOR UPDATE
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);

-- Example Policy: Allow users to delete their own requests (if needed later, requires a user_id column)
-- CREATE POLICY "Allow users to delete their own requests"
--   ON feature_requests FOR DELETE
--   USING (auth.uid() = user_id);