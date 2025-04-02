-- 1. Drop existing policies (safety measure, replace names if needed)
DROP POLICY IF EXISTS "Allow public insert access" ON feature_requests;
DROP POLICY IF EXISTS "Allow authenticated users to insert requests" ON feature_requests;
DROP POLICY IF EXISTS "Allow public read access" ON feature_requests;
DROP POLICY IF EXISTS "Allow authenticated users to view all requests" ON feature_requests;
-- Add more DROP lines here if you created other policies for this table

-- 2. Create the policy to ALLOW anonymous INSERT operations
CREATE POLICY "Allow public insert access"
  ON feature_requests FOR INSERT
  WITH CHECK (true); -- Allows inserts for ANY role, including 'anon'

-- 3. Create the policy to ALLOW anonymous SELECT operations
CREATE POLICY "Allow public read access"
  ON feature_requests FOR SELECT
  USING (true); -- Allows selects for ANY role, including 'anon'

-- 4. Grant base table permissions to the 'anon' role (best practice)
GRANT SELECT, INSERT ON TABLE feature_requests TO anon;

-- 5. Grant base table permissions to the 'authenticated' role (if needed for other operations)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE feature_requests TO authenticated;