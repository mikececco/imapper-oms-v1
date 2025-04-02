-- Drop the old policy if it exists (replace name if you used a different one)
DROP POLICY IF EXISTS "Allow authenticated users to insert requests" ON feature_requests;

-- Create a new policy allowing public insert access
CREATE POLICY "Allow public insert access"
  ON feature_requests FOR INSERT
  WITH CHECK (true); -- Allows inserts for any role, including anon