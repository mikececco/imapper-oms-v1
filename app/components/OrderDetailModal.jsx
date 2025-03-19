'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { supabase } from '../utils/supabase-client';
import { StatusBadge, PaymentBadge, ShippingToggle, StatusSelector } from './OrderActions';
import OrderDetailForm from './OrderDetailForm';
import PaymentStatusEditor from './PaymentStatusEditor';
import { ORDER_PACK_OPTIONS } from '../utils/constants';
import { normalizeCountryToCode, getCountryDisplayName, COUNTRY_MAPPING } from '../utils/country-utils';
import OrderActivityLog from './OrderActivityLog';
import { useSupabase } from './Providers';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { TableCell } from './ui/table';
import { calculateOrderInstruction } from '../utils/order-instructions';
import { toast } from 'react-hot-toast';

// Create context for the OrderDetailModal
export const OrderDetailModalContext = createContext({
  openModal: () => {},
});

// Hook to use the OrderDetailModal context
export function useOrderDetailModal() {
  const context = useContext(OrderDetailModalContext);
  if (!context) {
    throw new Error('useOrderDetailModal must be used within an OrderDetailModalProvider');
  }
  return context;
}

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
const formatCombinedAddress = (order, isMounted = false) => {
  if (!order) return 'N/A';
  
  // Check if we have individual address components
  if (order.shipping_address_line1 || order.shipping_address_city || order.shipping_address_postal_code || order.shipping_address_country) {
    const addressParts = [
      order.shipping_address_line1,
      order.shipping_address_line2,
      order.shipping_address_city,
      order.shipping_address_postal_code,
      order.shipping_address_country // Use raw value from database
    ].filter(Boolean);
    
    const formattedAddress = addressParts.join(', ') || 'N/A';
    
    // Add warning if country code is not valid (only on client side)
    if (isMounted && order.shipping_address_country) {
      const upperCountry = order.shipping_address_country.trim().toUpperCase();
      if (!COUNTRY_MAPPING[upperCountry]) {
        return (
          <div>
            <div>{formattedAddress}</div>
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              Warning: Country value "{order.shipping_address_country}" is not a valid country code. 
              It should be a 2-letter code like: FR, GB, US, DE, NL
            </div>
          </div>
        );
      }
    }
    
    return formattedAddress;
  }
  
  // Fallback to legacy shipping_address field if it exists
  if (order.shipping_address) {
    // Parse the shipping address
    const parts = order.shipping_address.split(',').map(part => part.trim());
    const parsedAddress = {
      street: parts[0] || 'N/A',
      city: parts[1] || 'N/A',
      postalCode: parts[2] || 'N/A',
      country: parts[3] || 'N/A'
    };
    
    const formattedAddress = `${parsedAddress.street}, ${parsedAddress.city}, ${parsedAddress.postalCode}, ${parsedAddress.country}`;
    
    // Add warning if country code is not valid (only on client side)
    if (isMounted && parsedAddress.country) {
      const upperCountry = parsedAddress.country.trim().toUpperCase();
      if (!COUNTRY_MAPPING[upperCountry]) {
        return (
          <div>
            <div>{formattedAddress}</div>
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              Warning: Country value "{parsedAddress.country}" is not a valid country code. 
              It should be a 2-letter code like: FR, GB, US, DE, NL
            </div>
          </div>
        );
      }
    }
    
    return formattedAddress;
  }
  
  return 'N/A';
};

// Provider component for the OrderDetailModal
export function OrderDetailModalProvider({ children }) {
  return (
    <OrderDetailModal>
      {children}
    </OrderDetailModal>
  );
}

export default function OrderDetailModal({ children }) {
  const router = useRouter();
  const supabase = useSupabase();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [labelMessage, setLabelMessage] = useState(null);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const openModal = (orderId) => {
    setSelectedOrderId(orderId);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setTimeout(() => {
      setSelectedOrderId(null);
      setOrder(null);
      setLabelMessage(null);
    }, 300); // Wait for the animation to complete
  };

  const fetchOrder = useCallback(async () => {
    if (!selectedOrderId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', selectedOrderId)
        .single();
      
      if (error) throw error;
      
      setOrder(data);
      
      // Check if migration is needed
      setMigrationNeeded(!data.label_url && !data.tracking_number && !data.tracking_link);
      
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to load order details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedOrderId]);

  useEffect(() => {
    if (isOpen && selectedOrderId) {
      fetchOrder();
    }
  }, [isOpen, selectedOrderId, fetchOrder]);

  const refreshOrder = () => {
    fetchOrder();
  };

  // Handle order updates from child components
  const handleOrderUpdate = (updatedOrderData) => {
    if (!order) return;
    
    // Update the local order state with the new data
    setOrder(prevOrder => ({
      ...prevOrder,
      ...updatedOrderData,
      updated_at: new Date().toISOString()
    }));
    
    // Update the router cache without navigating
    router.refresh();
  };

  // Function to create a shipping label
  const createShippingLabel = async () => {
    if (!order || !order.id) return;
    
    setCreatingLabel(true);
    setLabelMessage(null);
    
    try {
      const response = await fetch('/api/orders/create-shipping-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: order.id }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create shipping label');
      }
      
      // Create activity log entry for shipping label creation
      const { error: activityError } = await supabase
        .from('order_activities')
        .insert([
          {
            order_id: order.id,
            action_type: 'shipping_label_created',
            changes: {
              shipping_id: data.shipping_id,
              tracking_number: data.tracking_number,
              label_url: data.label_url
            },
            created_at: new Date().toISOString()
          }
        ]);

      if (activityError) {
        console.error('Error creating activity log:', activityError);
      }
      
      // Update the local order state with the new data
      setOrder(prevOrder => ({
        ...prevOrder,
        ...data,
        updated_at: new Date().toISOString()
      }));
      
      // Show success message
      setLabelMessage({
        type: 'success',
        text: 'Shipping label created successfully!'
      });
      
      // Update the router cache without navigating
      router.refresh();
    } catch (error) {
      console.error('Error creating shipping label:', error);
      setLabelMessage({
        type: 'error',
        text: error.message || 'Failed to create shipping label'
      });
    } finally {
      setCreatingLabel(false);
    }
  };

  // Function to update delivery status
  const updateDeliveryStatus = async () => {
    if (!order || !order.id) return;
    
    try {
      const response = await fetch(`/api/orders/update-delivery-status?orderId=${order.id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update delivery status');
      }
      
      // Refresh the order to show the updated status
      refreshOrder();
      
    } catch (error) {
      console.error('Error updating delivery status:', error);
    }
  };

  // Expose the openModal function to the window object so it can be called from anywhere
  useEffect(() => {
    window.openOrderDetail = openModal;
    return () => {
      delete window.openOrderDetail;
    };
  }, []);

  // Add useEffect to set isMounted after client-side rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Order Details {order?.id && `(${order.id})`}
            </DialogTitle>
          </DialogHeader>
          
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-100 text-red-800 rounded">
              {error}
            </div>
          ) : order ? (
            <div className="space-y-6">
              {/* Edit Order Form */}
              <div className="bg-white p-4 rounded border border-gray-200">
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
                      <a 
                        href={`/customers/${order.customer_id}`}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                      >
                        View Customer
                      </a>
                    )}
                  </div>
                </div>
                <OrderDetailForm 
                  order={order} 
                  orderPackOptions={ORDER_PACK_OPTIONS}
                  onUpdate={handleOrderUpdate}
                  calculatedInstruction={calculateOrderInstruction(order)}
                />
              </div>
              
              {/* Order Status and Actions */}
              <div className="bg-white p-4 rounded border border-gray-200">
                <h2 className="text-lg font-semibold mb-4">Order Status</h2>
                <div className="status-section">
                  {/* Created & Updated Timestamps */}
                  <div className="status-row">
                    <span className="status-label">Created</span>
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                  <div className="status-row">
                    <span className="status-label">Updated</span>
                    <span>{formatDate(order.updated_at)}</span>
                  </div>

                  {/* Payment Status */}
                  <div className="status-row">
                    <span className="status-label">Payment Status</span>
                    <PaymentStatusEditor 
                      orderId={order.id} 
                      currentStatus={order.paid} 
                      onUpdate={handleOrderUpdate} 
                    />
                  </div>

                  {/* OK TO SHIP Status */}
                  <div className="status-row">
                    <span className="status-label">OK TO SHIP</span>
                    <ShippingToggle 
                      okToShip={order.ok_to_ship} 
                      orderId={order.id}
                      onUpdate={handleOrderUpdate}
                    />
                  </div>

                  {/* Weight */}
                  {order.weight && (
                    <div className="status-row">
                      <span className="status-label">Order Pack Weight</span>
                      <span>{order.weight} kg</span>
                    </div>
                  )}

                  {/* Shipping Address */}
                  <div className="status-row">
                    <span className="status-label">Shipping Address</span>
                    <div className="text-right text-sm text-gray-600">
                      {formatCombinedAddress(order, isMounted)}
                    </div>
                  </div>

                  {/* Shipping Label Status */}
                  <div className="status-row flex-col items-stretch">
                    <div className="w-full space-y-2">
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

                                  // Update local state
                                  setOrder(prev => ({
                                    ...prev,
                                    shipping_id: null,
                                    tracking_number: null,
                                    tracking_link: null,
                                    label_url: null,
                                    status: 'pending',
                                    updated_at: new Date().toISOString()
                                  }));

                                  // Show success message
                                  toast.success('Shipping label removed successfully');

                                  // Refresh order details
                                  refreshOrder();
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
                        onClick={() => createShippingLabel()}
                        className={`w-full px-4 py-3 text-base rounded font-medium flex items-center justify-center ${
                          order.ok_to_ship && order.paid && order.shipping_address_line1 && order.shipping_address_house_number && order.shipping_address_city && order.shipping_address_postal_code && order.shipping_address_country && order.order_pack && order.name && order.email && order.phone
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={!order.ok_to_ship || !order.paid || !order.shipping_address_line1 || !order.shipping_address_house_number || !order.shipping_address_city || !order.shipping_address_postal_code || !order.shipping_address_country || !order.order_pack || !order.name || !order.email || !order.phone || creatingLabel}
                      >
                        {creatingLabel ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Creating Label...
                          </>
                        ) : (
                          'Create Shipping Label'
                        )}
                      </button>
                      {/* Display SendCloud error message */}
                      {labelMessage && labelMessage.type === 'error' && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start">
                            <svg className="h-5 w-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-red-800">SendCloud Error</h3>
                              <div className="mt-1 text-sm text-red-700">
                                {labelMessage.text}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Display warning message */}
                      {labelMessage && labelMessage.type === 'warning' && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start">
                            <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                              <div className="mt-1 text-sm text-yellow-700">
                                {labelMessage.text}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Display success message */}
                      {labelMessage && labelMessage.type === 'success' && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-start">
                            <svg className="h-5 w-5 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-green-800">Success</h3>
                              <div className="mt-1 text-sm text-green-700">
                                {labelMessage.text}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {(!order.ok_to_ship || !order.paid || !order.shipping_address_line1 || !order.shipping_address_house_number || !order.shipping_address_city || !order.shipping_address_postal_code || !order.shipping_address_country || !order.order_pack || !order.name || !order.email || !order.phone) && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h4 className="text-sm font-semibold text-yellow-800 mb-2">Missing Required Fields</h4>
                          <div className="space-y-2">
                            {/* Customer Information */}
                            {(!order.name || !order.email || !order.phone) && (
                              <div className="border-b border-yellow-200 pb-2">
                                <p className="text-xs font-medium text-yellow-800 mb-1">Customer Information:</p>
                                <div className="space-y-1">
                                  {!order.name && <p className="text-sm text-red-600">❌ Name is required</p>}
                                  {order.name && order.name.length > 35 && (
                                    <p className="text-sm text-amber-600">⚠️ Name exceeds 35 characters and will be truncated ({order.name.length} chars)</p>
                                  )}
                                  {!order.email && <p className="text-sm text-red-600">❌ Email is required</p>}
                                  {!order.phone && <p className="text-sm text-red-600">❌ Phone is required</p>}
                                </div>
                              </div>
                            )}

                            {/* Shipping Address */}
                            {(!order.shipping_address_line1 || !order.shipping_address_house_number || !order.shipping_address_city || !order.shipping_address_postal_code || !order.shipping_address_country) && (
                              <div className="border-b border-yellow-200 pb-2">
                                <p className="text-xs font-medium text-yellow-800 mb-1">Shipping Address:</p>
                                <div className="space-y-1">
                                  {!order.shipping_address_line1 && <p className="text-sm text-red-600">❌ Address Line 1 is required</p>}
                                  {!order.shipping_address_house_number && <p className="text-sm text-red-600">❌ House Number is required</p>}
                                  {!order.shipping_address_city && <p className="text-sm text-red-600">❌ City is required</p>}
                                  {!order.shipping_address_postal_code && <p className="text-sm text-red-600">❌ Postal Code is required</p>}
                                  {!order.shipping_address_country && <p className="text-sm text-red-600">❌ Country Code is required</p>}
                                </div>
                              </div>
                            )}

                            {/* Order Details */}
                            {(!order.order_pack || !order.ok_to_ship || !order.paid) && (
                              <div>
                                <p className="text-xs font-medium text-yellow-800 mb-1">Order Details:</p>
                                <div className="space-y-1">
                                  {!order.order_pack && <p className="text-sm text-red-600">❌ Order Pack is required</p>}
                                  {!order.ok_to_ship && <p className="text-sm text-red-600">❌ Order must be marked as OK TO SHIP</p>}
                                  {!order.paid && <p className="text-sm text-red-600">❌ Payment is required</p>}
                                </div>
                              </div>
                            )}
                          </div>
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
                      {order.shipping_id && !order.label_url && (
                        <div className="w-full text-center py-2">
                          <span className="text-yellow-500 text-base">Pending</span>
                          <p className="text-sm text-gray-500 mt-1">
                            Label created (ID: {order.shipping_id.substring(0, 8)}...) but URL not available
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center">
              No order selected
            </div>
          )}
          
          {/* Line Items Section */}
          {order && order.line_items && (
            <div className="bg-white p-4 rounded border border-gray-200 mt-4">
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
          <div className="bg-white p-4 rounded border border-gray-200 mt-6">
            <h2 className="text-lg font-semibold mb-4">Activity Log</h2>
            {order?.id ? (
              <OrderActivityLog orderId={order.id} />
            ) : (
              <div className="text-gray-500 text-center py-4">
                No activities available
              </div>
            )}
          </div>
          
          <DialogFooter className="w-full">
            <button 
              onClick={closeModal}
              className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* This component is meant to be used with a context provider */}
      {typeof window !== 'undefined' && (
        <OrderDetailModalContext.Provider value={{ openModal }}>
          {children}
        </OrderDetailModalContext.Provider>
      )}
    </>
  );
} 