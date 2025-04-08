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
import EnhancedOrdersTable from "../components/EnhancedOrdersTable";

export default function ReturnsPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingLabel, setCreatingLabel] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [upgradingOrder, setUpgradingOrder] = useState(null);

  useEffect(() => {
    loadDeliveredOrders();
  }, []);

  const handleOpenOrder = (orderId) => {
    const orderToOpen = deliveredOrders.find(order => order.id === orderId);
    if (orderToOpen) {
      setSelectedOrder(orderToOpen);
      setIsModalOpen(true);
    }
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

  // Placeholder function for handling order upgrades
  const handleUpgradeOrder = async (orderId) => {
    setUpgradingOrder(orderId);
    console.log(`Initiating upgrade for order: ${orderId}`);
    toast.loading('Upgrade process not yet implemented...', { id: `upgrade-${orderId}` });
    // TODO: Implement the full upgrade logic
    // 1. Call API to create return label for original order (if needed, or use createReturnLabel)
    // 2. Determine the details of the new upgrade order (potentially open a modal?)
    // 3. Call API to create a *new* shipping label for the upgrade order
    // 4. Update UI / order status
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
    toast.dismiss(`upgrade-${orderId}`);
    toast.success(`Placeholder: Upgrade initiated for order ${orderId}. Full implementation pending.`);
    setUpgradingOrder(null);
  };

  // Define columns for the EnhancedOrdersTable specific to returns
  const returnColumns = [
    {
      id: 'actions',
      label: 'Actions',
      type: 'actions',
      className: 'sticky left-0 bg-white w-[280px] z-10 border-r', // Add border-r for visual separation
      actions: [
        {
          label: 'Open',
          handler: (orderId) => handleOpenOrder(orderId),
          variant: 'outline',
          className: 'mr-2',
        },
        {
          label: 'Track Return',
          handler: (orderId) => {
             const order = deliveredOrders.find(o => o.id === orderId);
             if (order && order.return_tracking_link) {
                window.open(order.return_tracking_link, '_blank');
             } else {
                toast.error('No tracking link available for this return.')
             }
          },
          variant: 'outline',
          className: 'mr-2',
          condition: (order) => !!order.return_label_url,
        },
        {
          label: 'Create Return Label',
          handler: (orderId) => createReturnLabel(orderId),
          disabled: (orderId) => creatingLabel === orderId,
          loading: (orderId) => creatingLabel === orderId,
          loadingText: 'Creating...',
          className: 'mr-2',
          condition: (order) => !order.return_label_url,
        },
        {
          label: 'Upgrade Order',
          handler: (orderId) => handleUpgradeOrder(orderId),
          variant: 'secondary',
          disabled: (orderId) => upgradingOrder === orderId || creatingLabel === orderId || !!deliveredOrders.find(o => o.id === orderId)?.return_label_url,
          loading: (orderId) => upgradingOrder === orderId,
          loadingText: 'Upgrading...',
          condition: (order) => !order.return_label_url,
        },
      ]
    },
    { 
      id: 'id', 
      label: 'Order ID', 
      type: 'link', 
      linkPrefix: '/orders/',
      className: 'w-[80px] whitespace-nowrap border-r'
    },
    { 
      id: 'name', 
      label: 'Customer',
      className: 'w-[100px] whitespace-nowrap border-r border-none' // Keep border-none for the cell content
    },
    { 
      id: 'order_pack', 
      label: 'Order Pack',
      className: 'w-[100px] whitespace-nowrap border-r'
    },
    { 
      id: 'last_delivery_status_check', 
      label: 'Delivery Date', 
      type: 'date',
      className: 'w-[120px] whitespace-nowrap border-r'
    },
    {
      id: 'return_status',
      label: 'Return Label',
      type: 'custom',
      className: 'w-[100px] whitespace-nowrap border-r',
      render: (order) => (
        order.return_label_url ? (
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
        )
      )
    }
  ];

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

      <div className="table-container">
        <div className="table-scroll-wrapper">
          <EnhancedOrdersTable
            orders={deliveredOrders}
            loading={loading}
            columns={returnColumns}
            onOrderUpdate={() => {}}
            onRefresh={loadDeliveredOrders}
            showBulkActions={false}
          />
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