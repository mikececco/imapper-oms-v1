'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { supabase } from '../utils/supabase-client';
import { StatusBadge, PaymentBadge, ShippingToggle, StatusSelector } from './OrderActions';
import OrderDetailForm from './OrderDetailForm';
import PaymentStatusEditor from './PaymentStatusEditor';
import { ORDER_PACK_OPTIONS } from '../utils/constants';

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
          text: 'Shipping label created successfully!'
        });
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
                      <span className="font-medium mr-2">Payment Status:</span>
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
                        {formatCombinedAddress(order)}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    {order.tracking_number && (
                      <div className="mb-2">
                        <span className="font-medium">Tracking Number:</span> {order.tracking_number}
                      </div>
                    )}
                    {order.tracking_link && (
                      <div className="mb-2">
                        <span className="font-medium">Tracking Link:</span> 
                        <a 
                          href={order.tracking_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-1"
                        >
                          View Tracking
                        </a>
                      </div>
                    )}
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
                    {order.shipping_method && (
                      <div className="mb-2">
                        <span className="font-medium">Shipping Method:</span> 
                        <span className="capitalize ml-1">
                          {order.shipping_method}
                        </span>
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
                          className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
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
                {!order.label_url && (
                  <div className="mt-4">
                    <button
                      onClick={createShippingLabel}
                      disabled={creatingLabel || !order.shipping_address_line1}
                      className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
                    >
                      {creatingLabel ? 'Creating Label...' : 'Create Shipping Label'}
                    </button>
                    {!order.shipping_address_line1 && <p className="text-sm text-red-600 mt-1">Missing shipping address</p>}
                    {!order.paid && <p className="text-sm text-yellow-600 mt-1">Note: Order is not marked as paid</p>}
                  </div>
                )}
                
                {labelMessage && (
                  <div 
                    className={`mt-4 p-2 rounded text-sm ${
                      labelMessage.type === 'success' 
                        ? 'bg-green-100 text-green-800' 
                        : labelMessage.type === 'warning'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {labelMessage.text}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 text-center">
              No order selected
            </div>
          )}
          
          <DialogFooter>
            <button 
              onClick={closeModal}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
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