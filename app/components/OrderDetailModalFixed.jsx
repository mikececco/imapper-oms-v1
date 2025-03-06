"use client"

import { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from './ui/dialog';
import { VisuallyHidden } from './ui/visually-hidden';
import { StatusBadge, PaymentBadge, ShippingToggle, StatusSelector } from "./OrderActions";
import OrderDetailForm from "./OrderDetailForm";
import { ORDER_PACK_OPTIONS } from "../utils/constants";
import { supabase } from "../utils/supabase-client";

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

export default function OrderDetailModalFixed() {
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
        
      if (error) {
        throw error;
      }
      
      setOrder(data);
      
      // Check if migration is needed
      if (data && (
        typeof data.tracking_number === 'undefined' || 
        typeof data.label_url === 'undefined'
      )) {
        setMigrationNeeded(true);
      } else {
        setMigrationNeeded(false);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Could not load order details. Please try again.');
      setLoading(false);
    }
  }, [selectedOrderId]);

  useEffect(() => {
    if (isOpen && selectedOrderId) {
      fetchOrder();
    }
  }, [isOpen, selectedOrderId, fetchOrder]);

  // Function to refresh order data after actions
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
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) closeModal();
    }}>
      <DialogContent className="max-w-3xl overflow-y-auto">
        {/* Always include a DialogTitle for accessibility */}
        <DialogHeader>
          {loading ? (
            <DialogTitle>Loading Order Details</DialogTitle>
          ) : error ? (
            <DialogTitle>Error Loading Order</DialogTitle>
          ) : !order ? (
            <DialogTitle>Order Not Found</DialogTitle>
          ) : (
            <DialogTitle className="text-xl">Order Details</DialogTitle>
          )}
          {order && <p className="text-sm text-black">Order ID: {order.id}</p>}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
          </div>
        ) : error ? (
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold text-black">Error</h3>
            <p className="mt-2 text-black">{error}</p>
            <button 
              onClick={closeModal}
              className="mt-4 px-4 py-2 bg-black text-white rounded hover:opacity-90"
            >
              Close
            </button>
          </div>
        ) : order ? (
          <>
            {migrationNeeded && (
              <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-yellow-800">
                <p className="font-medium">Database Migration Required</p>
                <p className="text-sm">Some shipping label features may be limited. Please run the shipping label migration script:</p>
                <code className="block mt-1 p-2 bg-gray-100 text-xs overflow-x-auto">
                  node app/utils/run_shipping_label_migration.js
                </code>
              </div>
            )}
            
            <div className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-black">{order.name || 'N/A'}</h2>
                <div className="flex space-x-2">
                  <StatusBadge status={order.status || 'pending'} />
                  <PaymentBadge 
                    isPaid={order.paid} 
                    orderId={order.id} 
                    onUpdate={refreshOrder}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded border border-black">
                    <h3 className="font-medium mb-2 text-black">Customer Information</h3>
                    <p className="text-black"><span className="font-medium">Email:</span> {order.email || 'N/A'}</p>
                    <p className="text-black"><span className="font-medium">Phone:</span> {order.phone || 'N/A'}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded border border-black">
                    <h3 className="font-medium mb-2 text-black">Shipping Information</h3>
                    {order.shipping_address ? (
                      <>
                        {/* Parse and display formatted address */}
                        {(() => {
                          const address = parseShippingAddress(order.shipping_address);
                          return (
                            <div className="space-y-1">
                              <p className="text-black"><span className="font-medium">Street:</span> {address.street}</p>
                              <p className="text-black"><span className="font-medium">City:</span> {address.city}</p>
                              <p className="text-black"><span className="font-medium">Postal Code:</span> {address.postalCode}</p>
                              <p className="text-black"><span className="font-medium">Country:</span> {address.country}</p>
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <p className="text-black">No shipping address provided</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded border border-black">
                    <h3 className="font-medium mb-2 text-black">Order Information</h3>
                    <p className="text-black"><span className="font-medium">Created:</span> {formatDate(order.created_at)}</p>
                    <p className="text-black"><span className="font-medium">Updated:</span> {formatDate(order.updated_at)}</p>
                    <div className="flex items-center mt-2">
                      <span className="font-medium mr-2 text-black">Status:</span>
                      <StatusSelector 
                        currentStatus={order.status || 'pending'} 
                        orderId={order.id}
                        onUpdate={refreshOrder}
                      />
                    </div>
                    <div className="flex items-center mt-2">
                      <span className="font-medium mr-2 text-black">Shipping:</span>
                      <ShippingToggle 
                        okToShip={order.ok_to_ship} 
                        orderId={order.id}
                        onUpdate={refreshOrder}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded border border-black">
                    <h3 className="font-medium mb-2 text-black">Delivery Information</h3>
                    {order.shipping_instruction && (
                      <div className="mb-2">
                        <span className="font-medium text-black">Shipping Instruction: </span>
                        <div className={`shipping-instruction ${order.shipping_instruction?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                          {order.shipping_instruction || 'UNKNOWN'}
                        </div>
                      </div>
                    )}
                    <p className="text-black mt-2"><span className="font-medium">Delivery Status:</span> {order.delivery_status || 'Not tracked'}</p>
                    
                    {/* Tracking information - only show if available */}
                    {order.tracking_number && (
                      <p className="text-black mt-2">
                        <span className="font-medium">Tracking Number:</span> {order.tracking_number}
                      </p>
                    )}
                    {order.tracking_link && (
                      <p className="text-black mt-2">
                        <span className="font-medium">Tracking Link:</span>{' '}
                        <a href={order.tracking_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {order.tracking_link}
                        </a>
                      </p>
                    )}
                    
                    {/* Shipping label - only show if available */}
                    {order.label_url && (
                      <p className="text-black mt-2">
                        <span className="font-medium">Shipping Label:</span>{' '}
                        <a href={order.label_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          View Label
                        </a>
                      </p>
                    )}
                    
                    {order.last_delivery_status_check && (
                      <p className="text-black mt-2"><span className="font-medium">Last Status Check:</span> {formatDate(order.last_delivery_status_check)}</p>
                    )}
                    
                    {/* Action buttons */}
                    <div className="flex space-x-2 mt-3">
                      <button 
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/orders/update-delivery-status?orderId=${order.id}`);
                            if (response.ok) {
                              refreshOrder();
                            }
                          } catch (error) {
                            console.error('Error updating delivery status:', error);
                          }
                        }}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                      >
                        Update Status
                      </button>
                      
                      {/* Create shipping label button */}
                      {!order.label_url && (
                        <button 
                          onClick={createShippingLabel}
                          disabled={creatingLabel || !order.shipping_address}
                          className={`px-3 py-1 text-white text-sm rounded ${
                            creatingLabel || !order.shipping_address 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-green-500 hover:bg-green-600'
                          }`}
                        >
                          {creatingLabel ? 'Creating...' : 'Create Shipping Label'}
                        </button>
                      )}
                    </div>
                    
                    {/* Label creation message */}
                    {labelMessage && (
                      <div className={`mt-2 p-2 rounded text-sm ${
                        labelMessage.type === 'success' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {labelMessage.text}
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 p-4 rounded border border-black">
                    <h3 className="font-medium mb-2 text-black">Package Information</h3>
                    <OrderDetailForm 
                      order={order} 
                      orderPackOptions={ORDER_PACK_OPTIONS}
                      onUpdate={refreshOrder}
                    />
                  </div>
                </div>
              </div>

              {order.order_notes && (
                <div className="mt-4 bg-gray-50 p-4 rounded border border-black">
                  <h3 className="font-medium mb-2 text-black">Notes</h3>
                  <p className="text-black">{order.order_notes}</p>
                </div>
              )}

              {order.stripe_customer_id && (
                <div className="mt-4 bg-gray-50 p-4 rounded border border-black">
                  <h3 className="font-medium mb-2 text-black">Stripe Information</h3>
                  <p className="text-black"><span className="font-medium">Customer ID:</span> {order.stripe_customer_id}</p>
                  {order.stripe_invoice_id && <p className="text-black"><span className="font-medium">Invoice ID:</span> {order.stripe_invoice_id}</p>}
                  {order.stripe_payment_intent_id && <p className="text-black"><span className="font-medium">Payment Intent ID:</span> {order.stripe_payment_intent_id}</p>}
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <button 
                onClick={closeModal}
                className="px-4 py-2 bg-black text-white rounded hover:opacity-90"
              >
                Close
              </button>
            </DialogFooter>
          </>
        ) : (
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold text-black">Order Not Found</h3>
            <p className="mt-2 text-black">The order you're looking for doesn't exist or you don't have permission to view it.</p>
            <button 
              onClick={closeModal}
              className="mt-4 px-4 py-2 bg-black text-white rounded hover:opacity-90"
            >
              Close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 