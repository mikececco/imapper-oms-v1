-- Update instructions for all orders to match frontend logic
UPDATE orders
SET instruction = CASE
    WHEN status = 'delivered' AND paid = TRUE AND stripe_customer_id IS NOT NULL THEN 'DELIVERED'
    WHEN status = 'shipped' AND paid = TRUE AND stripe_customer_id IS NOT NULL AND tracking_link IS NOT NULL THEN 'SHIPPED'
    WHEN status = 'pending' AND paid = TRUE AND stripe_customer_id IS NOT NULL AND (tracking_link IS NULL OR tracking_link = 'Empty label') THEN 'TO BE SHIPPED BUT NO STICKER'
    WHEN status = 'pending' AND paid = TRUE AND stripe_customer_id IS NOT NULL AND tracking_link IS NOT NULL THEN 'TO BE SHIPPED BUT WRONG TRACKING LINK'
    WHEN status = 'ready_to_ship' AND paid = TRUE AND stripe_customer_id IS NOT NULL AND tracking_link IS NOT NULL THEN 'TO SHIP'
    WHEN tracking_link = 'Empty label' AND paid = FALSE AND status = 'pending' THEN 'DO NOT SHIP'
    WHEN tracking_link IS NOT NULL AND paid = TRUE AND stripe_customer_id IS NOT NULL AND shipping_id IS NOT NULL AND status != 'delivered' THEN 'NO ACTION REQUIRED'
    ELSE 'ACTION REQUIRED'
END,
updated_at = NOW(); 