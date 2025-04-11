'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabase } from '../components/Providers';
import { toast } from 'react-hot-toast';
import { Button } from "../components/ui/button";
import { formatDate } from '../utils/date-utils';
import LateralOrderModal from '../components/LateralOrderModal';
import ReturnsTable from '../components/ReturnsTable';
import ReturnConfirmationModal from '../components/ReturnConfirmationModal';
import UpgradeOrderModal from '../components/UpgradeOrderModal';
import OrderSearch from '../components/OrderSearch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { formatAddressForTable } from '../utils/formatters';
import { Badge } from '../components/ui/badge';

export default function ReturnsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabase();
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingLabelOrderId, setCreatingLabelOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [upgradingOrderId, setUpgradingOrderId] = useState(null);
  const [isReturnConfirmModalOpen, setIsReturnConfirmModalOpen] = useState(false);
  const [orderForReturn, setOrderForReturn] = useState(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [orderForUpgrade, setOrderForUpgrade] = useState(null);
  const [activeTab, setActiveTab] = useState('createReturns');
  const [isMounted, setIsMounted] = useState(false);
  const [returnStatuses, setReturnStatuses] = useState({});
  const [loadingStatuses, setLoadingStatuses] = useState({});
  const [fetchingAllStatuses, setFetchingAllStatuses] = useState(false);

  const query = searchParams?.get('q') ? decodeURIComponent(searchParams.get('q')) : '';

  useEffect(() => {
    loadOrders();
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (loading) return;
    filterOrders();
  }, [query, allOrders, loading]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or('status.in.(\"delivered\",\"Delivered\"),sendcloud_return_id.not.is.null,sendcloud_return_parcel_id.not.is.null')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Process fetched data to update status based on manual_instruction
      const processedData = (data || []).map(order => {
        if (order.manual_instruction?.toLowerCase() === 'delivered' && order.status?.toLowerCase() !== 'delivered') {
          // Return a new object with updated status if condition met
          return { ...order, status: 'Delivered' }; 
        }
        // Otherwise, return the original order
        return order;
      });

      console.log("[loadOrders] Fetched Data (Processed):", processedData);
      setAllOrders(processedData);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = allOrders;
    if (query) {
      const lowercaseQuery = query.toLowerCase();
      filtered = allOrders.filter(order => {
        return (
          (order.id && order.id.toLowerCase().includes(lowercaseQuery)) ||
          (order.name && order.name.toLowerCase().includes(lowercaseQuery)) ||
          (order.email && order.email.toLowerCase().includes(lowercaseQuery)) ||
          (order.phone && order.phone.toLowerCase().includes(lowercaseQuery)) ||
          (order.shipping_address_line1 && order.shipping_address_line1.toLowerCase().includes(lowercaseQuery)) ||
          (order.shipping_address_city && order.shipping_address_city.toLowerCase().includes(lowercaseQuery)) ||
          (order.shipping_address_postal_code && order.shipping_address_postal_code.toLowerCase().includes(lowercaseQuery)) ||
          (order.shipping_address_country && order.shipping_address_country.toLowerCase().includes(lowercaseQuery)) ||
          (order.order_pack && order.order_pack.toLowerCase().includes(lowercaseQuery)) ||
          (order.tracking_number && order.tracking_number.toLowerCase().includes(lowercaseQuery)) ||
          (order.sendcloud_return_id && order.sendcloud_return_id.toString().includes(lowercaseQuery)) ||
          (order.sendcloud_return_parcel_id && order.sendcloud_return_parcel_id.toString().includes(lowercaseQuery))
        );
      });
    }
    setFilteredOrders(filtered);
  };

  const ordersForCreateReturn = filteredOrders.filter(o => 
    (o.status?.toLowerCase() === 'delivered' || o.status?.toLowerCase() === 'delivered') &&
    !o.sendcloud_return_id && !o.sendcloud_return_parcel_id
  );
  const returnedOrders = filteredOrders.filter(o => 
    o.sendcloud_return_id || o.sendcloud_return_parcel_id
  );

  const handleOpenOrder = (orderId) => {
    const orderToOpen = allOrders.find(order => order.id === orderId);
    if (orderToOpen) {
      setSelectedOrder(orderToOpen);
      setIsModalOpen(true);
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
      
      setAllOrders(prevOrders => prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, sendcloud_return_id: data.sendcloud_return_id, sendcloud_return_parcel_id: data.sendcloud_return_parcel_id, updated_at: new Date().toISOString() } 
          : order 
      ));
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
    const order = allOrders.find(o => o.id === orderId);
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
    const order = allOrders.find(o => o.id === orderId);
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

        setAllOrders(prevOrders =>
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
    const toastId = toast.loading('Updating order details...');

    try {
       const updateResponse = await fetch(`/api/orders/${orderId}/update-pack`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
               orderPackId: newLabelDetails.order_pack_list_id,
               orderPack: newLabelDetails.order_pack,
               orderPackLabel: newLabelDetails.order_pack_label,
               weight: newLabelDetails.weight,
               order_pack_quantity: newLabelDetails.quantity,
           }),
       });

       const updateData = await updateResponse.json();
       if (!updateResponse.ok) {
           throw new Error(updateData.error || 'Failed to update order details');
       }
       toast.loading('Order updated. Creating new shipping label...', { id: toastId });

       const labelResponse = await fetch('/api/orders/create-shipping-label', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ orderId }),
       });

       const labelData = await labelResponse.json();
       if (!labelResponse.ok) {
           console.error("Label creation failed after order update:", labelData.error);
           throw new Error(labelData.error || 'Order updated, but failed to create new shipping label');
       }

       const existingOrder = allOrders.find(o => o.id === orderId);
       const finalUpdatedOrderData = {
           ...newLabelDetails,
           shipping_id: labelData.shipping_id,
           tracking_number: labelData.tracking_number,
           tracking_link: labelData.tracking_link,
           label_url: labelData.label_url,
           status: labelData.status || 'Ready to send',
           updated_at: new Date().toISOString(),
           sendcloud_return_id: existingOrder?.sendcloud_return_id,
           sendcloud_return_parcel_id: existingOrder?.sendcloud_return_parcel_id,
       };

       setAllOrders(prevOrders =>
         prevOrders.map(order =>
           order.id === orderId ? { ...order, ...finalUpdatedOrderData } : order
         )
       );

       toast.success(`New label created for upgraded order ${orderId}!`, { id: toastId });
       handleCloseUpgradeModal();

    } catch (error) {
        console.error('Error during upgrade process:', error);
        toast.error(`Upgrade failed: ${error.message || 'Unknown error'}`, { id: toastId });
    } finally {
        setUpgradingOrderId(null);
    }
  };

  const handleTrackReturn = (orderId) => {
    const order = allOrders.find(o => o.id === orderId);
    if (order && order.sendcloud_return_parcel_id) {
      window.open(`https://app.sendcloud.com/returns/detail/${order.sendcloud_return_parcel_id}/`, '_blank');
    } else {
      toast.error('Return tracking information not available.');
    }
  };

  const fetchReturnStatus = useCallback(async (returnParcelId) => {
    if (!returnParcelId || loadingStatuses[returnParcelId]) return;

    setLoadingStatuses(prev => ({ ...prev, [returnParcelId]: true }));
    try {
      const response = await fetch(`/api/returns/get-status?returnParcelId=${encodeURIComponent(returnParcelId)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch status (${response.status})`);
      }
      const data = await response.json();
      setReturnStatuses(prev => ({ ...prev, [returnParcelId]: data.status }));
    } catch (error) {
      console.error(`Error fetching status for ${returnParcelId}:`, error);
      toast.error(`Failed to fetch status for return ID ${returnParcelId}.`);
    } finally {
      setLoadingStatuses(prev => ({ ...prev, [returnParcelId]: false }));
    }
  }, [loadingStatuses]);

  const fetchAllReturnStatuses = useCallback(async () => {
    if (fetchingAllStatuses) return;
    setFetchingAllStatuses(true);
    const toastId = toast.loading('Fetching return statuses...');
    
    const promises = returnedOrders
      .filter(order => order.sendcloud_return_parcel_id && !returnStatuses[order.sendcloud_return_parcel_id] && !loadingStatuses[order.sendcloud_return_parcel_id])
      .map(order => fetchReturnStatus(order.sendcloud_return_parcel_id));

    try {
      await Promise.all(promises);
      toast.success('Return statuses updated.', { id: toastId });
    } catch (error) {
      console.error("Error fetching all statuses:", error);
      toast.error('Some statuses could not be fetched.', { id: toastId });
    } finally {
      setFetchingAllStatuses(false);
    }
  }, [returnedOrders, returnStatuses, loadingStatuses, fetchReturnStatus, fetchingAllStatuses]);

  useEffect(() => {
    if (activeTab === 'returnedOrders' && returnedOrders.length > 0) {
       const ordersToFetch = returnedOrders.filter(order => 
         order.sendcloud_return_parcel_id && 
         !returnStatuses[order.sendcloud_return_parcel_id] &&
         !loadingStatuses[order.sendcloud_return_parcel_id]
       );
       if (ordersToFetch.length > 0) {
           fetchAllReturnStatuses();
       }
    }
  }, [returnedOrders, activeTab, returnStatuses, loadingStatuses, fetchAllReturnStatuses]);

  const createReturnColumns = [
    {
      id: 'actions',
      label: 'Actions',
      type: 'actions',
      className: 'w-[280px]',
      actions: [
        { 
          label: 'Open',
          handler: handleOpenOrder, 
          variant: 'outline',
        },
        { 
          label: creatingLabelOrderId === 'dummy' ? 'Creating...' : 'Create Return',
          handler: handleOpenReturnModal, 
          variant: 'outline',
          loading: (orderId) => creatingLabelOrderId === orderId,
          disabled: (orderId) => !!creatingLabelOrderId,
        },
        {
          label: 'Upgrade Order',
          handler: handleOpenUpgradeModal,
          variant: 'secondary',
          loading: (orderId) => upgradingOrderId === orderId,
          disabled: (orderId) => !!upgradingOrderId,
        }
      ]
    },
    { id: 'id', label: 'Order ID', type: 'link', linkPrefix: '/orders/', className: 'w-[100px] whitespace-nowrap border-r' }, 
    { id: 'name', label: 'Customer', className: 'w-[60px] border-r border-none whitespace-nowrap overflow-hidden text-ellipsis' },
    { id: 'status', label: 'Status', className: 'w-[70px] whitespace-nowrap border-r'},
    { id: 'shipping_address', label: 'Shipping Address', className: 'min-w-[200px] border-r', type: 'custom', render: (order) => formatAddressForTable(order, isMounted) },
    { id: 'order_pack', label: 'Pack', className: 'w-[80px] whitespace-nowrap border-r'},
    { id: 'tracking_number', label: 'Tracking', className: 'w-[120px] whitespace-nowrap border-r overflow-hidden text-ellipsis'},
  ];

  const returnedOrdersColumns = [
    {
      id: 'actions',
      label: 'Actions',
      type: 'actions',
      className: 'w-[150px]',
      actions: [
        { 
          label: 'Open',
          handler: handleOpenOrder,
          variant: 'outline',
        },
        { 
          label: 'Track Return',
          handler: handleTrackReturn,
          variant: 'outline',
          condition: (order) => !!order.sendcloud_return_parcel_id 
        },
      ]
    },
    { id: 'id', label: 'Order ID', type: 'link', linkPrefix: '/orders/', className: 'w-[120px] whitespace-nowrap border-r' },
    { id: 'name', label: 'Customer', className: 'w-[60px] border-r border-none whitespace-nowrap overflow-hidden text-ellipsis' },
    { 
      id: 'return_status', 
      label: 'Return Status', 
      className: 'w-[160px] whitespace-nowrap border-r',
      type: 'custom', 
      render: (order) => {
        const parcelId = order.sendcloud_return_parcel_id;
        if (!parcelId) return <span className="text-gray-400">N/A</span>;

        const status = returnStatuses[parcelId];
        const isLoading = loadingStatuses[parcelId];

        if (isLoading) {
          return <span className="text-gray-500 italic">Fetching...</span>;
        }
        
        if (status) {
            let badgeVariant = 'secondary';
            if (status.toLowerCase().includes('delivered') || status.toLowerCase().includes('received')) badgeVariant = 'success';
            if (status.toLowerCase().includes('cancelled') || status.toLowerCase().includes('error')) badgeVariant = 'destructive';
            if (status.toLowerCase().includes('created') || status.toLowerCase().includes('announced')) badgeVariant = 'outline';
            
            return <Badge variant={badgeVariant}>{status}</Badge>;
        } 
        
        return <span className="text-gray-400">N/A</span>;
      }
    },
    { id: 'status', label: 'Original Status', className: 'w-[100px] whitespace-nowrap border-r'},
    { id: 'sendcloud_return_parcel_id', label: 'Return ID', className: 'w-[150px] whitespace-nowrap border-r'},
    { id: 'order_pack', label: 'Pack', className: 'w-[100px] whitespace-nowrap border-r'},
    { id: 'updated_at', label: 'Return Date', type: 'date', className: 'w-[120px] whitespace-nowrap border-r' },
  ];

  // Add console logs for debugging
  console.log("[ReturnsPage Render] All Orders Fetched:", allOrders);
  console.log("[ReturnsPage Render] Filtered Delivered (Create Return Tab):", ordersForCreateReturn);
  console.log("[ReturnsPage Render] Filtered Returned (Returned Orders Tab):", returnedOrders);
  console.log("[ReturnsPage Render] isUpgradeModalOpen:", isUpgradeModalOpen, "orderForUpgrade:", !!orderForUpgrade);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-4">
        <h1 className="text-2xl font-bold mb-2">Returns Management</h1>
        <p className="text-gray-600">Create and manage return labels for delivered orders</p>
      </header>

      <div className="mb-6">
        <OrderSearch />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="createReturns">Orders Delivered ({ordersForCreateReturn.length})</TabsTrigger>
          <TabsTrigger value="returnedOrders">Orders Returned ({returnedOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="createReturns">
           <p className="text-sm text-gray-600 mb-4">Orders delivered but not yet returned.</p>
           <ReturnsTable
             orders={ordersForCreateReturn}
             loading={loading}
             columns={createReturnColumns}
             handleRowClick={handleOpenOrder}
           />
        </TabsContent>

        <TabsContent value="returnedOrders">
           <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">Orders that have been returned.</p>
              <Button 
                onClick={fetchAllReturnStatuses}
                disabled={fetchingAllStatuses}
                size="sm"
              >
                {fetchingAllStatuses ? (
                   <><div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></div> Fetching...</>
                ) : (
                   'Fetch All Statuses'
                )}
              </Button>
           </div>
           <ReturnsTable
             orders={returnedOrders}
             loading={loading}
             columns={returnedOrdersColumns}
             handleRowClick={handleOpenOrder}
           />
        </TabsContent>
      </Tabs>

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
          isLoading={!!creatingLabelOrderId}
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