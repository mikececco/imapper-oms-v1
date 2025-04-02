ALTER TABLE feature_requests
ADD COLUMN link_url text NULL;

-- Add comments for the new columns
COMMENT ON COLUMN feature_requests.link_url IS 'URL of an optional external resource or link related to the request.';

-- Ensure anon role has permission to insert/update/select these new columns if needed
-- (Granting on the table level usually suffices, but explicit grants can be added if specific column permissions are used)
-- Example: GRANT SELECT (image_url, link_url), INSERT (image_url, link_url), UPDATE (image_url, link_url) ON TABLE feature_requests TO anon;
-- Note: The previous GRANTs on the table level might already cover this.