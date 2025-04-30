'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from './Providers';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { formatDate } from '../utils/date-utils';

export default function LateralOrderModal({ order, isOpen, onClose }) {
  const supabase = useSupabase();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && order) {
      loadOrderDetails();
    }
    if (!isOpen) {
        setOrderDetails(null);
        setLoading(true);
        setError(null);
    }
  }, [isOpen, order]);

  const loadOrderDetails = async () => {
    if (!supabase || !order?.id) return;
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          name,
          email,
          phone,
          shipping_address_line1,
          shipping_address_line2,
          shipping_address_city,
          shipping_address_postal_code,
          shipping_address_country,
          status,
          tracking_number,
          tracking_link,
          sendcloud_return_id,
          sendcloud_return_parcel_id
        `)
        .eq('id', order.id)
        .single();

      if (fetchError) throw fetchError;
      setOrderDetails(data);
    } catch (err) {
      console.error('Error loading order details:', err);
      setError('Failed to load order details');
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const orderPackName = 'N/A';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl transform transition-transform duration-300 ease-in-out" 
           role="dialog"
           aria-modal="true"
           aria-labelledby="order-details-title">
        <div className="h-full flex flex-col">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 id="order-details-title" className="text-xl font-semibold">Order Details</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close order details"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center items-center h-full" aria-live="polite">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
              </div>
            ) : error ? (
              <div className="text-red-600 bg-red-100 border border-red-400 rounded p-4 text-center" role="alert">
                {error}
              </div>
            ) : orderDetails ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Order #{orderDetails.id}</h3>
                    <p className="text-sm text-gray-500">
                      Created: {formatDate(orderDetails.created_at)}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 text-gray-700">Customer Information</h4>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p><strong>Name:</strong> {orderDetails.name || 'N/A'}</p>
                    <p><strong>Email:</strong> {orderDetails.email || 'N/A'}</p>
                    <p><strong>Phone:</strong> {orderDetails.phone || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 text-gray-700">Shipping Address</h4>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p><strong>Address Line 1:</strong> {orderDetails.shipping_address_line1 || 'N/A'}</p>
                    <p><strong>Address Line 2:</strong> {orderDetails.shipping_address_line2 || '-'}</p>
                    <p><strong>Postal Code:</strong> {orderDetails.shipping_address_postal_code || '-'}</p>
                    <p><strong>City:</strong> {orderDetails.shipping_address_city || 'N/A'}</p>
                    <p><strong>Country:</strong> {orderDetails.shipping_address_country || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 text-gray-700">Order Details</h4>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p><strong>Order Pack:</strong> {orderPackName}</p>
                    <p><strong>Status:</strong> {orderDetails.status || 'N/A'}</p>
                    {orderDetails.tracking_number && (
                      <p>
                        <strong>Tracking Number:</strong>{' '}
                        <a
                          href={orderDetails.tracking_link || '#'}
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

                {orderDetails.sendcloud_return_id && (
                  <div>
                    <h4 className="font-medium mb-2 text-gray-700">Return Information</h4>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                      <p>
                        <strong>Sendcloud Return ID:</strong> {orderDetails.sendcloud_return_id}
                      </p>
                      {orderDetails.sendcloud_return_parcel_id && (
                        <p>
                          <strong>Sendcloud Parcel ID:</strong> {orderDetails.sendcloud_return_parcel_id}
                        </p>
                      )}
                      {orderDetails.sendcloud_return_label_url && (
                        <div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const parcelId = orderDetails.sendcloud_return_parcel_id;
                              if (parcelId) {
                                const proxyUrl = `/api/returns/download-label/${parcelId}`;
                                window.open(proxyUrl, '_blank');
                              } else {
                                 toast.error('Missing Parcel ID to download label.');
                              }
                            }}
                          >
                            View Return Label
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
                !loading && <p className="text-gray-500 text-center">No order details found.</p>
            )}
          </div>

          <div className="px-6 py-4 border-t bg-gray-50">
            <Button onClick={onClose} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 