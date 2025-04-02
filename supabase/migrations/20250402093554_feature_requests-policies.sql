-- 1. Drop existing policies (safety measure)
DROP POLICY IF EXISTS "Allow public insert access" ON feature_requests;
DROP POLICY IF EXISTS "Allow authenticated users to insert requests" ON feature_requests;
DROP POLICY IF EXISTS "Allow public read access" ON feature_requests;
DROP POLICY IF EXISTS "Allow authenticated users to view all requests" ON feature_requests;
DROP POLICY IF EXISTS "Allow public update access" ON feature_requests; -- Drop update policy too
-- Add more DROP lines here if you created other policies for this table

-- 2. Create the policy to ALLOW anonymous INSERT operations
CREATE POLICY "Allow public insert access"
  ON feature_requests FOR INSERT
  WITH CHECK (true); -- Allows inserts for ANY role, including 'anon'

-- 3. Create the policy to ALLOW anonymous SELECT operations
CREATE POLICY "Allow public read access"
  ON feature_requests FOR SELECT
  USING (true); -- Allows selects for ANY role, including 'anon'

-- 4. Create the policy to ALLOW anonymous UPDATE operations
CREATE POLICY "Allow public update access"
  ON feature_requests FOR UPDATE
  USING (true)        -- Defines which rows can be updated (all in this case)
  WITH CHECK (true);  -- Defines what the updated row must satisfy (anything in this case)

-- 5. Grant base table permissions to the 'anon' role
GRANT SELECT, INSERT, UPDATE ON TABLE feature_requests TO anon; -- Ensure UPDATE is granted

-- 6. Grant base table permissions to the 'authenticated' role (if needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE feature_requests TO authenticated;