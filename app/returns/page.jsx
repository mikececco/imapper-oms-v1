'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '../components/Providers';
import { toast } from 'react-hot-toast';
import { Button } from "../components/ui/button";
import { formatDate } from '../utils/date-utils';
import LateralOrderModal from '../components/LateralOrderModal';
import ReturnsTable from '../components/ReturnsTable';
import ReturnConfirmationModal from '../components/ReturnConfirmationModal';

export default function ReturnsPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingLabelOrderId, setCreatingLabelOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [upgradingOrderId, setUpgradingOrderId] = useState(null);
  const [isReturnConfirmModalOpen, setIsReturnConfirmModalOpen] = useState(false);
  const [orderForReturn, setOrderForReturn] = useState(null);

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

  const createReturnLabel = async (orderId, returnFromAddress, returnToAddress, parcelWeight) => {
    try {
      setCreatingLabelOrderId(orderId);
      const response = await fetch('/api/returns/create-label', {
        method: 'POST',
        headers: {'Content-Type': 'application/json',},
        body: JSON.stringify({ orderId, returnFromAddress, returnToAddress, parcelWeight }),
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
                sendcloud_return_id: data.sendcloud_return_id,
                sendcloud_return_parcel_id: data.sendcloud_return_parcel_id,
                updated_at: new Date().toISOString()
              }
            : order
        )
      );

      toast.success(data.message || 'Return initiated successfully');

    } catch (error) {
      console.error('Error creating return label:', error);
      toast.error(error.message);
    } finally {
      setCreatingLabelOrderId(null);
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

  const handleConfirmReturn = async (orderId, returnFromAddress, returnToAddress, parcelWeight) => {
    await createReturnLabel(orderId, returnFromAddress, returnToAddress, parcelWeight);
    handleCloseReturnModal();
  };

  const handleUpgradeOrder = async (orderId) => {
    setUpgradingOrderId(orderId);
    console.log(`Initiating upgrade for order: ${orderId}`);
    toast.loading('Upgrade process not yet implemented...', { id: `upgrade-${orderId}` });
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.dismiss(`upgrade-${orderId}`);
    toast.success(`Placeholder: Upgrade initiated for order ${orderId}. Full implementation pending.`);
    setUpgradingOrderId(null);
  };

  const handleTrackReturn = (orderId) => {
    const order = deliveredOrders.find(o => o.id === orderId);
    toast.info(`Tracking info for return ID ${order?.sendcloud_return_id} not yet implemented.`);
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
          handler: handleOpenOrder,
          variant: 'outline',
          className: 'mr-2',
        },
        {
          label: 'Track Return',
          handler: handleTrackReturn,
          variant: 'outline',
          className: 'mr-2',
          condition: (order) => !!order.sendcloud_return_id,
        },
        {
          label: 'Create Return Label',
          handler: handleOpenReturnModal,
          disabled: (orderId) => creatingLabelOrderId === orderId || upgradingOrderId === orderId,
          loading: (orderId) => creatingLabelOrderId === orderId,
          loadingText: 'Creating...',
          className: 'mr-2',
          condition: (order) => !order.sendcloud_return_id,
        },
        {
          label: 'Upgrade Order',
          handler: handleUpgradeOrder,
          variant: 'secondary',
          disabled: (orderId) => upgradingOrderId === orderId || creatingLabelOrderId === orderId || !!deliveredOrders.find(o => o.id === orderId)?.sendcloud_return_id,
          loading: (orderId) => upgradingOrderId === orderId,
          loadingText: 'Upgrading...',
          condition: (order) => !order.sendcloud_return_id,
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
      id: 'updated_at',
      label: 'Last Update', 
      type: 'date',
      className: 'w-[120px] whitespace-nowrap border-r'
    },
    {
      id: 'return_status',
      label: 'Return Status',
      type: 'custom',
      className: 'w-[120px] whitespace-nowrap border-r',
      render: (order) => {
        if (order.sendcloud_return_id) {
          return (
            <span className="text-xs text-gray-700" title={`Return ID: ${order.sendcloud_return_id}\nParcel ID: ${order.sendcloud_return_parcel_id}`}>
              Initiated
            </span>
          );
        }
        return <span className="text-xs text-gray-500">Not Initiated</span>;
      }
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Returns Management</h1>
        <p className="text-gray-600">Create and manage return labels for delivered orders</p>
      </header>

      <ReturnsTable
        orders={deliveredOrders}
        loading={loading}
        columns={returnColumns}
        onOpenOrder={handleOpenOrder}
        onTrackReturn={handleTrackReturn}
        onCreateReturnLabel={handleOpenReturnModal}
        onUpgradeOrder={handleUpgradeOrder}
        creatingLabelOrderId={creatingLabelOrderId}
        upgradingOrderId={upgradingOrderId}
      />

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
          isLoading={creatingLabelOrderId === orderForReturn?.id}
        />
      )}
    </div>
  );
} 