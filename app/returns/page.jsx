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
import { getReasonTagStyle } from '../components/EnhancedOrdersTable';

export default function ReturnsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabase();
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [orderPackLists, setOrderPackLists] = useState([]);
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
  const [loadingPacks, setLoadingPacks] = useState(true);

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
    loadData();
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (loading || loadingPacks) return;
    filterOrders();
  }, [decodedQuery, allOrders, orderPackLists, loading, loadingPacks]);

  const loadData = async () => {
    setLoading(true);
    setLoadingPacks(true);
    try {
      const [ordersResult, packsResult] = await Promise.allSettled([
        supabase
          .from('orders')
          .select('*')
          .or('status.in.("delivered","Delivered"),manual_instruction.eq.NO ACTION REQUIRED,manual_instruction.eq.DELIVERED,sendcloud_return_id.not.is.null,sendcloud_return_parcel_id.not.is.null,created_via.eq.returns_portal')
          .order('updated_at', { ascending: false }),
        supabase
          .from('order_pack_lists')
          .select('id, label')
      ]);

      if (ordersResult.status === 'fulfilled') {
        const { data, error } = ordersResult.value;
        if (error) throw error;
        const processedData = (data || []).map(order => {
          if (order.manual_instruction?.toLowerCase() === 'delivered' || order.manual_instruction?.toLowerCase() === 'no action required') {
            return { ...order, status: 'Delivered' }; 
          }
          return order;
        });
        console.log("[loadData] Fetched Orders (Processed):", processedData);
        setAllOrders(processedData);
      } else {
        console.error('Error loading orders:', ordersResult.reason);
        toast.error('Failed to load orders');
        setAllOrders([]);
      }

      if (packsResult.status === 'fulfilled') {
        const { data, error } = packsResult.value;
        if (error) {
          console.error('Error fetching order pack lists:', error);
          toast.error('Failed to load order pack lists.');
          setOrderPackLists([]);
        } else {
          setOrderPackLists(data || []);
        }
      } else {
        console.error('Error loading order pack lists:', packsResult.reason);
        toast.error('Failed to load order pack lists.');
        setOrderPackLists([]);
      }

    } catch (error) {
      console.error('Error loading page data:', error);
      toast.error(`Failed to load page data: ${error.message}`);
      setAllOrders([]);
      setOrderPackLists([]);
    } finally {
      setLoading(false);
      setLoadingPacks(false);
    }
  };

  const filterOrders = () => {
    let filtered = allOrders;
    if (decodedQuery) {
      const lowercaseQuery = decodedQuery.toLowerCase();
      filtered = allOrders.filter(order => {
        const packLabel = orderPackLists.find(pack => pack.id === order.order_pack_list_id)?.label || '';
        
        return (
          (order.id && order.id.toLowerCase().includes(lowercaseQuery)) ||
          (order.name && order.name.toLowerCase().includes(lowercaseQuery)) ||
          (order.email && order.email.toLowerCase().includes(lowercaseQuery)) ||
          (order.phone && order.phone.toLowerCase().includes(lowercaseQuery)) ||
          (order.shipping_address_line1 && order.shipping_address_line1.toLowerCase().includes(lowercaseQuery)) ||
          (order.shipping_address_city && order.shipping_address_city.toLowerCase().includes(lowercaseQuery)) ||
          (order.shipping_address_postal_code && order.shipping_address_postal_code.toLowerCase().includes(lowercaseQuery)) ||
          (order.shipping_address_country && order.shipping_address_country.toLowerCase().includes(lowercaseQuery)) ||
          (packLabel && packLabel.toLowerCase().includes(lowercaseQuery)) ||
          (order.tracking_number && order.tracking_number.toLowerCase().includes(lowercaseQuery)) ||
          (order.sendcloud_return_id && order.sendcloud_return_id.toString().includes(lowercaseQuery)) ||
          (order.sendcloud_return_parcel_id && order.sendcloud_return_parcel_id.toString().includes(lowercaseQuery))
        );
      });
    }
    setFilteredOrders(filtered);
  };

  const ordersForCreateReturn = filteredOrders.filter(o => 
    (
      o.status?.toLowerCase() === 'delivered' || 
      o.manual_instruction === 'NO ACTION REQUIRED' || 
      o.manual_instruction === 'DELIVERED' ||
      o.created_via === 'returns_portal'
    ) &&
    !o.sendcloud_return_id && !o.sendcloud_return_parcel_id &&
    !o.upgrade_shipping_id
  );
  const returnedOrders = filteredOrders.filter(o => 
    (o.sendcloud_return_id || o.sendcloud_return_parcel_id) &&
    !o.upgrade_shipping_id
  );
  const upgradedOrders = filteredOrders.filter(o => 
    o.upgrade_shipping_id
  );

  const handleOpenOrder = (orderId) => {
    const orderToOpen = allOrders.find(order => order.id === orderId);
    if (orderToOpen) {
      setSelectedOrder(orderToOpen);
      setIsModalOpen(true);
    }
  };

  const createReturnLabelStandard = async (orderId, returnFromAddress, returnToAddress, parcelWeight, returnReason) => {
    setCreatingLabelOrderId(orderId);
    const toastId = toast.loading('Creating return label...');
    try {
      const response = await fetch('/api/returns/create-label', {
        method: 'POST',
        headers: {'Content-Type': 'application/json',},
        body: JSON.stringify({ 
          orderId, 
          returnFromAddress, 
          returnToAddress, 
          parcelWeight, 
          returnReason
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create return label');

      setAllOrders(prevOrders => prevOrders.map(order =>
          order.id === orderId
          ? {
              ...order,
              sendcloud_return_id: data.sendcloud_return_id,
              sendcloud_return_parcel_id: data.sendcloud_return_parcel_id,
              sendcloud_return_label_url: data.sendcloud_return_label_url,
              sendcloud_return_reason: returnReason,
              updated_at: new Date().toISOString()
             }
          : order
      ));

      const successMessage = data.sendcloud_return_label_url
        ? <>Return initiated successfully! <a href={data.sendcloud_return_label_url} target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-blue-700">View Label</a></>
        : (data.message || 'Return initiated successfully');

      toast.success(successMessage, { id: toastId, duration: 6000 });
      handleCloseReturnModal();

    } catch (error) {
      console.error('Error creating return label:', error);
      toast.error(`${error.message}`, { id: toastId });
    } finally {
      setCreatingLabelOrderId(null);
    }
  };

  const handleOpenReturnModal = (orderId) => {
    const order = allOrders.find(o => o.id === orderId);
    if (order) {
      let initialParcelItems = [];
      const countriesRequiringCustoms = ['GB', 'CH', 'US', 'CA', 'AU', 'NO']; // Keep in sync with backend
      const originalShippingCountry = (typeof order.shipping_address === 'object' ? order.shipping_address.country : order.shipping_address_country)?.toUpperCase();

      if (originalShippingCountry && countriesRequiringCustoms.includes(originalShippingCountry)) {
        try {
          const lineItems = typeof order.line_items === 'string'
            ? JSON.parse(order.line_items)
            : (Array.isArray(order.line_items) ? order.line_items : []);

          if (lineItems && lineItems.length > 0) {
            const totalOriginalWeight = parseFloat(order.weight) || 1.0;
            let totalQuantityFromLineItems = lineItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
            if (totalQuantityFromLineItems === 0) totalQuantityFromLineItems = 1;

            initialParcelItems = lineItems.map(item => ({
              description: (item.description ? item.description.substring(0, 50) : 'Product'),
              quantity: item.quantity || 1,
              // Weight display here is based on original order for informational purpose
              weight: ((totalOriginalWeight / totalQuantityFromLineItems) * (item.quantity || 1)).toFixed(3), 
              value: (item.amount || 0).toFixed(2),
              hs_code: item.hs_code || '90151000', // Original HS code or default
              origin_country: item.origin_country || 'FR', // Original origin country or default
              sku: item.sku || ''
            }));
          }
        } catch (e) {
          console.error("Error preparing initialParcelItems for modal:", e);
          toast.error("Could not prepare item details for display.");
        }
      }

      setOrderForReturn({...order, initialParcelItems }); // Add items to the state
      setIsReturnConfirmModalOpen(true);
    } else {
      toast.error("Could not find order details.");
    }
  };

  const handleCloseReturnModal = () => {
    setIsReturnConfirmModalOpen(false);
    setOrderForReturn(null);
  };

  const handleConfirmReturnStandard = async (orderId, returnFromAddress, returnToAddress, parcelWeight, returnReason) => {
    await createReturnLabelStandard(orderId, returnFromAddress, returnToAddress, parcelWeight, returnReason);
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
                    sendcloud_return_label_url: data.sendcloud_return_label_url,
                    updated_at: new Date().toISOString()
                  }
                : order
            )
        );

        const successMessage = data.sendcloud_return_label_url
          ? <>Return label created! <a href={data.sendcloud_return_label_url} target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-blue-700">View Label</a></>
          : (data.message || 'Return label for original item created!');

        toast.success(successMessage, { id: toastId, duration: 6000 });

    } catch (error) {
        console.error('Error creating return label during upgrade:', error);
        toast.error(`Failed to create return label: ${error.message || 'Unknown error'}`, { id: toastId });
    } finally {
        setUpgradingOrderId(null);
    }
  };

  const handleCreateNewLabelForUpgrade = async (orderId, newLabelDetails) => {
    console.log(`Requesting new label for upgraded order ${orderId} with details:`, newLabelDetails);
    setUpgradingOrderId(orderId);
    const mainToastId = toast.loading('Starting upgrade process...'); 

    try {
       // 1. Update Order Pack Details directly using Supabase client
       toast.loading('Updating order pack details...', { id: mainToastId });
       const packUpdatePayload = {
           order_pack_list_id: newLabelDetails.order_pack_list_id,
           order_pack_quantity: newLabelDetails.quantity,
           weight: newLabelDetails.weight,
           updated_at: new Date().toISOString(),
       };
       console.log("[Upgrade] Payload for Pack DB Update:", packUpdatePayload);

       const { data: packUpdateData, error: packUpdateError } = await supabase
         .from('orders')
         .update(packUpdatePayload)
         .eq('id', orderId)
         .select('id') // Only select necessary fields if needed later
         .single();

       if (packUpdateError) {
           console.error("Database update error for pack details:", packUpdateError);
           throw new Error(packUpdateError.message || 'Failed to update order pack details');
       }
       console.log("[Upgrade] Pack details DB Update Result:", packUpdateData); // Log success

       // 2. Create New Shipping Label (Existing API Call)
       toast.loading('Order pack updated. Creating new shipping label...', { id: mainToastId });
       const labelResponse = await fetch('/api/orders/create-shipping-label', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ orderId }),
       });
       const labelData = await labelResponse.json();
       if (!labelResponse.ok) {
           console.error("Label creation failed after order update:", labelData.error);
           // Don't necessarily throw, allow saving pack update, but report error
           toast.error(`Order pack updated, but failed to create new shipping label: ${labelData.error || 'Unknown error'}. Please create label manually.`, { id: mainToastId, duration: 6000 });
           // Update local state with just the pack changes from the payload
           setAllOrders(prevOrders => prevOrders.map(order =>
               order.id === orderId ? { ...order, ...packUpdatePayload } : order
           ));
           handleCloseUpgradeModal();
           return; // Stop processing if label creation failed
       }

       // 3. Prepare data for final database update (including new upgrade_ fields)
       toast.loading('New label created. Saving upgrade details...', { id: mainToastId });
       // Combine the pack update payload (which already has updated_at) with label data
       const finalUpdatePayload = {
           ...packUpdatePayload, 
           upgrade_shipping_id: labelData.shipping_id,
           upgrade_tracking_number: labelData.tracking_number,
           upgrade_tracking_link: labelData.tracking_link,
           upgrade_status: labelData.status || 'Label Created',
           // Overwrite updated_at just in case label creation took time
           updated_at: new Date().toISOString(), 
       };
       console.log("[Upgrade] Payload for Final DB Update:", finalUpdatePayload); // Log payload

       // 4. Update Database with Upgrade Fields using Supabase client
       // Note: We update again to add the upgrade_ fields. Alternatively, 
       // create-shipping-label API could be modified to accept and update these.
       const { data: finalDbUpdateResult, error: finalDbUpdateError } = await supabase
         .from('orders')
         .update(finalUpdatePayload)
         .eq('id', orderId)
         .select('id') // Select only id to confirm update
         .single();

       if (finalDbUpdateError) {
           console.error("Database update error during final upgrade save:", finalDbUpdateError);
           toast.error(`New label created, but failed to save final upgrade details to DB: ${finalDbUpdateError.message}. Please check order manually.`, { id: mainToastId, duration: 6000 });
           // Update local state optimistically with what we have (pack + label info)
           setAllOrders(prevOrders => prevOrders.map(order => {
             if (order.id === orderId) {
               return { 
                 ...order, 
                 ...packUpdatePayload, // Include pack changes
                 upgrade_shipping_id: labelData.shipping_id, // Still show label info
                 upgrade_tracking_number: labelData.tracking_number,
                 upgrade_tracking_link: labelData.tracking_link,
                 upgrade_status: labelData.status || 'Label Created (DB Save Failed)'
               };
             }
             return order;
           }));
           handleCloseUpgradeModal();
           return; 
       }
       console.log("[Upgrade] Final DB Update Result (Confirmation):"); // Log confirmation

       // 5. Success: Manually merge the final update payload into the local state
       setAllOrders(prevOrders =>
         prevOrders.map(order => {
           if (order.id === orderId) {
             // Merge the existing order with the payload we sent to the DB
             const updatedOrder = { ...order, ...finalUpdatePayload };
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

  const fetchSingleReturnStatus = useCallback(async (returnId) => {
    if (!returnId) return;
    console.log(`Fetching status for return ID: ${returnId}`);
    setLoadingStatuses(prev => ({ ...prev, [returnId]: true }));
    setFetchingReturnStatusId(returnId);
    try {
      const response = await fetch(`/api/returns/get-status?returnId=${returnId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status'); 
      }
      setReturnStatuses(prev => ({ ...prev, [returnId]: data.status }));
      toast.success(`Status updated for return ${returnId}: ${data.status}`);
    } catch (error) {
      console.error(`Error fetching return status for ${returnId}:`, error);
      toast.error(`Could not fetch status for return ${returnId}: ${error.message}`);
    } finally {
      setLoadingStatuses(prev => ({ ...prev, [returnId]: false }));
      setFetchingReturnStatusId(null);
    }
  }, []);

  const fetchAllVisibleReturnStatuses = useCallback(async () => {
    if (fetchingAllStatuses) return;
    console.log("Attempting to fetch all visible return statuses...");
    const ordersToFetch = returnedOrders.filter(o => {
      const returnId = o.sendcloud_return_id;
      if (!returnId) return false;
      
      // Check database status first, then local state as fallback
      const dbStatus = o.sendcloud_return_status;
      const localStatus = returnStatuses[returnId];
      const status = dbStatus || localStatus;
      
      if (!status) return true; // No status known, fetch it
      
      const lower = status.toLowerCase();
      // Exclude statuses that indicate final state or no further checking needed
      return !lower.includes('delivered') && 
             !lower.includes('delivery') && 
             !lower.includes('cancelled') &&
             !lower.includes('ready-to-send') &&
             !lower.includes('ready to send') &&
             !lower.includes('received') &&
             !lower.includes('completed') &&
             !lower.includes('finished');
    });
    
    if (ordersToFetch.length === 0) {
      console.log("No new return statuses to fetch.");
      return;
    }

    setFetchingAllStatuses(true);
    const promises = ordersToFetch.map(order => fetchSingleReturnStatus(order.sendcloud_return_id));
    
    try {
      await Promise.allSettled(promises);
      toast.success('Finished checking return statuses.');
    } catch (error) {
      console.error("Error during batch status fetch:", error); 
      toast.error('An error occurred while fetching some statuses.');
    } finally {
       setFetchingAllStatuses(false);
    }
  }, [returnedOrders, returnStatuses, fetchSingleReturnStatus, fetchingAllStatuses]);

  useEffect(() => {
    if (activeTab === 'returnedOrders' && returnedOrders.length > 0 && !loading) {
      fetchAllVisibleReturnStatuses();
    }
  }, [activeTab, returnedOrders, loading, fetchAllVisibleReturnStatuses]);

  const fetchUpgradeStatus = useCallback(async (order) => {
    const orderId = order.id;
    const shippingId = order.upgrade_shipping_id;
    const trackingNumber = order.upgrade_tracking_number;

    if (!orderId || (!shippingId && !trackingNumber) || loadingUpgradeStatuses[orderId]) {
      return;
    }

    setLoadingUpgradeStatuses(prev => ({ ...prev, [orderId]: true }));
    try {
      const queryParams = new URLSearchParams({
          orderId: orderId,
      });
      if (shippingId) queryParams.set('shippingId', shippingId);
      if (trackingNumber) queryParams.set('trackingNumber', trackingNumber);
      
      const response = await fetch(`/api/shipments/get-status?${queryParams.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch upgrade status (${response.status})`);
      }
      const data = await response.json();
      
      setUpgradeStatuses(prev => ({ ...prev, [orderId]: data.status }));
      setAllOrders(prevOrders => prevOrders.map(o => 
          o.id === orderId ? { ...o, upgrade_status: data.status } : o
      ));

    } catch (error) {
      console.error(`Error fetching upgrade status for ${orderId}:`, error);
      toast.error(`Failed to fetch upgrade status for order ${orderId}.`);
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
          (order.upgrade_shipping_id || order.upgrade_tracking_number) &&
          !loadingUpgradeStatuses[order.id]
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

  const fetchAndViewLabel = useCallback(async (orderId) => {
    const order = allOrders.find(o => o.id === orderId);
    console.log('Table button: Found order in allOrders:', order);
    if (!order) {
      toast.error("Order not found in current table data.");
      return;
    }

    console.log('Table button: Parcel ID found:', order.sendcloud_return_parcel_id);
    if (order.sendcloud_return_parcel_id) {
      const parcelId = order.sendcloud_return_parcel_id;
      const proxyUrl = `/api/returns/download-label/${parcelId}`;
      console.log(`Opening label via proxy URL from table button: ${proxyUrl}`);
      window.open(proxyUrl, '_blank'); 
    } else {
      toast.error('Cannot view/get label: Missing Sendcloud Parcel ID in table data.');
    }
  }, [allOrders]);

  const getOrderPackLabel = useCallback((order) => {
    return orderPackLists.find(pack => pack.id === order.order_pack_list_id)?.label || 'N/A';
  }, [orderPackLists]);

  const createReturnColumns = [
    {
      id: 'actions',
      label: 'Actions',
      type: 'actions',
      className: 'whitespace-nowrap',
      actions: [
        {
          label: 'Open',
          handler: handleOpenOrder, 
          variant: 'outline', 
          size: 'sm'
        },
        { 
          label: (order) => creatingLabelOrderId === order.id ? 'Creating...' : 'Create Return', 
          handler: handleOpenReturnModal, 
          variant: 'outline', 
          size: 'sm',
          loading: (orderId) => creatingLabelOrderId === orderId,
          disabled: (orderId) => !!creatingLabelOrderId,
        },
        {
          label: 'Upgrade Order',
          handler: handleOpenUpgradeModal,
          variant: 'secondary',
          size: 'sm',
          loading: (orderId) => upgradingOrderId === orderId,
          disabled: (orderId) => !!upgradingOrderId,
        }
      ]
    },
    // { id: 'id', label: 'Order ID', type: 'link', linkPrefix: '/orders/', className: 'w-[110px] whitespace-nowrap' }, 
    { id: 'name', label: 'Customer', className: 'w-[200px] max-w-[200px] whitespace-nowrap truncate' },
    { 
      id: 'status', 
      label: 'Status', 
      className: 'w-[120px] whitespace-nowrap',
      type: 'custom',
      render: (order) => {
        const displayStatus = order.manual_instruction || order.status;
        let badgeVariant = 'secondary';
        const lowerStatus = displayStatus?.toLowerCase();
        if (lowerStatus === 'delivered') badgeVariant = 'success';
        else if (lowerStatus === 'delivery') badgeVariant = 'success';
        else if (lowerStatus === 'pending') badgeVariant = 'outline';
        else if (lowerStatus === 'processing') badgeVariant = 'default';
        else if (lowerStatus === 'cancelled') badgeVariant = 'destructive';

        return displayStatus ? <Badge variant={badgeVariant}>{displayStatus}</Badge> : <span className="text-gray-400">N/A</span>;
      } 
    },
    { id: 'reason_for_shipment', label: 'Type', className: 'w-[120px] whitespace-nowrap text-center', type: 'custom', render: (order) => {
        const reason = order.reason_for_shipment;
        if (!reason) return <span className="text-xs text-gray-400">N/A</span>;
        const styleClasses = getReasonTagStyle(reason); // getReasonTagStyle should be available in this scope
        return <span className={styleClasses}>{reason.charAt(0).toUpperCase() + reason.slice(1)}</span>;
      }
    },
    { id: 'shipping_address', label: 'Shipping Address', className: 'w-[250px] max-w-[250px] whitespace-nowrap', type: 'custom', render: (order) => formatAddressForTable(order, isMounted) },
    { 
      id: 'order_pack_list_id',
      label: 'Pack', 
      className: 'w-[120px] whitespace-nowrap truncate',
      type: 'custom',
      render: getOrderPackLabel
    },
    { id: 'tracking_number', label: 'Tracking', className: 'w-[180px] whitespace-nowrap truncate'},
    { id: 'created_at', label: 'Created', type: 'date', className: 'w-[120px] whitespace-nowrap' },
  ];

  const returnedOrdersColumns = [
    {
      id: 'actions',
      label: 'Actions',
      type: 'actions',
      className: 'whitespace-nowrap',
      actions: [
        {
          label: 'Open',
          handler: handleOpenOrder,
          variant: 'outline',
          size: 'sm'
        },
        {
          label: 'Check Status',
          handler: (orderId, order) => {
            if (order && order.sendcloud_return_id) {
              fetchSingleReturnStatus(order.sendcloud_return_id);
            } else {
              toast.error('No Sendcloud Return ID found for this order.');
            }
          },
          variant: 'ghost',
          size: 'sm',
          condition: (order) => !!order.sendcloud_return_id,
          loading: (orderId, order) => loadingStatuses[order.sendcloud_return_id],
          disabled: (orderId, order) => loadingStatuses[order.sendcloud_return_id] || fetchingReturnStatusId === order.id 
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
    // { id: 'id', label: 'Order ID', type: 'link', linkPrefix: '/orders/', className: 'w-[110px] whitespace-nowrap' },
    {
      id: 'return_type',
      label: 'Type',
      className: 'w-[130px] whitespace-nowrap',
      type: 'custom',
      render: (order) => {
        const isReturnOnly = order.created_via === 'returns_portal';
        return (
          <Badge variant={isReturnOnly ? 'secondary' : 'outline'}>
            {isReturnOnly ? 'Return Only' : 'Original Order'}
          </Badge>
        );
      }
    },
    { id: 'name', label: 'Customer', className: 'w-[110px] max-w-[110px] whitespace-nowrap truncate' },
    {
      id: 'return_status',
      label: 'Return Status',
      className: 'w-[160px] whitespace-nowrap',
      type: 'custom',
      render: (order) => {
        const returnId = order.sendcloud_return_id;
        if (!returnId) return <span className="text-gray-400">N/A</span>;
        
        // Check database status first, then local state as fallback
        const dbStatus = order.sendcloud_return_status;
        const localStatus = returnStatuses[returnId];
        const status = dbStatus || localStatus;
        
        const isLoading = loadingStatuses[returnId];
        if (isLoading) {
          return <span className="text-gray-500 italic flex items-center"><RefreshCw className="animate-spin h-3 w-3 mr-1" /> Checking...</span>;
        }
        if (status) {
            let badgeVariant = 'secondary';
            const lowerStatus = status.toLowerCase();
            if (lowerStatus.includes('delivered') || lowerStatus.includes('delivery') || lowerStatus.includes('received')) badgeVariant = 'success';
            else if (lowerStatus.includes('transit') || lowerStatus.includes('shipping') || lowerStatus.includes('pending') || lowerStatus.includes('processing')) badgeVariant = 'default';
            else if (lowerStatus.includes('announced') || lowerStatus.includes('created')) badgeVariant = 'outline';
            else if (lowerStatus.includes('cancelled') || lowerStatus.includes('error')) badgeVariant = 'destructive';
            else if (status === 'Status Unknown') badgeVariant = 'secondary';
            return <Badge variant={badgeVariant}>{status}</Badge>;
        }
        return <span className="text-gray-400">N/A</span>;
      }
    },
    { id: 'sendcloud_return_id', label: 'Return ID', className: 'w-[150px] whitespace-nowrap truncate'},
    { 
      id: 'order_pack_list_id', 
      label: 'Original Pack', 
      className: 'w-[100px] max-w-[100px] whitespace-nowrap truncate',
      type: 'custom',
      render: getOrderPackLabel
    },
    { id: 'return_created_at', label: 'Created At', type: 'date', className: 'w-[120px] whitespace-nowrap' },
  ];

  const upgradedOrdersColumns = [
    {
      id: 'actions',
      label: 'Actions',
      type: 'actions',
      className: 'whitespace-nowrap',
      actions: [
        { label: 'Open', handler: handleOpenOrder, variant: 'outline', size: 'sm' },
        { 
          label: 'Track Return', 
          handler: handleTrackReturn, 
          variant: 'outline', 
          size: 'sm',
          condition: (o) => !!o.sendcloud_return_parcel_id 
        },
        {
          label: 'Update Status',
          handler: (orderId, order) => {
              if (orderToUpdate) fetchUpgradeStatus(orderToUpdate);
          },
          variant: 'ghost',
          size: 'icon',
          className: 'p-1',
          loading: (orderId, order) => loadingUpgradeStatuses[order.id],
          disabled: (orderId, order) => loadingUpgradeStatuses[order.id],
          renderLoading: () => <RefreshCw className="h-4 w-4 animate-spin" />,
          renderLabel: () => <RefreshCw className="h-4 w-4" />,
          condition: (o) => !!(o.upgrade_shipping_id || o.upgrade_tracking_number),
        }
      ]
    },
    { id: 'id', label: 'Order ID', type: 'link', linkPrefix: '/orders/', className: 'w-[110px] whitespace-nowrap' },
    { id: 'name', label: 'Customer', className: 'w-[80px] max-w-[80px] whitespace-nowrap truncate' },
    { id: 'sendcloud_return_parcel_id', label: 'Return Parcel ID', className: 'w-[150px] whitespace-nowrap truncate' },
    { id: 'upgrade_shipping_id', label: 'Upgrade Ship ID', className: 'w-[150px] whitespace-nowrap truncate' },
    { id: 'upgrade_tracking_number', label: 'Upgrade Tracking', className: 'w-[180px] whitespace-nowrap truncate' },
    { 
      id: 'upgrade_status', 
      label: 'Upgrade Status', 
      className: 'w-[160px] whitespace-nowrap', 
      type: 'custom',
      render: (order) => {
          const status = order.upgrade_status || upgradeStatuses[order.id];
          const isLoading = loadingUpgradeStatuses[order.id];
          if (isLoading) {
            return <span className="text-gray-500 italic">Checking...</span>;
          }
          if (status) {
              let badgeVariant = 'secondary';
              if (status.toLowerCase().includes('delivered') || status.toLowerCase().includes('delivery')) badgeVariant = 'success';
              if (status.toLowerCase().includes('cancelled') || status.toLowerCase().includes('error')) badgeVariant = 'destructive';
              if (status.toLowerCase().includes('created') || status.toLowerCase().includes('announced') || status.toLowerCase().includes('label')) badgeVariant = 'outline';
              return <Badge variant={badgeVariant}>{status}</Badge>;
          }
          return <span className="text-gray-400">N/A</span>;
      }
    },
    { 
      id: 'order_pack_list_id', 
      label: 'New Pack', 
      className: 'w-[120px] max-w-[120px] whitespace-nowrap truncate',
      type: 'custom',
      render: getOrderPackLabel
    },
    { id: 'updated_at', label: 'Last Updated', type: 'date', className: 'w-[120px] whitespace-nowrap' },
  ];

  console.log("[ReturnsPage Render] All Orders Fetched:", allOrders);
  console.log("[ReturnsPage Render] Filtered Delivered (Create Return Tab):", ordersForCreateReturn);
  console.log("[ReturnsPage Render] Filtered Returned (Returned Orders Tab):", returnedOrders);
  console.log("[ReturnsPage Render] isUpgradeModalOpen:", isUpgradeModalOpen, "orderForUpgrade:", !!orderForUpgrade);

  const handleOrderCreated = async (newOrder) => {
    setIsNewOrderModalOpen(false);

    if (selectedOrder && selectedOrder.id) {
      const originalOrderId = selectedOrder.id;
      console.log(`New order created contextually. Attempting to mark original order ${originalOrderId} as manually delivered.`);
      
      const toastId = toast.loading(`Updating status for original order ${originalOrderId}...`);
      try {
        const response = await fetch(`/api/orders/${originalOrderId}/mark-manual-delivered`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'API error marking order as delivered');
        }
        toast.success(`Original order ${originalOrderId} marked as delivered.`, { id: toastId });
      } catch (error) {
        console.error(`Failed to mark original order ${originalOrderId} as delivered:`, error);
        toast.error(`Failed to update original order status: ${error.message}`, { id: toastId });
      }
    } else {
       console.log('New order created without specific return context (no selectedOrder).');
    }

    console.log("Refreshing orders list after new order creation...");
    await loadData();
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
            New Order to Return
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

      {isReturnConfirmModalOpen && orderForReturn && (
        <ReturnConfirmationModal
          isOpen={isReturnConfirmModalOpen}
          onClose={handleCloseReturnModal}
          order={orderForReturn}
          onConfirm={handleConfirmReturnStandard}
          isLoading={creatingLabelOrderId === orderForReturn.id}
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
        originalOrderContext={selectedOrder}
        isReturnsContext={true}
      />
    </div>
  );
} 