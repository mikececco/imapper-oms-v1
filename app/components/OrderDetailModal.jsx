'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { supabase } from '../utils/supabase-client';
import { StatusBadge, PaymentBadge, ShippingToggle, StatusSelector } from './OrderActions';
import OrderDetailForm from './OrderDetailForm';
import PaymentStatusEditor from './PaymentStatusEditor';
import { ORDER_PACK_OPTIONS } from '../utils/constants';
import { normalizeCountryToCode, getCountryDisplayName } from '../utils/country-utils';

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
  
  // Get normalized country display only on client-side
  let countryDisplay = '';
  if (isMounted) {
    if (order.shipping_address_country) {
      const countryCode = normalizeCountryToCode(order.shipping_address_country);
      countryDisplay = getCountryDisplayName(countryCode);
    } else if (order.shipping_address && order.shipping_address.includes(',')) {
      const parts = order.shipping_address.split(',').map(part => part.trim());
      if (parts.length >= 4) {
        const countryCode = normalizeCountryToCode(parts[3]);
        countryDisplay = getCountryDisplayName(countryCode);
      }
    }
  }
  
  // Check if we have individual address components
  if (order.shipping_address_line1 || order.shipping_address_city || order.shipping_address_postal_code || order.shipping_address_country) {
    const addressParts = [
      order.shipping_address_line1,
      order.shipping_address_line2,
      order.shipping_address_city,
      order.shipping_address_postal_code,
      isMounted ? (countryDisplay || order.shipping_address_country) : order.shipping_address_country
    ].filter(Boolean);
    
    return addressParts.join(', ') || 'N/A';
  }
  
  // Fallback to legacy shipping_address field if it exists
  if (order.shipping_address) {
    if (isMounted) {
      // Parse the shipping address
      const parts = order.shipping_address.split(',').map(part => part.trim());
      const parsedAddress = {
        street: parts[0] || 'N/A',
        city: parts[1] || 'N/A',
        postalCode: parts[2] || 'N/A',
        country: countryDisplay || parts[3] || 'N/A'
      };
      
      return `${parsedAddress.street}, ${parsedAddress.city}, ${parsedAddress.postalCode}, ${parsedAddress.country}`;
    } else {
      return order.shipping_address;
    }
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
      
      if (data.warning) {
        setLabelMessage({
          type: 'warning',
          text: data.message || 'Shipping label created with warnings. Some features may be limited.'
        });
      } else {
        setLabelMessage({
          type: 'success',
          text: `Shipping label created successfully! SendCloud Parcel ID: ${data.shipping_id || 'N/A'}`
        });
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setLabelMessage(null);
        }, 5000);
      }
      
      // Refresh the order to show the updated tracking information
      refreshOrder();
      
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
                <OrderDetailForm 
                  order={order} 
                  orderPackOptions={ORDER_PACK_OPTIONS}
                  onUpdate={handleOrderUpdate}
                />
              </div>
              
              {/* Order Status and Actions */}
              <div className="bg-white p-4 rounded border border-gray-200">
                <h2 className="text-lg font-semibold mb-4">Order Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="mb-2"><span className="font-medium">Created:</span> {formatDate(order.created_at)}</p>
                    <p className="mb-2"><span className="font-medium">Updated:</span> {formatDate(order.updated_at)}</p>
                    <div className="flex items-center mt-2">
                      <span className="font-medium text-base mr-2">Payment Status:</span>
                      <PaymentStatusEditor 
                        orderId={order.id} 
                        currentStatus={order.paid} 
                        onUpdate={handleOrderUpdate} 
                      />
                    </div>
                    <div className="flex items-center mt-2">
                      <span className="font-medium mr-2">Ok to Ship:</span>
                      <ShippingToggle 
                        okToShip={order.ok_to_ship} 
                        orderId={order.id}
                        onUpdate={handleOrderUpdate}
                      />
                    </div>
                    <div className="mt-2">
                      <span className="font-medium block mb-1">Shipping Address:</span>
                      <div className="break-words bg-gray-50 p-2 rounded text-sm max-w-full overflow-hidden">
                        <p className="text-sm text-gray-600">
                          {formatCombinedAddress(order, isMounted)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    {/* Tracking number is now editable in the form, so we don't need to display it here */}
                    {order.label_url && (
                      <div className="mb-2">
                        <span className="font-medium">Shipping Label:</span> 
                        <a 
                          href={order.label_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-1"
                        >
                          View Label
                        </a>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Delivery Status:</span>
                        <div className={`order-status ${(order.delivery_status || 'empty').toLowerCase().replace(/\s+/g, '-')} px-2 py-1 rounded text-sm`}>
                          {order.delivery_status || 'EMPTY'}
                        </div>
                      </div>
                      
                      {order.tracking_number && (
                        <button
                          onClick={updateDeliveryStatus}
                          className="mt-2 w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Update Status from SendCloud
                        </button>
                      )}
                    </div>
                    
                    {order.weight && (
                      <div className="mt-4">
                        <span className="font-medium">Package Weight:</span> {order.weight} kg
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Create Shipping Label Button */}
                {!order.label_url && !order.shipping_id && (
                  <div className="mt-6 w-full">
                    <button
                      onClick={createShippingLabel}
                      disabled={creatingLabel || !order.shipping_address_line1 || !order.order_pack}
                      className="w-full px-4 py-3 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingLabel ? 'Creating Label...' : 'Create Shipping Label'}
                    </button>
                    {!order.shipping_address_line1 && <p className="text-sm text-red-600 mt-1">Missing shipping address</p>}
                    {!order.order_pack && <p className="text-sm text-red-600 mt-1">Order pack is required</p>}
                    {!order.paid && <p className="text-sm text-yellow-600 mt-1">Note: Order is not marked as paid</p>}
                    
                    {labelMessage && (
                      <div className={`mt-3 p-3 rounded-md text-center ${
                        labelMessage.type === 'success' 
                          ? 'bg-green-100 text-green-800' 
                          : labelMessage.type === 'warning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {labelMessage.text}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Message when shipping_id exists but no label_url */}
                {!order.label_url && order.shipping_id && (
                  <div className="mt-4">
                    <div className="p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
                      A shipping label has already been created (Parcel ID: {order.shipping_id}), but the label URL is missing. 
                      Please check SendCloud for the label.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 text-center">
              No order selected
            </div>
          )}
          
          {/* Line Items Section */}
          {order.line_items && (
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
                        const lineItems = JSON.parse(order.line_items);
                        return lineItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{item.amount.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{(item.amount * item.quantity).toFixed(2)}</td>
                          </tr>
                        ));
                      } catch (error) {
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
                            const lineItems = JSON.parse(order.line_items);
                            return `€${lineItems.reduce((sum, item) => sum + (item.amount * item.quantity), 0).toFixed(2)}`;
                          } catch (error) {
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