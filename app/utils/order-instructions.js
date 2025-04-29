/**
 * Calculates the shipping instruction for an order based on various conditions
 * 
 * This function implements the following logic:
 * 
 * 1. DELIVERED:
 *    - Delivery status exists
 *    - Payment is successful
 *    - Stripe customer exists
 *    - Delivery status is 'Delivered'
 * 
 * 2. SHIPPED:
 *    - Delivery status exists
 *    - Delivery status is not 'Ready to send'
 *    - Payment is successful
 *    - Stripe customer exists
 *    - Delivery status is not 'Delivered'
 *    - Tracking link is not "Empty label"
 *    - Tracking link exists
 * 
 * 3. PASTE BACK TRACKING LINK:
 *    - Has shipping_id or tracking_number
 *    - No tracking link
 *    - Payment is successful
 *    - Order is ok to ship
 * 
 * 4. TO BE SHIPPED BUT NO STICKER:
 *    - Delivery status is empty
 *    - Payment is successful
 *    - Stripe customer exists
 *    - AND one of these is true:
 *      - Tracking link is "Empty label"
 *      - Tracking link is empty
 *      - Tracking link doesn't start with "https"
 * 
 * 5. TO BE SHIPPED BUT WRONG TRACKING LINK:
 *    - Delivery status is empty
 *    - Payment is successful
 *    - Stripe customer exists
 *    - Tracking link is not "Empty label"
 *    - Tracking link exists
 * 
 * 6. TO SHIP:
 *    - Delivery status is 'Ready to send'
 *    - Payment is successful
 *    - Stripe customer exists
 *    - Tracking link exists
 * 
 * 7. DO NOT SHIP:
 *    - Tracking link is "Empty label"
 *    - Payment is not successful
 *    - Delivery status is empty
 * 
 * 8. ACTION REQUIRED:
 *    - Default value if none of the above conditions are met
 * 
 * 9. EMPTY:
 *    - Tracking link is empty or doesn't exist
 */

/**
 * Helper function to check if a tracking link matches the address country
 * This is kept for future use but not currently used in the instruction calculation
 */
export function checkTrackingLinkMatchesCountry(trackingLink, addressCountry) {
  if (!trackingLink || !addressCountry) return false;
  
  // Normalize country code
  const normalizedAddressCountry = addressCountry.trim().toUpperCase();
  
  // Check for common carriers and their country patterns in tracking links
  
  // DHL pattern (usually contains country code)
  if (trackingLink.includes('dhl')) {
    // DHL tracking numbers for different countries have specific formats
    if (normalizedAddressCountry === 'FR' && trackingLink.includes('dhl.fr')) return true;
    if (normalizedAddressCountry === 'DE' && trackingLink.includes('dhl.de')) return true;
    if (normalizedAddressCountry === 'US' && trackingLink.includes('dhl.com/us')) return true;
    if (normalizedAddressCountry === 'GB' && trackingLink.includes('dhl.co.uk')) return true;
    
    // If no specific match but contains the country code
    return trackingLink.toLowerCase().includes(normalizedAddressCountry.toLowerCase());
  }
  
  // UPS pattern
  if (trackingLink.includes('ups')) {
    // UPS tracking links often contain country info
    if (normalizedAddressCountry === 'FR' && trackingLink.includes('ups.com/fr')) return true;
    if (normalizedAddressCountry === 'DE' && trackingLink.includes('ups.com/de')) return true;
    if (normalizedAddressCountry === 'US' && trackingLink.includes('ups.com/us')) return true;
    if (normalizedAddressCountry === 'GB' && trackingLink.includes('ups.com/gb')) return true;
    
    return trackingLink.toLowerCase().includes(normalizedAddressCountry.toLowerCase());
  }
  
  // FedEx pattern
  if (trackingLink.includes('fedex')) {
    // FedEx tracking links often contain country info
    if (normalizedAddressCountry === 'FR' && trackingLink.includes('fedex.com/fr')) return true;
    if (normalizedAddressCountry === 'DE' && trackingLink.includes('fedex.com/de')) return true;
    if (normalizedAddressCountry === 'US' && trackingLink.includes('fedex.com/us')) return true;
    if (normalizedAddressCountry === 'GB' && trackingLink.includes('fedex.com/gb')) return true;
    
    return trackingLink.toLowerCase().includes(normalizedAddressCountry.toLowerCase());
  }
  
  // USPS (United States Postal Service)
  if (trackingLink.includes('usps') && normalizedAddressCountry === 'US') return true;
  
  // Royal Mail (UK)
  if (trackingLink.includes('royalmail') && normalizedAddressCountry === 'GB') return true;
  
  // La Poste (France)
  if (trackingLink.includes('laposte.fr') && normalizedAddressCountry === 'FR') return true;
  
  // Deutsche Post (Germany)
  if (trackingLink.includes('deutschepost') && normalizedAddressCountry === 'DE') return true;
  
  // Check for country code in the URL
  try {
    const countryCodeInURL = new URL(trackingLink).hostname.split('.').pop();
    if (countryCodeInURL === normalizedAddressCountry.toLowerCase()) return true;
  } catch (error) {
    // If URL parsing fails, just continue
    console.error('Error parsing tracking link URL:', error);
  }
  
  // If we can't determine, default to false
  return false;
}

/**
 * Calculate the shipping instruction based on order data
 * @param {Object} order - The order object
 * @returns {string} - The calculated instruction
 */
export function calculateOrderInstruction(order) {
  // Helper function to check if a string is empty or only whitespace
  const isEmpty = (str) => typeof str !== 'string' || !str || str.trim().length === 0;
  
  // **Priority Check: Manual Instruction**
  // If a manual instruction exists, return it immediately.
  if (order.manual_instruction && order.manual_instruction.trim().length > 0) {
    return order.manual_instruction;
  }
  
  // Extract values from order
  const {
    status,
    paid,
    tracking_link,
    shipping_id,
    tracking_number,
    ok_to_ship,
    order_pack_list_id
  } = order;
  
  // Check conditions for each instruction value
  
  // 1. NO ACTION REQUIRED - if tracking link is present
  if (
    !isEmpty(tracking_link) &&
    paid === true &&
    ok_to_ship === true &&
    status === "pending" && 
    !!order_pack_list_id
  ) {
    return 'NO ACTION REQUIRED';
  }

  // 2. PASTE BACK TRACKING LINK - if has shipping ID or tracking number but no tracking link
  if (
    (!isEmpty(shipping_id) ||
    !isEmpty(tracking_number)) &&
    isEmpty(tracking_link) &&
    paid === true &&
    ok_to_ship === true &&
    !!order_pack_list_id
  ) {
    return 'PASTE BACK TRACKING LINK';
  }
  
  // 3. DELIVERED
  if (
    status !== "pending" &&
    paid === true &&
    (status?.toLowerCase().includes('delivered') || status?.toLowerCase().includes('package delivered') || status?.toLowerCase().includes('shipment collected by customer'))
  ) {
    return 'DELIVERED';
  }
  
  // 4. SHIPPED
  if (
    status !== "pending" &&
    status !== 'Ready to send' &&
    paid === true &&
    !(status?.toLowerCase().includes('delivered') || status?.toLowerCase().includes('package delivered') || status?.toLowerCase().includes('shipment collected by customer')) &&
    !isEmpty(tracking_link)
  ) {
    return 'SHIPPED';
  }
  
  // 5. TO BE SHIPPED BUT NO STICKER
  if (
    status === "pending" &&
    paid === true && 
    ok_to_ship === true &&
    isEmpty(tracking_link) &&
    isEmpty(shipping_id) &&
    isEmpty(tracking_number) &&
    !!order_pack_list_id
  ) {
    return 'TO BE SHIPPED BUT NO STICKER';
  }
  
  // 6. TO SHIP
  if (
    status === 'Ready to send' &&
    paid === true &&
    !isEmpty(tracking_link) && 
    !!order_pack_list_id
  ) {
    return 'TO SHIP';
  }
  
  // 7. DO NOT SHIP
  if (
    !isEmpty(tracking_link) &&
    paid === false &&
    status === "pending"
  ) {
    return 'DO NOT SHIP';
  }
  
  // 8. Default: ACTION REQUIRED
  return 'ACTION REQUIRED';
}

/**
 * Calculate the order status based on tracking information
 * @param {Object} order - The order object
 * @returns {string} - The calculated order status
 */
export function calculateOrderStatus(order) {
  // Helper function to check if a string is empty or only whitespace
  const isEmpty = (str) => typeof str !== 'string' || !str || str.trim().length === 0;
  
  // Extract values from order
  const {
    tracking_link,
    status
  } = order;
  
  // If tracking link is empty, return EMPTY status
  if (isEmpty(tracking_link)) {
    return 'EMPTY';
  }
  
  // If delivery status is available from SendCloud, use it
  if (!status === "pending") {
    return status.toUpperCase();
  }
  
  // Default status when tracking link exists but no delivery status yet
  return 'PENDING';
} 