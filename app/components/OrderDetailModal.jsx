'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { supabase } from '../utils/supabase-client';
import { StatusBadge, PaymentBadge, ShippingToggle, StatusSelector } from './OrderActions';
import OrderDetailForm from './OrderDetailForm';
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

// Provider component for the OrderDetailModal
export function OrderDetailModalProvider({ children }) {
  return (
    <OrderDetailModal>
      {children}
    </OrderDetailModal>
  );
}

export default function OrderDetailModal({ children }) {
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
      
      // Refresh order data to show updated tracking info
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

  // Expose the openModal function to the window object so it can be called from anywhere
  useEffect(() => {
    window.openOrderDetail = openModal;
    return () => {
      delete window.openOrderDetail;
    };
  }, []);

  // Parse shipping address for display
  const parseShippingAddress = (address) => {
    if (!address) return { street: 'N/A', city: 'N/A', postalCode: 'N/A', country: 'N/A' };
    
    const parts = address.split(',').map(part => part.trim());
    return {
      street: parts[0] || 'N/A',
      city: parts[1] || 'N/A',
      postalCode: parts[2] || 'N/A',
      country: parts[3] || 'NL'
    };
  };

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
                  onUpdate={refreshOrder}
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
                      <PaymentBadge paid={order.paid} orderId={order.id} onUpdate={refreshOrder} />
                    </div>
                  </div>
                  
                  <div>
                    {order.tracking_number && (
                      <p className="mb-2">
                        <span className="font-medium">Tracking Number:</span> {order.tracking_number}
                      </p>
                    )}
                    {order.tracking_link && (
                      <p className="mb-2">
                        <span className="font-medium">Tracking Link:</span> 
                        <a 
                          href={order.tracking_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-1"
                        >
                          View Tracking
                        </a>
                      </p>
                    )}
                    {order.label_url && (
                      <p className="mb-2">
                        <span className="font-medium">Shipping Label:</span> 
                        <a 
                          href={order.label_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-1"
                        >
                          View Label
                        </a>
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Create Shipping Label Button */}
                {!order.label_url && (
                  <div className="mt-4">
                    <button
                      onClick={createShippingLabel}
                      disabled={creatingLabel || !order.ok_to_ship || !order.paid || !order.shipping_address_line1}
                      className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
                    >
                      {creatingLabel ? 'Creating Label...' : 'Create Shipping Label'}
                    </button>
                    {!order.ok_to_ship && <p className="text-sm text-red-600 mt-1">Order is not ready to ship</p>}
                    {!order.paid && <p className="text-sm text-red-600 mt-1">Order is not paid</p>}
                    {!order.shipping_address_line1 && <p className="text-sm text-red-600 mt-1">Missing shipping address</p>}
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
                
                {migrationNeeded && (
                  <div className="mt-4 p-2 rounded text-sm bg-yellow-100 text-yellow-800">
                    <p className="text-sm">Some shipping label features may be limited. Please run the shipping label migration script:</p>
                    <pre className="bg-gray-800 text-white p-2 rounded mt-1 overflow-x-auto">
                      node app/utils/run_shipping_label_migration.js
                    </pre>
                  </div>
                )}
              </div>
              
              {/* Stripe Information */}
              {(order.stripe_customer_id || order.stripe_invoice_id || order.stripe_payment_intent_id) && (
                <div className="bg-white p-4 rounded border border-gray-200">
                  <h2 className="text-lg font-semibold mb-4">Stripe Information</h2>
                  {order.stripe_customer_id && (
                    <p className="mb-2">
                      <span className="font-medium">Customer ID:</span> {order.stripe_customer_id}
                    </p>
                  )}
                  {order.stripe_invoice_id && (
                    <p className="mb-2">
                      <span className="font-medium">Invoice ID:</span> {order.stripe_invoice_id}
                    </p>
                  )}
                  {order.stripe_payment_intent_id && (
                    <p className="mb-2">
                      <span className="font-medium">Payment Intent ID:</span> {order.stripe_payment_intent_id}
                    </p>
                  )}
                </div>
              )}
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