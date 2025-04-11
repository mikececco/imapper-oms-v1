'use client';

// Helper function to format address for table display
export const formatAddressForTable = (order, isMounted = false) => {
  if (!isMounted || !order) return 'Loading...'; // Return loading if not mounted or no order

  let addressParts = [];
  
  // Handle object-based address first
  if (order.shipping_address && typeof order.shipping_address === 'object') {
    const addr = order.shipping_address;
    if (addr.line1) addressParts.push(addr.line1);
    if (addr.line2) addressParts.push(addr.line2);
    if (addr.house_number) addressParts.push(addr.house_number);
    if (addr.city) addressParts.push(addr.city);
    if (addr.postal_code) addressParts.push(addr.postal_code);
    if (addr.country) addressParts.push(addr.country);
  } 
  // Fallback to individual fields if object doesn't exist or is incomplete
  else {
    if (order.shipping_address_line1) addressParts.push(order.shipping_address_line1);
    if (order.shipping_address_line2) addressParts.push(order.shipping_address_line2);
    if (order.shipping_address_house_number) addressParts.push(order.shipping_address_house_number);
    if (order.shipping_address_city) addressParts.push(order.shipping_address_city);
    if (order.shipping_address_postal_code) addressParts.push(order.shipping_address_postal_code);
    if (order.shipping_address_country) addressParts.push(order.shipping_address_country);
  }

  const formattedAddress = addressParts.filter(Boolean).join(', ');

  return formattedAddress || 'N/A';
};

// Add other formatting functions here as needed 