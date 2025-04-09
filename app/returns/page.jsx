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
import UpgradeOrderModal from '../components/UpgradeOrderModal';

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
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [orderForUpgrade, setOrderForUpgrade] = useState(null);

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

  const createReturnLabelStandard = async (orderId, returnFromAddress, returnToAddress, parcelWeight) => {
    setCreatingLabelOrderId(orderId);
    const toastId = toast.loading('Creating return label...');
    try {
      const response = await fetch('/api/returns/create-label', {
        method: 'POST',
        headers: {'Content-Type': 'application/json',},
        body: JSON.stringify({ orderId, returnFromAddress, returnToAddress, parcelWeight }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create return label');
      
      setDeliveredOrders(prevOrders => prevOrders.map(order => order.id === orderId ? { ...order, sendcloud_return_id: data.sendcloud_return_id, sendcloud_return_parcel_id: data.sendcloud_return_parcel_id, updated_at: new Date().toISOString() } : order ));
      toast.success(data.message || 'Return initiated successfully', { id: toastId });
      handleCloseReturnModal();

    } catch (error) {
      console.error('Error creating return label:', error);
      toast.error(error.message, { id: toastId });
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

  const handleConfirmReturnStandard = async (orderId, returnFromAddress, returnToAddress, parcelWeight) => {
    await createReturnLabelStandard(orderId, returnFromAddress, returnToAddress, parcelWeight);
  };

  const handleOpenUpgradeModal = async (orderId) => {
    console.log("[handleOpenUpgradeModal] Clicked for orderId:", orderId);
    const order = deliveredOrders.find(o => o.id === orderId);
    if (order) {
      console.log("[handleOpenUpgradeModal] Found order:", order);
      setOrderForUpgrade(order); 
      console.log("[handleOpenUpgradeModal] Setting isUpgradeModalOpen to true...");
      setIsUpgradeModalOpen(true);
    } else {
      console.error("[handleOpenUpgradeModal] Could not find order details for ID:", orderId);
      toast.error("Could not find order details to upgrade.");
    }
  };

  const handleCloseUpgradeModal = () => {
    setIsUpgradeModalOpen(false);
    setOrderForUpgrade(null);
  };

  const handleCreateReturnLabelForUpgrade = async (orderId, customerAddress, returnToAddress, returnWeight) => {
    console.log("Requesting return label for upgrade:", orderId, customerAddress, returnToAddress, returnWeight);
    setUpgradingOrderId(orderId);
    const toastId = toast.loading('Creating return label for original item...');
    try {
        const response = await fetch('/api/returns/create-label', {
            method: 'POST',
            headers: {'Content-Type': 'application/json',},
            body: JSON.stringify({ 
                orderId: orderId, 
                returnFromAddress: customerAddress, 
                returnToAddress: returnToAddress, 
                parcelWeight: returnWeight
            }),
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
        toast.success(data.message || 'Return label for original item created!', { id: toastId });

    } catch (error) {
        console.error('Error creating return label during upgrade:', error);
        toast.error(`Failed to create return label: ${error.message || 'Unknown error'}`, { id: toastId });
    } finally {
    }
  };

  const handleCreateNewLabelForUpgrade = async (orderId, newLabelDetails) => {
    console.log(`Requesting new label for upgraded order ${orderId} with details:`, newLabelDetails);
    setUpgradingOrderId(orderId);
    const toastId = toast.loading('Creating label for new item...');

    try {
       await new Promise(resolve => setTimeout(resolve, 1500));

       const mockNewLabelData = { 
           shipping_id: `NEW_${orderId.slice(-4)}`, 
           tracking_number: `TRACKNEW${orderId.slice(-4)}`, 
           tracking_link: `#newTrackingLink`, 
           label_url: `#newlabelUrl`, 
           status: 'Ready to send'
       };
       const mockUpdatedOrderData = {
           ...newLabelDetails,
           ...mockNewLabelData,
           updated_at: new Date().toISOString()
       };

       setDeliveredOrders(prevOrders =>
         prevOrders.map(order =>
           order.id === orderId ? { ...order, ...mockUpdatedOrderData } : order
         )
       );

       toast.success(`New label created for upgraded order ${orderId}!`, { id: toastId });
       handleCloseUpgradeModal();

    } catch (error) {
        console.error('Error creating new label during upgrade:', error);
        toast.error(`Failed to create new label: ${error.message || 'Unknown error'}`, { id: toastId });
    } finally {
        setUpgradingOrderId(null);
    }
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
          handler: handleOpenUpgradeModal,
          variant: 'secondary',
          disabled: (orderId) => upgradingOrderId === orderId || creatingLabelOrderId === orderId,
          loading: (orderId) => upgradingOrderId === orderId,
          loadingText: 'Processing...',
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

  console.log("[ReturnsPage Render] isUpgradeModalOpen:", isUpgradeModalOpen, "orderForUpgrade:", !!orderForUpgrade);

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
        onUpgradeOrder={handleOpenUpgradeModal}
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
          onConfirm={handleConfirmReturnStandard}
          isLoading={creatingLabelOrderId === orderForReturn?.id}
        />
      )}

      {orderForUpgrade && (
        <UpgradeOrderModal
          isOpen={isUpgradeModalOpen}
          onClose={handleCloseUpgradeModal}
          order={orderForUpgrade}
          onCreateReturnLabel={handleCreateReturnLabelForUpgrade}
          onCreateNewLabel={handleCreateNewLabelForUpgrade}
        />
      )}
    </div>
  );
} 