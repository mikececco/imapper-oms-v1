-- Create a function to update the order instruction
CREATE OR REPLACE FUNCTION public.update_order_instruction(order_id INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_data RECORD;
  calculated_instruction TEXT;
BEGIN
  -- Get the order data
  SELECT * INTO order_data FROM orders WHERE id = order_id;
  
  -- Calculate the instruction based on the order data
  -- This is a simplified version of the JavaScript calculateOrderInstruction function
  
  -- Helper function to check if a string is empty
  IF order_data.delivery_status IS NOT NULL AND order_data.delivery_status = 'Delivered' AND 
     order_data.paid = TRUE AND order_data.stripe_customer_id IS NOT NULL THEN
    calculated_instruction := 'DELIVERED';
  ELSIF order_data.delivery_status IS NOT NULL AND order_data.delivery_status != 'Ready to send' AND
        order_data.paid = TRUE AND order_data.stripe_customer_id IS NOT NULL AND
        order_data.delivery_status != 'Delivered' AND order_data.tracking_link != 'Empty label' AND
        order_data.tracking_link IS NOT NULL THEN
    calculated_instruction := 'SHIPPED';
  ELSIF order_data.delivery_status IS NULL AND order_data.paid = TRUE AND
        order_data.stripe_customer_id IS NOT NULL AND
        (order_data.tracking_link = 'Empty label' OR order_data.tracking_link IS NULL OR
         NOT order_data.tracking_link LIKE 'https%') THEN
    calculated_instruction := 'TO BE SHIPPED BUT NO STICKER';
  ELSIF order_data.delivery_status IS NULL AND order_data.paid = TRUE AND
        order_data.stripe_customer_id IS NOT NULL AND order_data.tracking_link != 'Empty label' AND
        order_data.tracking_link IS NOT NULL THEN
    calculated_instruction := 'TO BE SHIPPED BUT WRONG TRACKING LINK';
  ELSIF order_data.delivery_status = 'Ready to send' AND order_data.paid = TRUE AND
        order_data.stripe_customer_id IS NOT NULL AND order_data.tracking_link IS NOT NULL THEN
    calculated_instruction := 'TO SHIP';
  ELSIF order_data.tracking_link = 'Empty label' AND order_data.paid = FALSE AND
        order_data.delivery_status IS NULL THEN
    calculated_instruction := 'DO NOT SHIP';
  ELSE
    calculated_instruction := 'ACTION REQUIRED';
  END IF;
  
  -- Update the order with the calculated instruction
  UPDATE orders
  SET instruction = calculated_instruction,
      updated_at = NOW()
  WHERE id = order_id;
END;
$$;