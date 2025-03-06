"use client"

import { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from './ui/dialog';
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

export default function OrderDetailModal({ isOpen, onClose, orderId }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
        
      if (error) {
        throw error;
      }
      
      setOrder(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Could not load order details. Please try again.');
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrder();
    }
  }, [isOpen, orderId, fetchOrder]);

  // Function to refresh order data after actions
  const refreshOrder = () => {
    fetchOrder();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
          </div>
        ) : error ? (
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold text-black">Error</h3>
            <p className="mt-2 text-black">{error}</p>
            <button 
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-black text-white rounded hover:opacity-90"
            >
              Close
            </button>
          </div>
        ) : order ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Order Details</DialogTitle>
              <p className="text-sm text-black">Order ID: {order.id}</p>
            </DialogHeader>

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
                    <p className="text-black"><span className="font-medium">Address:</span> {order.shipping_address_line1 || 'N/A'}</p>
                    {order.shipping_address_line2 && <p className="text-black">{order.shipping_address_line2}</p>}
                    <p className="text-black">{order.shipping_address_city || 'N/A'}, {order.shipping_address_postal_code || 'N/A'}</p>
                    <p className="text-black">{order.shipping_address_country || 'N/A'}</p>
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
                    <h3 className="font-medium mb-2 text-black">Package Information</h3>
                    <OrderDetailForm 
                      order={order} 
                      orderPackOptions={ORDER_PACK_OPTIONS}
                      onUpdate={refreshOrder}
                    />
                  </div>
                </div>
              </div>

              {order.instruction && (
                <div className="mt-4 bg-gray-50 p-4 rounded border border-black">
                  <h3 className="font-medium mb-2 text-black">Instructions</h3>
                  <p className="text-black">{order.instruction}</p>
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
                onClick={onClose}
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
              onClick={onClose}
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