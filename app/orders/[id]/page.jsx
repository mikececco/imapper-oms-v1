'use client';

import Link from "next/link";
import { supabase } from "../../utils/supabase";
import { StatusBadge, PaymentBadge, ShippingToggle, StatusSelector } from "../../components/OrderActions";
import OrderDetailForm from "../../components/OrderDetailForm";
import { ORDER_PACK_OPTIONS } from "../../utils/constants";
import { normalizeCountryToCode, getCountryDisplayName, COUNTRY_MAPPING } from '../../utils/country-utils';
import OrderActivityLog from "../../components/OrderActivityLog";
import { calculateOrderInstruction } from "../../utils/order-instructions";

const EU_COUNTRIES = [
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'
];

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(',', '');
  } catch (e) {
    return 'Invalid date';
  }
};

// Format address for display
const formatCombinedAddress = (order) => {
  if (!order) return 'N/A';
  
  // Check if we have individual address components
  if (order.shipping_address_line1 || order.shipping_address_city || order.shipping_address_postal_code || order.shipping_address_country) {
    const addressParts = [
      order.shipping_address_line1,
      order.shipping_address_line2,
      order.shipping_address_city,
      order.shipping_address_postal_code,
      order.shipping_address_country
    ].filter(Boolean);
    
    return addressParts.join(', ') || 'N/A';
  }
  
  // Fallback to legacy shipping_address field if it exists
  if (order.shipping_address) {
    return order.shipping_address;
  }
  
  return 'N/A';
};

export default async function OrderDetail({ params }) {
  const { id } = params;
  
  // Fetch order details
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error("Error fetching order:", error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-gray-600 mb-4">The order you're looking for doesn't exist or you don't have permission to view it.</p>
          <Link href="/orders" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  // Calculate order instruction
  const calculatedInstruction = calculateOrderInstruction(order);

  // Helper to check if customs info is required and complete
  const isNonEU = order.shipping_address_country && !EU_COUNTRIES.includes(order.shipping_address_country.toUpperCase());
  const requiresCustoms = isNonEU;
  // Use the same logic as OrderDetailForm for customs completeness
  const customsComplete = (
    (order.customs_shipment_type !== undefined && order.customs_shipment_type !== null && order.customs_shipment_type !== '') || order.customs_shipment_type === 0
  ) &&
    typeof order.customs_invoice_nr === 'string' && order.customs_invoice_nr.trim() !== '' &&
    !!order.eori && typeof order.eori === 'string' && order.eori.trim() !== '' &&
    Array.isArray(order.customs_parcel_items) && order.customs_parcel_items.length > 0;
  const eoriMissing = requiresCustoms && (!order.eori || typeof order.eori !== 'string' || order.eori.trim() === '');
  const canCreateShippingLabel =
    order.ok_to_ship && order.paid && order.shipping_address_line1 && order.shipping_address_house_number && order.shipping_address_city && order.shipping_address_postal_code && order.shipping_address_country && order.order_pack_list_id && order.name && order.email && order.phone &&
    (!requiresCustoms || customsComplete) && !eoriMissing;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Order Details</h1>
            <p className="text-gray-600">Order ID: {order.id}</p>
          </div>
          <Link href="/orders" className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
            Back to Orders
          </Link>
        </div>

        {/* Edit Order Form */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Edit Order</h2>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-black">Customer Information</h3>
            <div className="flex gap-2">
              {order.stripe_customer_id && (
                <a 
                  href={`https://dashboard.stripe.com/customers/${order.stripe_customer_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-violet-600 text-white rounded hover:bg-violet-700 text-sm font-medium"
                >
                  Stripe
                </a>
              )}
              {order.customer_id && (
                <Link 
                  href={`/customers/${order.customer_id}`}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                >
                  View Customer
                </Link>
              )}
            </div>
          </div>
          <OrderDetailForm 
            order={order} 
            orderPackOptions={ORDER_PACK_OPTIONS}
            calculatedInstruction={calculatedInstruction}
          />

          {/* Debug: Print all checks for enabling the button in the order details form */}
          <div className="mt-2 text-xs text-gray-500">
            <div>ok_to_ship: {String(order.ok_to_ship)}</div>
            <div>paid: {String(order.paid)}</div>
            <div>shipping_address_line1: {String(!!order.shipping_address_line1)}</div>
            <div>shipping_address_house_number: {String(!!order.shipping_address_house_number)}</div>
            <div>shipping_address_city: {String(!!order.shipping_address_city)}</div>
            <div>shipping_address_postal_code: {String(!!order.shipping_address_postal_code)}</div>
            <div>shipping_address_country: {String(!!order.shipping_address_country)}</div>
            <div>order_pack_list_id: {String(!!order.order_pack_list_id)}</div>
            <div>name: {String(!!order.name)}</div>
            <div>email: {String(!!order.email)}</div>
            <div>phone: {String(!!order.phone)}</div>
            <div>requiresCustoms: {String(requiresCustoms)}</div>
            <div>customsComplete: {String(customsComplete)}</div>
            <div>eoriMissing: {String(eoriMissing)}</div>
            <div>canCreateShippingLabel: {String(canCreateShippingLabel)}</div>
          </div>
        </div>

        {/* Order Status and Actions */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Order Status</h2>
          <div className="space-y-4">
            {/* Created & Updated Timestamps */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600">Created</span>
                <div className="font-medium">{formatDate(order.created_at)}</div>
              </div>
              <div>
                <span className="text-gray-600">Updated</span>
                <div className="font-medium">{formatDate(order.updated_at)}</div>
              </div>
            </div>

            {/* Payment Status */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Payment Status</span>
              <PaymentBadge isPaid={order.paid} orderId={order.id} />
            </div>

            {/* OK TO SHIP Status */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">OK TO SHIP</span>
              <ShippingToggle okToShip={order.ok_to_ship} orderId={order.id} />
            </div>

            {/* Weight */}
            {order.weight && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Order Pack Weight</span>
                <span className="font-medium">{order.weight} kg</span>
              </div>
            )}

            {/* Shipping Address */}
            <div>
              <span className="text-gray-600 block mb-1">Shipping Address</span>
              <div className="text-right text-sm text-gray-600">
                {formatCombinedAddress(order)}
              </div>
            </div>

            {/* Shipping Label Status */}
            <div className="space-y-2">
              {order.shipping_id && (
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mb-4">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-600">SendCloud Parcel ID:</span>
                    <span className="ml-2 font-mono">{order.shipping_id}</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to remove this shipping label? This action cannot be undone.')) {
                        try {
                          const response = await fetch('/api/orders/remove-shipping-id', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ orderId: order.id }),
                          });

                          if (!response.ok) {
                            throw new Error('Failed to remove shipping ID');
                          }

                          // Show success message and refresh the page
                          toast.success('Shipping label removed successfully');
                          router.refresh();
                        } catch (error) {
                          console.error('Error removing shipping ID:', error);
                          toast.error('Failed to remove shipping label');
                        }
                      }
                    }}
                    className="flex items-center gap-2 ml-4 px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-md transition-colors"
                    title="Remove shipping label"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              )}

              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/orders/create-shipping-label', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ orderId: order.id }),
                    });
                    
                    if (!response.ok) {
                      throw new Error('Failed to create shipping label');
                    }

                    // Show success message and refresh the page
                    toast.success('Shipping label created successfully');
                    router.refresh();
                  } catch (error) {
                    console.error('Error creating shipping label:', error);
                    toast.error('Failed to create shipping label');
                  }
                }}
                className={`w-full px-4 py-3 text-base rounded font-medium flex items-center justify-center ${
                  canCreateShippingLabel
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!canCreateShippingLabel}
              >
                Create Shipping Label
              </button>

              {eoriMissing && (
                <div className="mt-2 text-sm text-red-500">
                  EORI number is required for shipments to non-EU countries (e.g., GB, CH, US, etc.). Please provide a valid EORI in the customs section.
                </div>
              )}

              {requiresCustoms && !customsComplete && (
                <div className="mt-2 text-sm text-red-500">
                  Customs information is required and incomplete for this destination. Please fill in all customs fields (type, invoice nr, EORI, and at least one parcel item).
                </div>
              )}

              {(!order.ok_to_ship || !order.paid || !order.shipping_address_line1 || !order.shipping_address_house_number || !order.shipping_address_city || !order.shipping_address_postal_code || !order.shipping_address_country || !order.order_pack_list_id || !order.name || !order.email || !order.phone) && (
                <div className="mt-2 text-sm space-y-1">
                  <p className="text-gray-600 font-medium mb-2">Required fields (*)</p>
                  {!order.name && <p className="text-red-500">❌ Name* is required</p>}
                  {!order.email && <p className="text-red-500">❌ Email* is required</p>}
                  {!order.phone && <p className="text-red-500">❌ Phone* is required</p>}
                  {!order.shipping_address_line1 && <p className="text-red-500">❌ Address Line 1* is required</p>}
                  {!order.shipping_address_city && <p className="text-red-500">❌ City* is required</p>}
                  {!order.shipping_address_postal_code && <p className="text-red-500">❌ Postal Code* is required</p>}
                  {!order.shipping_address_country && <p className="text-red-500">❌ Country Code* is required</p>}
                  {!order.order_pack_list_id && <p className="text-red-500">❌ Order Pack* is required</p>}
                  {!order.ok_to_ship && <p className="text-red-500">❌ Order must be marked as OK TO SHIP</p>}
                  {!order.paid && <p className="text-red-500">❌ Payment is required</p>}
                  {order.name && order.name.length > 35 && (
                    <p className="text-amber-500">⚠️ Name exceeds 35 characters and will be truncated ({order.name.length} chars)</p>
                  )}
                </div>
              )}

              {order.label_url && (
                <a 
                  href={order.label_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-base text-center block"
                >
                  View Label
                </a>
              )}
            </div>
          </div>

          {/* Update Status Button */}
          {order.tracking_number && (
            <button
              onClick={async () => {
                try {
                  const response = await fetch(`/api/orders/update-delivery-status?orderId=${order.id}`);
                  if (!response.ok) {
                    throw new Error('Failed to update delivery status');
                  }
                  // Show success message and refresh the page
                  toast.success('Delivery status updated successfully');
                  router.refresh();
                } catch (error) {
                  console.error('Error updating delivery status:', error);
                  toast.error('Failed to update delivery status');
                }
              }}
              className="mt-4 w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Update Status from SendCloud
            </button>
          )}
        </div>

        {/* Line Items Section */}
        {order.line_items && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Invoice Line Items</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    try {
                      const lineItems = typeof order.line_items === 'string' 
                        ? JSON.parse(order.line_items) 
                        : (Array.isArray(order.line_items) ? order.line_items : []);
                        
                      return lineItems.length > 0 ? lineItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{(item.amount || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity || 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{((item.amount || 0) * (item.quantity || 1)).toFixed(2)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                            No line items available
                          </td>
                        </tr>
                      );
                    } catch (error) {
                      console.error('Error parsing line items:', error, order.line_items);
                      return (
                        <tr>
                          <td colSpan="4" className="px-6 py-4 text-center text-sm text-red-500">
                            Error parsing line items: {error.message}
                          </td>
                        </tr>
                      );
                    }
                  })()}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="3" className="px-6 py-3 text-right text-sm font-medium text-gray-500">Total</td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {(() => {
                        try {
                          const lineItems = typeof order.line_items === 'string' 
                            ? JSON.parse(order.line_items) 
                            : (Array.isArray(order.line_items) ? order.line_items : []);
                            
                          return `€${lineItems.reduce((sum, item) => sum + ((item.amount || 0) * (item.quantity || 1)), 0).toFixed(2)}`;
                        } catch (error) {
                          console.error('Error calculating total:', error);
                          return 'Error calculating total';
                        }
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Order Activity Log */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Activity Log</h2>
          <OrderActivityLog orderId={order.id} />
        </div>
      </div>
    </div>
  );
} 