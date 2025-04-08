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
import ReturnConfirmationModal from '../components/ReturnConfirmationModal';

export default function ReturnsPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingLabel, setCreatingLabel] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [upgradingOrder, setUpgradingOrder] = useState(null);
  const [isReturnConfirmModalOpen, setIsReturnConfirmModalOpen] = useState(false);
  const [orderForReturn, setOrderForReturn] = useState(null);

  const warehouseAddress = {
    name: "Default Warehouse",
    line1: "1 Warehouse Way",
    city: "Logistics Town",
    postal_code: "98765",
    country: "NL"
  };

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

  const createReturnLabel = async (orderId, returnAddress) => {
    try {
      setCreatingLabel(orderId);
      const response = await fetch('/api/returns/create-label', {
        method: 'POST',
        headers: {'Content-Type': 'application/json',},
        body: JSON.stringify({ orderId, returnAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create return label');
      }

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

  const handleOpenReturnModal = (orderId) => {
    const order = deliveredOrders.find(o => o.id === orderId);
    if (order) {
      setOrderForReturn(order);
      setIsReturnConfirmModalOpen(true);
    } else {
      toast.error("Could not find order details.");
    }
  };

  const handleCloseReturnModal = () => {
    setIsReturnConfirmModalOpen(false);
    setOrderForReturn(null);
  };

  const handleConfirmReturn = async (orderId, returnAddress) => {
    await createReturnLabel(orderId, returnAddress);
    handleCloseReturnModal();
  };

  const handleUpgradeOrder = async (orderId) => {
    setUpgradingOrder(orderId);
    console.log(`Initiating upgrade for order: ${orderId}`);
    toast.loading('Upgrade process not yet implemented...', { id: `upgrade-${orderId}` });
    await new Promise(resolve => setTimeout(resolve, 2000));
    toast.dismiss(`upgrade-${orderId}`);
    toast.success(`Placeholder: Upgrade initiated for order ${orderId}. Full implementation pending.`);
    setUpgradingOrder(null);
  };

  const returnColumns = [
    {
      id: 'actions',
      label: 'Actions',
      type: 'actions',
      className: 'sticky left-0 bg-white w-[280px] z-10 border-r',
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
          handler: (orderId) => handleOpenReturnModal(orderId),
          disabled: (orderId) => creatingLabel === orderId || !!deliveredOrders.find(o => o.id === orderId)?.return_label_url,
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
      className: 'w-[100px] whitespace-nowrap border-r border-none'
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

      {orderForReturn && (
        <ReturnConfirmationModal
          isOpen={isReturnConfirmModalOpen}
          onClose={handleCloseReturnModal}
          order={orderForReturn}
          onConfirm={handleConfirmReturn}
          returnToAddress={warehouseAddress}
          isLoading={creatingLabel === orderForReturn?.id}
        />
      )}
    </div>
  );
} 