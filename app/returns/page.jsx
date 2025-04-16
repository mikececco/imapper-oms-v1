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
import NewOrderModal from '../components/NewOrderModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { formatAddressForTable } from '../utils/formatters';
import { Badge } from '../components/ui/badge';
import { RefreshCw } from 'lucide-react';

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
  const [upgradeStatuses, setUpgradeStatuses] = useState({});
  const [loadingUpgradeStatuses, setLoadingUpgradeStatuses] = useState({});
  const [fetchingAllUpgradeStatuses, setFetchingAllUpgradeStatuses] = useState(false);
  const [decodedQuery, setDecodedQuery] = useState('');
  const [fetchingReturnStatusId, setFetchingReturnStatusId] = useState(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

  useEffect(() => {
    const queryFromUrl = searchParams?.get('q') || '';
    try {
      setDecodedQuery(decodeURIComponent(queryFromUrl));
    } catch (e) {
      console.error("Failed to decode query param:", e);
      setDecodedQuery(queryFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    loadOrders();
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (loading) return;
    filterOrders();
  }, [decodedQuery, allOrders, loading]);

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
    if (decodedQuery) {
      const lowercaseQuery = decodedQuery.toLowerCase();
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
    !o.sendcloud_return_id && !o.sendcloud_return_parcel_id &&
    !o.upgrade_shipping_id // Exclude upgraded orders from this tab
  );
  const returnedOrders = filteredOrders.filter(o => 
    (o.sendcloud_return_id || o.sendcloud_return_parcel_id) &&
    !o.upgrade_shipping_id // Exclude upgraded orders from this tab for now (can adjust if needed)
  );
  const upgradedOrders = filteredOrders.filter(o => 
    o.upgrade_shipping_id // Filter for orders with an upgrade shipping ID
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
      const data = await response.json(); // Contains labelUrl now
      if (!response.ok) throw new Error(data.error || 'Failed to create return label');

      // Update local state including the new label URL
      setAllOrders(prevOrders => prevOrders.map(order =>
          order.id === orderId
          ? {
              ...order,
              sendcloud_return_id: data.sendcloud_return_id,
              sendcloud_return_parcel_id: data.sendcloud_return_parcel_id,
              sendcloud_return_label_url: data.sendcloud_return_label_url, // Store the label URL
              updated_at: new Date().toISOString()
             }
          : order
      ));

      // Optionally include link in success toast if URL exists
      const successMessage = data.sendcloud_return_label_url
        ? <>Return initiated successfully! <a href={data.sendcloud_return_label_url} target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-blue-700">View Label</a></>
        : (data.message || 'Return initiated successfully'); // Fallback message

      toast.success(successMessage, { id: toastId, duration: 6000 }); // Keep toast longer if link is present
      handleCloseReturnModal();

    } catch (error) {
      console.error('Error creating return label:', error);
      toast.error(`Error: ${error.message}`, { id: toastId });
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
    setUpgradingOrderId(orderId); // Assuming this state manages loading for upgrades
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

        const data = await response.json(); // Contains labelUrl now

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create return label');
        }

        // Update local state including the new label URL
        setAllOrders(prevOrders =>
            prevOrders.map(order =>
            order.id === orderId
                ? {
                    ...order,
                    sendcloud_return_id: data.sendcloud_return_id,
                    sendcloud_return_parcel_id: data.sendcloud_return_parcel_id,
                    sendcloud_return_label_url: data.sendcloud_return_label_url, // Store the label URL
                    updated_at: new Date().toISOString()
                  }
                : order
            )
        );

        // Optionally include link in success toast if URL exists
        const successMessage = data.sendcloud_return_label_url
          ? <>Return label created! <a href={data.sendcloud_return_label_url} target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-blue-700">View Label</a></>
          : (data.message || 'Return label for original item created!'); // Fallback message

        toast.success(successMessage, { id: toastId, duration: 6000 });

        // Close relevant modals or update UI as needed for the upgrade flow
        // handleCloseUpgradeModal(); // Example if you have an upgrade modal

    } catch (error) {
        console.error('Error creating return label during upgrade:', error);
        toast.error(`Failed to create return label: ${error.message || 'Unknown error'}`, { id: toastId });
    } finally {
        setUpgradingOrderId(null); // Reset loading state for upgrades
    }
  };

  const handleCreateNewLabelForUpgrade = async (orderId, newLabelDetails) => {
    console.log(`Requesting new label for upgraded order ${orderId} with details:`, newLabelDetails);
    setUpgradingOrderId(orderId);
    // Keep track of the main toast for overall process
    const mainToastId = toast.loading('Starting upgrade process...'); 

    try {
       // 1. Update Order Pack Details (Existing API Call)
       toast.loading('Updating order pack details...', { id: mainToastId });
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

       // 2. Create New Shipping Label (Existing API Call)
       toast.loading('Order pack updated. Creating new shipping label...', { id: mainToastId });
       const labelResponse = await fetch('/api/orders/create-shipping-label', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ orderId }), // Uses the same order ID
       });
       const labelData = await labelResponse.json();
       if (!labelResponse.ok) {
           console.error("Label creation failed after order update:", labelData.error);
           // Don't necessarily throw, allow saving pack update, but report error
           toast.error(`Order pack updated, but failed to create new shipping label: ${labelData.error || 'Unknown error'}. Please create label manually.`, { id: mainToastId, duration: 6000 });
           // Update local state with just the pack changes
           setAllOrders(prevOrders => prevOrders.map(order =>
               order.id === orderId ? { ...order, ...updateData.updatedFields } : order // Assuming update-pack returns updated fields
           ));
           handleCloseUpgradeModal();
           return; // Stop processing if label creation failed
       }

       // 3. Prepare data for database update (including new upgrade_ fields)
       toast.loading('New label created. Saving upgrade details...', { id: mainToastId });
       const upgradeUpdatePayload = {
           // Include the pack update results if needed (assuming API returns them)
           ...updateData.updatedFields, 
           // Map label data to NEW upgrade fields
           upgrade_shipping_id: labelData.shipping_id,
           upgrade_tracking_number: labelData.tracking_number,
           upgrade_tracking_link: labelData.tracking_link,
           upgrade_status: labelData.status || 'Label Created',
           updated_at: new Date().toISOString(),
       };
       console.log("[Upgrade] Payload for DB Update:", upgradeUpdatePayload); // Log payload

       // 4. Update Database with Upgrade Fields using Supabase client
       const { data: dbUpdateResult, error: dbUpdateError } = await supabase // Renamed data to dbUpdateResult
         .from('orders')
         .update(upgradeUpdatePayload)
         .eq('id', orderId)
         .select('id') // Select only id to confirm update, not relying on full row return
         .single();

       if (dbUpdateError) {
           console.error("Database update error during upgrade:", dbUpdateError);
           toast.error(`New label created, but failed to save upgrade details to DB: ${dbUpdateError.message}. Please check order manually.`, { id: mainToastId, duration: 6000 });
           // Update local state optimistically ONLY if needed - might cause confusion
           handleCloseUpgradeModal();
           return; 
       }
       console.log("[Upgrade] DB Update Result (Confirmation):"); // Log confirmation

       // 5. Success: Manually merge the update payload into the local state
       setAllOrders(prevOrders =>
         prevOrders.map(order => {
           if (order.id === orderId) {
             // Merge the existing order with the payload we sent to the DB
             const updatedOrder = { ...order, ...upgradeUpdatePayload };
             console.log("[Upgrade] Updated Order for State:", updatedOrder); // Log the final state object
             return updatedOrder;
           }
           return order;
         })
       );
       toast.success(labelData.message || 'Order upgraded and new label created successfully!', { id: mainToastId });
       handleCloseUpgradeModal();

    } catch (error) {
       console.error('Error during upgrade process:', error);
       toast.error(`Upgrade failed: ${error.message || 'Unknown error'}`, { id: mainToastId });
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

  // Function to fetch status for a single return
  const fetchSingleReturnStatus = useCallback(async (returnId) => {
    if (!returnId) return;
    console.log(`Fetching status for return ID: ${returnId}`);
    setLoadingStatuses(prev => ({ ...prev, [returnId]: true }));
    setFetchingReturnStatusId(returnId); // Indicate which specific ID is fetching
    try {
      const response = await fetch(`/api/returns/get-status?returnId=${returnId}`);
      const data = await response.json();
      if (!response.ok) {
        // Use the error message from API if available, otherwise generic
        throw new Error(data.error || 'Failed to fetch status'); 
      }
      setReturnStatuses(prev => ({ ...prev, [returnId]: data.status }));
      // Optionally update the main order state if status needs persistence beyond session
      // setAllOrders(prev => prev.map(o => o.sendcloud_return_id === returnId ? { ...o, sendcloud_return_status: data.status } : o));
      toast.success(`Status updated for return ${returnId}: ${data.status}`);
    } catch (error) {
      console.error(`Error fetching return status for ${returnId}:`, error);
      toast.error(`Could not fetch status for return ${returnId}: ${error.message}`);
      // Keep existing status or set to an error state if needed
      // setReturnStatuses(prev => ({ ...prev, [returnId]: 'Error' }));
    } finally {
      setLoadingStatuses(prev => ({ ...prev, [returnId]: false }));
      setFetchingReturnStatusId(null); // Clear the fetching indicator
    }
  }, []); // Dependencies: useCallback needs an empty dependency array if it doesn't rely on component state/props that change

  // Function to fetch statuses for all visible returned orders ONCE
  const fetchAllVisibleReturnStatuses = useCallback(async () => {
    if (fetchingAllStatuses) return; // Prevent concurrent fetches
    console.log("Attempting to fetch all visible return statuses...");
    const ordersToFetch = returnedOrders.filter(o => o.sendcloud_return_id && !returnStatuses[o.sendcloud_return_id]);
    
    if (ordersToFetch.length === 0) {
      console.log("No new return statuses to fetch.");
      return;
    }

    setFetchingAllStatuses(true);
    const promises = ordersToFetch.map(order => fetchSingleReturnStatus(order.sendcloud_return_id));
    
    try {
      await Promise.allSettled(promises); // Wait for all fetches to complete (settled)
      toast.success('Finished checking return statuses.');
    } catch (error) {
      // This catch might not be strictly necessary with Promise.allSettled 
      // as individual errors are handled in fetchSingleReturnStatus
      console.error("Error during batch status fetch:", error); 
      toast.error('An error occurred while fetching some statuses.');
    } finally {
       setFetchingAllStatuses(false);
    }
  }, [returnedOrders, returnStatuses, fetchSingleReturnStatus, fetchingAllStatuses]); // Dependencies for useCallback

  // Effect to fetch statuses when the 'returnedOrders' tab becomes active and data is loaded
  useEffect(() => {
    if (activeTab === 'returnedOrders' && returnedOrders.length > 0 && !loading) {
      // Fetch statuses only if the tab is active
      fetchAllVisibleReturnStatuses();
    }
    // No cleanup needed here as fetchAllVisibleReturnStatuses has its own guards
  }, [activeTab, returnedOrders, loading, fetchAllVisibleReturnStatuses]); // Dependencies for the effect

  const fetchUpgradeStatus = useCallback(async (order) => {
    const orderId = order.id;
    const shippingId = order.upgrade_shipping_id;
    const trackingNumber = order.upgrade_tracking_number;

    if (!orderId || (!shippingId && !trackingNumber) || loadingUpgradeStatuses[orderId]) {
      return; // Skip if no identifiers or already loading
    }

    setLoadingUpgradeStatuses(prev => ({ ...prev, [orderId]: true }));
    try {
      // Construct query params
      const queryParams = new URLSearchParams({
          orderId: orderId, // Pass orderId for DB update
      });
      if (shippingId) queryParams.set('shippingId', shippingId);
      if (trackingNumber) queryParams.set('trackingNumber', trackingNumber);
      
      const response = await fetch(`/api/shipments/get-status?${queryParams.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch upgrade status (${response.status})`);
      }
      const data = await response.json();
      
      // Update local state directly (API handles DB update)
      setUpgradeStatuses(prev => ({ ...prev, [orderId]: data.status }));
      // Update the main orders state as well
      setAllOrders(prevOrders => prevOrders.map(o => 
          o.id === orderId ? { ...o, upgrade_status: data.status } : o
      ));

    } catch (error) {
      console.error(`Error fetching upgrade status for ${orderId}:`, error);
      toast.error(`Failed to fetch upgrade status for order ${orderId}.`);
      // Optionally set error state: setUpgradeStatuses(prev => ({ ...prev, [orderId]: 'Error' }));
    } finally {
      setLoadingUpgradeStatuses(prev => ({ ...prev, [orderId]: false }));
    }
  }, [loadingUpgradeStatuses]);

  const fetchAllUpgradeOrderStatuses = useCallback(async () => {
    if (fetchingAllUpgradeStatuses) return; 
    setFetchingAllUpgradeStatuses(true);
    const toastId = toast.loading('Fetching upgrade shipment statuses...');

    const promises = upgradedOrders
      .filter(order => 
          (order.upgrade_shipping_id || order.upgrade_tracking_number) && // Check if identifiers exist
          !loadingUpgradeStatuses[order.id] // Ensure not already loading
      )
      .map(order => fetchUpgradeStatus(order));

    try {
      await Promise.all(promises);
      toast.success('Upgrade statuses updated.', { id: toastId });
    } catch (error) {
      console.error("Error fetching all upgrade statuses:", error);
      toast.error('Some upgrade statuses could not be fetched.', { id: toastId });
    } finally {
      setFetchingAllUpgradeStatuses(false);
    }
  }, [upgradedOrders, loadingUpgradeStatuses, fetchUpgradeStatus, fetchingAllUpgradeStatuses]);

  useEffect(() => {
    if (activeTab === 'upgradedOrders' && upgradedOrders.length > 0) {
       const ordersToFetch = upgradedOrders.filter(order => 
         order.upgrade_shipping_id && 
         !upgradeStatuses[order.id] &&
         !loadingUpgradeStatuses[order.id]
       );
       if (ordersToFetch.length > 0) {
           fetchAllUpgradeOrderStatuses();
       }
    }
  }, [upgradedOrders, activeTab, upgradeStatuses, loadingUpgradeStatuses, fetchAllUpgradeOrderStatuses]);

  // Function to fetch or view the label URL via proxy
  const fetchAndViewLabel = useCallback(async (orderId) => {
    const order = allOrders.find(o => o.id === orderId);
    console.log('Table button: Found order in allOrders:', order); // Log found order
    if (!order) {
      toast.error("Order not found in current table data."); // Clarify error
      return;
    }

    // We only need the parcel ID to use the download proxy
    console.log('Table button: Parcel ID found:', order.sendcloud_return_parcel_id); // Log parcel ID
    if (order.sendcloud_return_parcel_id) {
      const parcelId = order.sendcloud_return_parcel_id;
      const proxyUrl = `/api/returns/download-label/${parcelId}`;
      console.log(`Opening label via proxy URL from table button: ${proxyUrl}`);
      window.open(proxyUrl, '_blank'); 
    } else {
      // If no Parcel ID, we can't fetch the label
      toast.error('Cannot view/get label: Missing Sendcloud Parcel ID in table data.'); // Clarify error
    }
  }, [allOrders]);

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
      className: 'w-[250px]', // Wider for 3 buttons
      actions: [
        {
          label: 'Open',
          handler: handleOpenOrder,
          variant: 'outline',
          size: 'sm'
        },
        {
          label: 'Check Status',
          handler: (orderId) => {
            const order = allOrders.find(o => o.id === orderId);
            if (order && order.sendcloud_return_id) {
              fetchSingleReturnStatus(order.sendcloud_return_id);
            } else {
              toast.error('No Sendcloud Return ID found for this order.');
            }
          },
          variant: 'ghost',
          size: 'sm',
          condition: (order) => !!order.sendcloud_return_id,
          disabled: (order) => loadingStatuses[order.sendcloud_return_id] || fetchingReturnStatusId === order.id
        },
        {
          label: 'View/Get Label',
          handler: fetchAndViewLabel,
          variant: 'outline',
          size: 'sm',
          condition: (order) => !!order.sendcloud_return_parcel_id,
        },
      ]
    },
    { id: 'id', label: 'Order ID', type: 'link', linkPrefix: '/orders/', className: 'w-[120px] whitespace-nowrap border-r' },
    { id: 'name', label: 'Customer', className: 'w-[160px] border-r whitespace-nowrap overflow-hidden text-ellipsis' }, // Adjusted width
    {
      id: 'return_status',
      label: 'Return Status',
      className: 'w-[160px] whitespace-nowrap border-r',
      type: 'custom',
      render: (order) => {
        const returnId = order.sendcloud_return_id;
        if (!returnId) return <span className="text-gray-400">N/A</span>;

        const status = returnStatuses[returnId];
        const isLoading = loadingStatuses[returnId];

        if (isLoading) {
          // More specific loading indicator
          return <span className="text-gray-500 italic flex items-center"><RefreshCw className="animate-spin h-3 w-3 mr-1" /> Checking...</span>;
        }

        if (status) {
            let badgeVariant = 'secondary'; // Default/unknown status
            const lowerStatus = status.toLowerCase();
            // More specific status matching based on typical Sendcloud return statuses
            if (lowerStatus.includes('delivered') || lowerStatus.includes('received')) badgeVariant = 'success';
            else if (lowerStatus.includes('transit') || lowerStatus.includes('shipping')) badgeVariant = 'default'; // Use default blue for in transit
            else if (lowerStatus.includes('announced') || lowerStatus.includes('created')) badgeVariant = 'outline';
            else if (lowerStatus.includes('cancelled') || lowerStatus.includes('error')) badgeVariant = 'destructive';
            else if (status === 'Status Unknown') badgeVariant = 'secondary'; // Specific case for our handling

            return <Badge variant={badgeVariant}>{status}</Badge>;
        }

        // Show N/A if status hasn't been fetched yet
        return <span className="text-gray-400">N/A</span>;
      }
    },
    { id: 'sendcloud_return_id', label: 'Return ID', className: 'w-[150px] whitespace-nowrap border-r'}, // Show Return ID
    // { id: 'sendcloud_return_parcel_id', label: 'Parcel ID', className: 'w-[150px] whitespace-nowrap border-r'}, // Optional: Show Parcel ID if needed
    { id: 'order_pack', label: 'Pack', className: 'w-[100px] whitespace-nowrap border-r'},
    { id: 'updated_at', label: 'Return Date', type: 'date', className: 'w-[120px] whitespace-nowrap border-r' }, // Should this be a specific return date?
  ];

  // Define columns for the "Upgraded Orders" table
  const upgradedOrdersColumns = [
    {
      id: 'actions',
      label: 'Actions',
      type: 'actions',
      className: 'w-[200px]',
      actions: [
        { label: 'Open', handler: handleOpenOrder, variant: 'outline' },
        { 
          label: 'Track Return', 
          handler: handleTrackReturn, 
          variant: 'outline', 
          condition: (o) => !!o.sendcloud_return_parcel_id 
        },
        {
          label: 'Update Status',
          handler: (orderId) => {
              const orderToUpdate = upgradedOrders.find(o => o.id === orderId);
              if (orderToUpdate) fetchUpgradeStatus(orderToUpdate);
          },
          variant: 'ghost',
          className: 'px-1 py-1 h-auto',
          loading: (orderId) => loadingUpgradeStatuses[orderId],
          renderLoading: () => <RefreshCw className="h-4 w-4 animate-spin" />,
          renderLabel: () => <RefreshCw className="h-4 w-4" />,
          condition: (o) => !!(o.upgrade_shipping_id || o.upgrade_tracking_number),
        }
      ]
    },
    { id: 'id', label: 'Order ID', type: 'link', linkPrefix: '/orders/', className: 'w-[100px] whitespace-nowrap border-r' },
    { id: 'name', label: 'Customer', className: 'w-[80px] border-r border-none whitespace-nowrap overflow-hidden text-ellipsis' },
    { id: 'sendcloud_return_parcel_id', label: 'Return ID', className: 'w-[120px] whitespace-nowrap border-r' },
    { id: 'upgrade_shipping_id', label: 'Upgrade Ship ID', className: 'w-[120px] whitespace-nowrap border-r' },
    { id: 'upgrade_tracking_number', label: 'Upgrade Tracking', className: 'w-[150px] whitespace-nowrap border-r overflow-hidden text-ellipsis' },
    { 
      id: 'upgrade_status', 
      label: 'Upgrade Status', 
      className: 'w-[160px] whitespace-nowrap border-r', 
      type: 'custom',
      render: (order) => {
          const status = order.upgrade_status || upgradeStatuses[order.id];
          const isLoading = loadingUpgradeStatuses[order.id];

          if (isLoading) {
            return <span className="text-gray-500 italic">Checking...</span>;
          }
          if (status) {
              let badgeVariant = 'secondary';
              if (status.toLowerCase().includes('delivered')) badgeVariant = 'success';
              if (status.toLowerCase().includes('cancelled') || status.toLowerCase().includes('error')) badgeVariant = 'destructive';
              if (status.toLowerCase().includes('created') || status.toLowerCase().includes('announced') || status.toLowerCase().includes('label')) badgeVariant = 'outline';
              return <Badge variant={badgeVariant}>{status}</Badge>;
          }
          return <span className="text-gray-400">N/A</span>;
      }
    },
    { id: 'updated_at', label: 'Last Updated', type: 'date', className: 'w-[120px] whitespace-nowrap border-r' },
  ];

  // Add console logs for debugging
  console.log("[ReturnsPage Render] All Orders Fetched:", allOrders);
  console.log("[ReturnsPage Render] Filtered Delivered (Create Return Tab):", ordersForCreateReturn);
  console.log("[ReturnsPage Render] Filtered Returned (Returned Orders Tab):", returnedOrders);
  console.log("[ReturnsPage Render] isUpgradeModalOpen:", isUpgradeModalOpen, "orderForUpgrade:", !!orderForUpgrade);

  const handleOrderCreated = () => {
    // Handle what happens after an order is potentially created via the modal
    // For now, just close the modal. We might want to refresh data later if needed.
    setIsNewOrderModalOpen(false);
    // Optional: Refresh return-related data if the new order impacts it
    // loadOrders(); 
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Returns and Upgrades Management</h1>
          <p className="text-gray-600">Create and manage return labels for delivered orders</p>
        </div>
        <div>
          <Button 
            onClick={() => setIsNewOrderModalOpen(true)}
            variant="default"
          >
            New Order
          </Button>
        </div>
      </header>

      <div className="mb-6">
        <OrderSearch />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="createReturns">Orders Delivered ({ordersForCreateReturn.length})</TabsTrigger>
          <TabsTrigger value="returnedOrders">Orders Returned ({returnedOrders.length})</TabsTrigger>
          <TabsTrigger value="upgradedOrders">Upgraded Orders ({upgradedOrders.length})</TabsTrigger>
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
                onClick={fetchAllVisibleReturnStatuses}
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

        <TabsContent value="upgradedOrders">
           <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">Orders that have had an upgrade processed.</p>
              <Button 
                onClick={fetchAllUpgradeOrderStatuses}
                disabled={fetchingAllUpgradeStatuses}
                size="sm"
              >
                {fetchingAllUpgradeStatuses ? (
                   <><div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></div> Fetching All...</>
                ) : (
                   'Fetch All Upgrade Statuses'
                )}
              </Button>
           </div>
           <ReturnsTable
             orders={upgradedOrders}
             loading={loading}
             columns={upgradedOrdersColumns}
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

      <NewOrderModal 
        isOpen={isNewOrderModalOpen} 
        onClose={() => setIsNewOrderModalOpen(false)}
        onOrderCreated={handleOrderCreated}
      />
    </div>
  );
} 