-- Enable RLS on shipping_methods table
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users and anon
CREATE POLICY "Enable all access to shipping_methods"
  ON shipping_methods
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON shipping_methods TO anon;
GRANT ALL ON shipping_methods TO authenticated; 