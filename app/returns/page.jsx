'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '../components/Providers';
import { toast } from 'react-hot-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { formatDate } from '../utils/date-utils';
import LateralOrderModal from '../components/LateralOrderModal';

export default function ReturnsPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingLabel, setCreatingLabel] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadDeliveredOrders();
  }, []);

  const handleOpenOrder = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const loadDeliveredOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['delivered', 'Delivered'])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDeliveredOrders(data || []);
    } catch (error) {
      console.error('Error loading delivered orders:', error);
      toast.error('Failed to load delivered orders');
    } finally {
      setLoading(false);
    }
  };

  const createReturnLabel = async (orderId) => {
    try {
      setCreatingLabel(orderId);
      const response = await fetch('/api/returns/create-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create return label');
      }

      // Update the order in the local state with the return label information
      setDeliveredOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? {
                ...order,
                return_label_url: data.label_url,
                return_tracking_number: data.tracking_number,
                return_tracking_link: data.tracking_link,
                updated_at: new Date().toISOString()
              }
            : order
        )
      );

      toast.success('Return label created successfully');
    } catch (error) {
      console.error('Error creating return label:', error);
      toast.error(error.message);
    } finally {
      setCreatingLabel(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Returns Management</h1>
        <p className="text-gray-600">Create and manage return labels for delivered orders</p>
      </header>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order Pack</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Return Label</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No delivered orders found
                  </TableCell>
                </TableRow>
              ) : (
                deliveredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{order.name || 'N/A'}</TableCell>
                    <TableCell>{order.order_pack || 'N/A'}</TableCell>
                    <TableCell>{formatDate(order.last_delivery_status_check)}</TableCell>
                    <TableCell>
                      {order.return_label_url ? (
                        <a
                          href={order.return_label_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Label
                        </a>
                      ) : (
                        'No return label'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleOpenOrder(order)}
                          className="mr-2"
                        >
                          Open
                        </Button>
                        {order.return_label_url ? (
                          <Button
                            variant="outline"
                            onClick={() => window.open(order.return_tracking_link, '_blank')}
                          >
                            Track Return
                          </Button>
                        ) : (
                          <Button
                            onClick={() => createReturnLabel(order.id)}
                            disabled={creatingLabel === order.id}
                          >
                            {creatingLabel === order.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                Creating...
                              </>
                            ) : (
                              'Create Return Label'
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedOrder && (
        <LateralOrderModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
} 