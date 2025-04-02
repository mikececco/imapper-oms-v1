    -- Replace "Policy Name" with the actual name of ANY insert policy you might have
    -- E.g., "Allow authenticated users to insert requests", "Allow public insert access", etc.
    DROP POLICY IF EXISTS "Allow public insert access" ON feature_requests;
    DROP POLICY IF EXISTS "Allow authenticated users to insert requests" ON feature_requests;
    -- Add more DROP POLICY lines if you created others