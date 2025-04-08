'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from './Providers';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { formatDate } from '../utils/date-utils';
import PaymentBadge from './OrderActions/PaymentBadge';
import ShippingToggle from './OrderActions/ShippingToggle';

export default function LateralOrderModal({ order, isOpen, onClose }) {
  const supabase = useSupabase();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && order) {
      loadOrderDetails();
    }
  }, [isOpen, order]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order.id)
        .single();

      if (error) throw error;
      setOrderDetails(data);
    } catch (error) {
      console.error('Error loading order details:', error);
      setError('Failed to load order details');
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-semibold">Order Details</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 text-center">{error}</div>
            ) : orderDetails ? (
              <div className="space-y-6">
                {/* Order Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Order #{orderDetails.id}</h3>
                    <p className="text-sm text-gray-500">
                      Created: {formatDate(orderDetails.created_at)}
                    </p>
                  </div>
                  {/* <div className="flex items-center gap-4">
                    <PaymentBadge isPaid={orderDetails.is_paid} orderId={orderDetails.id} />
                    <ShippingToggle okToShip={orderDetails.ok_to_ship} orderId={orderDetails.id} />
                  </div> */}
                </div>

                {/* Customer Information */}
                <div>
                  <h4 className="font-medium mb-2">Customer Information</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p><strong>Name:</strong> {orderDetails.name || 'N/A'}</p>
                    <p><strong>Email:</strong> {orderDetails.email || 'N/A'}</p>
                    <p><strong>Phone:</strong> {orderDetails.phone || 'N/A'}</p>
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <h4 className="font-medium mb-2">Shipping Address</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p><strong>Address Line 1:</strong> {orderDetails.shipping_address_line1 || 'N/A'}</p>
                    <p><strong>Address Line 2:</strong> {orderDetails.shipping_address_line2 || ' '}</p>
                    <p><strong>Postal Code:</strong> {orderDetails.shipping_postal_code || ' '}</p>
                    <p><strong>City:</strong> {orderDetails.shipping_address_city || 'N/A'}</p>
                    <p><strong>Country:</strong> {orderDetails.shipping_address_country || 'N/A'}</p>
                  </div>
                </div>

                {/* Order Details */}
                <div>
                  <h4 className="font-medium mb-2">Order Details</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p><strong>Order Pack:</strong> {orderDetails.order_pack || 'N/A'}</p>
                    <p><strong>Status:</strong> {orderDetails.status || 'N/A'}</p>
                    {orderDetails.tracking_number && (
                      <p>
                        <strong>Tracking Number:</strong>{' '}
                        <a
                          href={orderDetails.tracking_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {orderDetails.tracking_number}
                        </a>
                      </p>
                    )}
                  </div>
                </div>

                {/* Return Information */}
                {orderDetails.return_label_url && (
                  <div>
                    <h4 className="font-medium mb-2">Return Information</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p>
                        <strong>Return Label:</strong>{' '}
                        <a
                          href={orderDetails.return_label_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Label
                        </a>
                      </p>
                      {orderDetails.return_tracking_number && (
                        <p>
                          <strong>Return Tracking:</strong>{' '}
                          <a
                            href={orderDetails.return_tracking_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {orderDetails.return_tracking_number}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t">
            <Button onClick={onClose} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 