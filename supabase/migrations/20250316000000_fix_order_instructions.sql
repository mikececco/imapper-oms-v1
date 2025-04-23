-- Migration: Fix order instructions logic
-- Description: Update the logic for calculating order instructions

-- Commented out: This UPDATE targeted the 'instruction' column which was removed earlier.
/*
-- Update instructions for all orders to match frontend logic
UPDATE orders
SET instruction = CASE 
    WHEN status = 'delivered' AND (shipping_id IS NULL OR shipping_id = '') THEN 'NO ACTION REQUIRED' 
    WHEN status = 'shipped' AND (tracking_number IS NULL OR tracking_number = '') THEN 'PASTE BACK TRACKING LINK'
    WHEN status = 'pending' AND ok_to_ship = false AND paid = true THEN 'ORDER OK BUT NOT SHIPPED'
    WHEN status = 'pending' AND ok_to_ship = true AND paid = true AND (shipping_id IS NULL OR shipping_id = '') THEN 'TO BE SHIPPED BUT NO STICKER'
    ELSE 'ACTION REQUIRED'
  END;
*/

-- Log the completion of the migration
-- ... (Keep DO $$ block with RAISE NOTICE) 