'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { supabase } from '../utils/supabase-client';
import { StatusBadge, PaymentBadge, ShippingToggle, StatusSelector } from './OrderActions';
import OrderDetailForm from './OrderDetailForm';
import PaymentStatusEditor from './PaymentStatusEditor';
import { ORDER_PACK_OPTIONS } from '../utils/constants';
import { normalizeCountryToCode, getCountryDisplayName, COUNTRY_MAPPING } from '../utils/country-utils';
import OrderActivityLog from './OrderActivityLog';
import { useSupabase } from './Providers';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { TableCell } from './ui/table';
import { calculateOrderInstruction } from '../utils/order-instructions';
import { toast } from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RefreshCcw, CloudDownload } from 'lucide-react';

// Create context for the OrderDetailModal
export const OrderDetailModalContext = createContext({
  openModal: () => {},
});

// Hook to use the OrderDetailModal context
export function useOrderDetailModal() {
  const context = useContext(OrderDetailModalContext);
  if (!context) {
    throw new Error('useOrderDetailModal must be used within an OrderDetailModalProvider');
  }
  return context;
}

// Format date for display
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(',', '');
  } catch (e) {
    return 'Invalid date';
  }
};

// Format address for display
const formatCombinedAddress = (order, isMounted = false) => {
  if (!order) return 'N/A';
  
  // Check if we have individual address components
  if (order.shipping_address_line1 || order.shipping_address_city || order.shipping_address_postal_code || order.shipping_address_country) {
    const addressParts = [
      order.shipping_address_line1 && order.shipping_address_house_number 
        ? `${order.shipping_address_line1} ${order.shipping_address_house_number}`
        : order.shipping_address_line1,
      order.shipping_address_line2,
      order.shipping_address_city,
      order.shipping_address_postal_code,
      order.shipping_address_country // Use raw value from database
    ].filter(Boolean);
    
    const formattedAddress = addressParts.join(', ') || 'N/A';
    
    // Add warning if country code is not valid (only on client side)
    if (isMounted && order.shipping_address_country) {
      const upperCountry = order.shipping_address_country.trim().toUpperCase();
      if (!COUNTRY_MAPPING[upperCountry]) {
        return (
          <div>
            <div>{formattedAddress}</div>
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              Warning: Country value "{order.shipping_address_country}" is not a valid country code. 
              It should be a 2-letter code like: FR, GB, US, DE, NL
            </div>
          </div>
        );
      }
    }
    
    return formattedAddress;
  }
  
  // Fallback to legacy shipping_address field if it exists
  if (order.shipping_address) {
    // Parse the shipping address
    const parts = order.shipping_address.split(',').map(part => part.trim());
    const parsedAddress = {
      street: parts[0] || 'N/A',
      city: parts[1] || 'N/A',
      postalCode: parts[2] || 'N/A',
      country: parts[3] || 'N/A'
    };
    
    const formattedAddress = `${parsedAddress.street}, ${parsedAddress.city}, ${parsedAddress.postalCode}, ${parsedAddress.country}`;
    
    // Add warning if country code is not valid (only on client side)
    if (isMounted && parsedAddress.country) {
      const upperCountry = parsedAddress.country.trim().toUpperCase();
      if (!COUNTRY_MAPPING[upperCountry]) {
        return (
          <div>
            <div>{formattedAddress}</div>
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              Warning: Country value "{parsedAddress.country}" is not a valid country code. 
              It should be a 2-letter code like: FR, GB, US, DE, NL
            </div>
          </div>
        );
      }
    }
    
    return formattedAddress;
  }
  
  return 'N/A';
};

// Provider component for the OrderDetailModal
export function OrderDetailModalProvider({ children }) {
  return (
    <OrderDetailModal>
      {children}
    </OrderDetailModal>
  );
}

export default function OrderDetailModal({ children }) {
  const router = useRouter();
  const supabase = useSupabase();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [labelMessage, setLabelMessage] = useState(null);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [dbShippingMethods, setDbShippingMethods] = useState([]);
  const [isLoadingDbMethods, setIsLoadingDbMethods] = useState(false);
  const [currentShippingMethodId, setCurrentShippingMethodId] = useState('');
  const [isSavingShippingMethod, setIsSavingShippingMethod] = useState(false);
  const [isSyncingMethods, setIsSyncingMethods] = useState(false);
  const [allSendCloudMethods, setAllSendCloudMethods] = useState([]);
  const [isLoadingAllMethods, setIsLoadingAllMethods] = useState(false);
  const [embeddedLabelUrl, setEmbeddedLabelUrl] = useState(null);
  const [isLoadingLabel, setIsLoadingLabel] = useState(false);
  const [labelFetchError, setLabelFetchError] = useState(null);

  const openModal = (orderId) => {
    setSelectedOrderId(orderId);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setTimeout(() => {
      setSelectedOrderId(null);
      setOrder(null);
      setLabelMessage(null);
    }, 300); // Wait for the animation to complete
  };

  const fetchOrder = useCallback(async () => {
    if (!selectedOrderId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', selectedOrderId)
        .single();
      
      if (error) throw error;
      
      setOrder(data);
      setCurrentShippingMethodId(data.shipping_method || '');
      
      // Check if migration is needed
      setMigrationNeeded(!data.label_url && !data.tracking_number && !data.tracking_link);
      
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to load order details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedOrderId]);

  useEffect(() => {
    if (isOpen && selectedOrderId) {
      fetchOrder();
    }
  }, [isOpen, selectedOrderId, fetchOrder]);

  // Fetch DB Shipping Methods on open (passing country code)
  useEffect(() => {
    const fetchDbMethods = async () => {
      if (!isOpen || !order) return; 

      const toCountryCode = order.shipping_address_country?.trim().toUpperCase();
      // Store the previously selected/saved method ID for comparison later
      const previouslySavedMethodId = order.shipping_method ? String(order.shipping_method) : null;
      setCurrentShippingMethodId(''); // Reset selection while loading
      setDbShippingMethods([]); // Clear previous list

      if (!toCountryCode) {
        console.warn('Order is missing country code, cannot fetch filtered shipping methods.');
        setIsLoadingDbMethods(false); // Ensure loading stops
        return;
      }

      setIsLoadingDbMethods(true);
      let fetchedMethods = []; // To store methods fetched from API
      try {
        const response = await fetch(`/api/shipping-methods?to_country=${toCountryCode}`); 
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch filtered DB shipping methods');
        }
        fetchedMethods = data.data || [];
        setDbShippingMethods(fetchedMethods);

      } catch (err) {
        console.error('Error fetching filtered DB shipping methods:', err);
        toast.error(`Failed to load shipping methods: ${err.message}`);
        // Leave dbShippingMethods empty on error
      } finally {
        setIsLoadingDbMethods(false);
        
        // --- Default Selection Logic --- 
        if (fetchedMethods.length > 0) {
            // Check if the previously saved method is valid within the fetched list
            const isPreviousMethodValid = previouslySavedMethodId && fetchedMethods.some(m => String(m.id) === previouslySavedMethodId);

            if (isPreviousMethodValid) {
                // If previous selection is still valid for this country, re-select it
                console.log(`Previously saved method ${previouslySavedMethodId} is valid for ${toCountryCode}. Re-selecting.`);
                setCurrentShippingMethodId(previouslySavedMethodId);
                // No need to save again if it was already the saved value
            } else {
                // If no valid previous selection, find the first method from the filtered list as default
                const defaultMethod = fetchedMethods[0]; // The API already applied the rule, take the first match
                const defaultMethodId = String(defaultMethod.id);
                console.log(`Selecting default method ${defaultMethodId} (${defaultMethod.name}) for ${toCountryCode}.`);
                setCurrentShippingMethodId(defaultMethodId);
                // Automatically save this new default to the database
                updateShippingMethodInDb(defaultMethodId);
            }
        } else {
            // No methods found for this country
            console.log(`No applicable shipping methods found for ${toCountryCode}. Clearing selection.`);
            setCurrentShippingMethodId('');
             // If a method was previously saved, maybe clear it in DB too?
             // if (previouslySavedMethodId) { updateShippingMethodInDb(null); }
        }
        // --- End Default Selection Logic --- 
      }
    };

    // Re-fetch when modal opens or when order.shipping_address_country changes
    if (isOpen && order) { 
      fetchDbMethods();
    } else if (!isOpen) {
      setDbShippingMethods([]); // Clear methods when modal closes
      setCurrentShippingMethodId(''); // Clear selection
    }
  // Only re-run if isOpen changes or the order ID or country code changes
  }, [isOpen, order?.id, order?.shipping_address_country]); 

  const refreshOrder = () => {
    fetchOrder();
  };

  // Handle order updates from child components
  const handleOrderUpdate = (updatedFields) => {
    console.log('Order updated in form, updating modal state:', updatedFields);
    // Optimistically update the local order state
    setOrder(prevOrder => ({ ...prevOrder, ...updatedFields }));
    // Optionally trigger a full refresh or notify parent component
    // router.refresh(); // Uncomment if a full refresh is needed
    // Close the modal after successful update
    // setIsOpen(false); // REMOVED: Keep modal open after update
  };

  // Add function to update shipping method in DB
  const updateShippingMethodInDb = async (methodId) => {
    if (!order || !order.id || !methodId) return;
    setIsSavingShippingMethod(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ shipping_method: methodId, updated_at: new Date().toISOString() })
        .eq('id', order.id)
        .select('shipping_method') // Select to confirm update
        .single();

      if (error) throw error;

      // Update local order state optimistically
      handleOrderUpdate({ shipping_method: data.shipping_method }); 
      setCurrentShippingMethodId(String(data.shipping_method)); // Ensure state matches DB
      toast.success('Shipping method saved.');

    } catch (err) {
      console.error('Error updating shipping method:', err);
      toast.error(`Failed to save shipping method: ${err.message}`);
      // Optionally revert local state if needed
      setCurrentShippingMethodId(String(order.shipping_method || '')); 
    } finally {
      setIsSavingShippingMethod(false);
    }
  };

  // Function to create a shipping label
  const createShippingLabel = async () => {
    // Ensure a shipping method is selected
    if (!currentShippingMethodId) {
      toast.error('Please select a shipping method first.');
      return;
    }
    if (!order || !order.id) return;
    
    setCreatingLabel(true);
    setLabelMessage(null);
    
    try {
      const response = await fetch('/api/orders/create-shipping-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Pass the selected shipping method ID
        body: JSON.stringify({ 
          orderId: order.id, 
          shippingMethodId: parseInt(currentShippingMethodId, 10) // Ensure it's an integer
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create shipping label');
      }
      
      // Create activity log entry for shipping label creation
      const { error: activityError } = await supabase
        .from('order_activities')
        .insert([
          {
            order_id: order.id,
            action_type: 'shipping_label_created',
            changes: {
              shipping_id: data.shipping_id,
              tracking_number: data.tracking_number,
              label_url: data.label_url
            },
            created_at: new Date().toISOString()
          }
        ]);

      if (activityError) {
        console.error('Error creating activity log:', activityError);
      }
      
      // Update the local order state with the new data
      setOrder(prevOrder => ({
        ...prevOrder,
        ...data,
        updated_at: new Date().toISOString()
      }));
      
      // Show success message
      setLabelMessage({
        type: 'success',
        text: 'Shipping label created successfully!'
      });
      
      // Update the router cache without navigating
      router.refresh();
    } catch (error) {
      console.error('Error creating shipping label:', error);
      setLabelMessage({
        type: 'error',
        text: error.message || 'Failed to create shipping label'
      });
    } finally {
      setCreatingLabel(false);
    }
  };

  // Function to update delivery status
  const updateDeliveryStatus = async () => {
    if (!order || !order.id) return;
    
    try {
      const response = await fetch(`/api/orders/update-delivery-status?orderId=${order.id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update delivery status');
      }
      
      // Refresh the order to show the updated status
      refreshOrder();
      
    } catch (error) {
      console.error('Error updating delivery status:', error);
    }
  };

  // Function to trigger the admin sync endpoint
  const triggerSyncSendCloudMethods = async () => {
    // Ensure ADMIN_SECRET_KEY is available client-side (use environment variables properly)
    // WARNING: Exposing secrets client-side is insecure. This is for demonstration ONLY.
    // In a real app, this POST request should be made from a secure context/admin panel.
    const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY; // Needs to be NEXT_PUBLIC_ for client access

    if (!adminSecret) {
      toast.error('Admin secret key is not configured for client-side sync trigger.');
      return;
    }

    setIsSyncingMethods(true);
    const toastId = toast.loading('Syncing shipping methods with SendCloud...');

    try {
      const response = await fetch('/api/admin/sync-sendcloud-methods', {
        method: 'POST',
        headers: {
          // Basic auth check used in the API route - REPLACE WITH REAL AUTH
          'X-Admin-Secret': adminSecret,
          'Content-Type': 'application/json' // Add content type even if body is empty
        },
        // No body needed for this specific POST request based on current API logic
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Sync failed with status ${response.status}`);
      }

      toast.success(`Sync successful! ${data.count || 0} methods updated.`, { id: toastId });
      
      // Optionally, re-fetch the filtered methods for the current order after sync
      // This requires fetchDbMethods to be defined or accessible here
      if (order) { // Check if order context is available
          // Assuming fetchDbMethods is defined in this scope or can be called
          // You might need to slightly refactor how fetchDbMethods is triggered
          // For now, let's just log. A simple page refresh might be easier.
          console.log('Sync complete. Re-fetching filtered methods for the current order might be needed.');
          // Example: Trigger refetch (adjust based on actual implementation)
          // fetchDbMethods(); // This might cause issues if fetchDbMethods depends only on useEffect
      } else {
        console.log('Sync complete. Order context not available to auto-refresh methods.');
      }

    } catch (error) {
      console.error('Error triggering SendCloud sync:', error);
      toast.error(`Sync failed: ${error.message}`, { id: toastId });
    } finally {
      setIsSyncingMethods(false);
    }
  };

  // Function to fetch ALL methods directly from SendCloud endpoint
  const fetchAllSendCloudMethods = async () => {
    setIsLoadingAllMethods(true);
    setAllSendCloudMethods([]); // Clear previous results
    const toastId = toast.loading('Fetching all methods from SendCloud API...');

    try {
      // Call the SendCloud proxy endpoint without country filter
      // Pass sender_address if available in order, as it might influence results
      const senderAddressId = order?.sender_address || ''; 
      const apiUrl = new URL('/api/sendcloud/shipping-methods', window.location.origin);
      if (senderAddressId) {
        apiUrl.searchParams.append('sender_address', senderAddressId);
      }
      // No to_country parameter here

      console.log(`Fetching ALL SendCloud methods: ${apiUrl.toString()}`);
      const response = await fetch(apiUrl.toString());
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch all SendCloud methods');
      }

      const fetchedMethods = data.data || [];
      setAllSendCloudMethods(fetchedMethods);
      console.log('Fetched All SendCloud Methods:', fetchedMethods); // Log results
      toast.success(`Fetched ${fetchedMethods.length} total methods from SendCloud.`, { id: toastId });
      // Note: These are NOT automatically added to the dropdown, which uses filtered DB data.

    } catch (error) {
      console.error('Error fetching all SendCloud methods:', error);
      toast.error(`Failed to fetch all methods: ${error.message}`, { id: toastId });
    } finally {
      setIsLoadingAllMethods(false);
    }
  };

  // Function to fetch and create a Blob URL for the label
  const fetchAndEmbedLabel = async () => {
    if (!order || !order.shipping_id) return;

    setIsLoadingLabel(true);
    setLabelFetchError(null);
    // Revoke previous blob URL if it exists
    if (embeddedLabelUrl) {
      URL.revokeObjectURL(embeddedLabelUrl);
      setEmbeddedLabelUrl(null);
    }

    try {
      const response = await fetch(`/api/labels/${order.shipping_id}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        throw new Error(errorData.error || `Failed to fetch label (${response.status})`);
      }

      const pdfBlob = await response.blob();
      const blobUrl = URL.createObjectURL(pdfBlob);
      setEmbeddedLabelUrl(blobUrl);

    } catch (error) {
      console.error('Error fetching/embedding label:', error);
      setLabelFetchError(error.message || 'Could not load label.');
      toast.error(`Error loading label: ${error.message}`);
    } finally {
      setIsLoadingLabel(false);
    }
  };

  // Effect to revoke blob URL on unmount
  useEffect(() => {
    // Return cleanup function
    return () => {
      if (embeddedLabelUrl) {
        console.log('Revoking Blob URL:', embeddedLabelUrl);
        URL.revokeObjectURL(embeddedLabelUrl);
      }
    };
  }, [embeddedLabelUrl]); // Re-run only if blob URL changes

  // Expose the openModal function to the window object so it can be called from anywhere
  useEffect(() => {
    window.openOrderDetail = openModal;
    return () => {
      delete window.openOrderDetail;
    };
  }, []);

  // Add useEffect to set isMounted after client-side rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Order Details {order?.id && `(${order.id})`}
            </DialogTitle>
            <DialogDescription className="sr-only"> {/* Screen-reader only description */}
              View and edit the details for order {order?.id || ''}. Manage status, shipping, and view activity.
            </DialogDescription>
          </DialogHeader>
          
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-100 text-red-800 rounded">
              {error}
            </div>
          ) : order ? (
            <div className="space-y-6">
              {/* Edit Order Form */}
              <div className="bg-white p-4 rounded border border-gray-200">
                <h2 className="text-lg font-semibold mb-4">Edit Order</h2>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-black">Customer Information</h3>
                  <div className="flex gap-2">
                    {order.stripe_customer_id && (
                      <a 
                        href={`https://dashboard.stripe.com/customers/${order.stripe_customer_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-violet-600 text-white rounded hover:bg-violet-700 text-sm font-medium"
                      >
                        Stripe
                      </a>
                    )}
                    {order.customer_id && (
                      <a 
                        href={`/customers/${order.customer_id}`}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                      >
                        View Customer
                      </a>
                    )}
                  </div>
                </div>
                <OrderDetailForm 
                  order={order} 
                  orderPackOptions={ORDER_PACK_OPTIONS}
                  onUpdate={handleOrderUpdate}
                  calculatedInstruction={calculateOrderInstruction(order)}
                />
              </div>
              
              {/* Order Status and Actions */}
              <div className="bg-white p-4 rounded border border-gray-200">
                <h2 className="text-lg font-semibold mb-4">Order Status</h2>
                <div className="status-section">
                  {/* Created & Updated Timestamps */}
                  <div className="status-row">
                    <span className="status-label">Created</span>
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                  <div className="status-row">
                    <span className="status-label">Updated</span>
                    <span>{formatDate(order.updated_at)}</span>
                  </div>

                  {/* Payment Status */}
                  <div className="status-row">
                    <span className="status-label">Payment Status</span>
                    <PaymentStatusEditor 
                      orderId={order.id} 
                      currentStatus={order.paid} 
                      onUpdate={handleOrderUpdate} 
                    />
                  </div>

                  {/* OK TO SHIP Status */}
                  <div className="status-row">
                    <span className="status-label">OK TO SHIP</span>
                    <ShippingToggle 
                      okToShip={order.ok_to_ship} 
                      orderId={order.id}
                      onUpdate={handleOrderUpdate}
                    />
                  </div>

                  {/* Weight */}
                  {order.weight && (
                    <div className="status-row">
                      <span className="status-label">Order Pack Weight</span>
                      <span>{order.weight} kg</span>
                    </div>
                  )}

                  {/* Shipping Address */}
                  <div className="status-row">
                    <span className="status-label">Shipping Address</span>
                    <div className="text-right text-sm text-gray-600">
                      {formatCombinedAddress(order, isMounted)}
                    </div>
                  </div>

                  {/* Shipping Method Dropdown */}
                  <div className="status-row">
                    <span className="status-label">Shipping Method:</span>
                    <div className="flex items-center space-x-2">
                       {/* Replace shadcn/ui Select with native HTML select */}
                       <select
                         id="shipping-method-select"
                         value={currentShippingMethodId} // Use state variable
                         onChange={(e) => {
                           const value = e.target.value;
                           setCurrentShippingMethodId(value);
                           updateShippingMethodInDb(value);
                         }}
                         disabled={isLoadingDbMethods || isSavingShippingMethod || isSyncingMethods || isLoadingAllMethods || !order}
                         className="flex-grow h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 
                                    w-full overflow-hidden whitespace-nowrap text-ellipsis"
                       >
                         {/* Default placeholder option */}
                         {!currentShippingMethodId && <option value="" disabled>Select shipping method...</option>}
                         
                         {/* Options based on filtered DB methods */}
                         {isLoadingDbMethods ? (
                             <option value="loading" disabled>Loading methods...</option>
                         ) : dbShippingMethods.length > 0 ? (
                             dbShippingMethods.map((method) => {
                               // Check if this method is the currently selected one
                               const isDefault = String(method.id) === currentShippingMethodId;
                               return (
                                 <option 
                                   key={method.id} 
                                   value={String(method.id)}
                                 >
                                   {/* Append ' - DEFAULT' if it matches the current selection */}
                                   {method.name} ({method.carrier || 'DB'}){isDefault ? ' - DEFAULT' : ''}
                                 </option>
                               );
                             })
                           ) : (
                             <option value="no-methods" disabled>
                               {order?.shipping_address_country ? 'No applicable methods found' : 'Enter country first'}
                             </option>
                         )}
                       </select>

                       <Button
                         variant="secondary" 
                         size="icon"
                         onClick={triggerSyncSendCloudMethods}
                         disabled={isSyncingMethods || isLoadingAllMethods}
                         title="Sync methods from SendCloud to DB (Admin)"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isSyncingMethods ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0115.357-2m0 0H15" />
                         </svg>
                       </Button>

                       <Button
                         variant="outline" 
                         size="icon"
                         onClick={fetchAllSendCloudMethods}
                         disabled={isSyncingMethods || isLoadingAllMethods || !order}
                         title="Fetch all available methods directly from SendCloud API"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLoadingAllMethods ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10m16-5H4m16 5H4M4 7h16v10H4V7z" />
                         </svg>
                       </Button>
                    </div>
                    
                    {/* ---- Indicators and ID Display START ---- */}
                    {/* Debugging log for ID display conditions */}
                    {console.log('ID Display Check:', { currentShippingMethodId, isSavingShippingMethod, isSyncingMethods, isLoadingAllMethods })}
                    
                    {/* Saving indicator */}
                    {isSavingShippingMethod && <p className="text-xs text-blue-500 mt-1 animate-pulse">Saving...</p>}
                    {/* Syncing indicator */}
                    {isSyncingMethods && <p className="text-xs text-orange-500 mt-1 animate-pulse">Syncing with SendCloud...</p>}
                    {/* Fetching All indicator */}
                    {isLoadingAllMethods && <p className="text-xs text-purple-500 mt-1 animate-pulse">Fetching all from SendCloud...</p>}
                    
                    {/* Display Selected ID */}
                    {currentShippingMethodId && !isSavingShippingMethod && !isSyncingMethods && !isLoadingAllMethods && (
                      <p className="text-xs text-gray-600 mt-1 font-medium">
                        Selected ID: {currentShippingMethodId}
                      </p>
                    )}
                    
                    {/* Original DB value display (adjusted to show only if different) */}
                    {order.shipping_method && String(order.shipping_method) !== currentShippingMethodId && !isSavingShippingMethod && !isSyncingMethods && !isLoadingAllMethods && (
                      <p className="text-xs text-gray-400 mt-1">
                        (Original DB value: {order.shipping_method})
                      </p>
                    )}
                    {/* ---- Indicators and ID Display END ---- */}
                    
                  </div>

                  {/* Shipping Label Status */}
                  <div className="status-row flex-col items-stretch">
                    <div className="w-full space-y-2">
                      {order.shipping_id && (
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mb-4">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-600">SendCloud Parcel ID:</span>
                            <span className="ml-2 font-mono">{order.shipping_id}</span>
                          </div>
                          <button
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to remove this shipping label? This action cannot be undone.')) {
                                try {
                                  const response = await fetch('/api/orders/remove-shipping-id', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({ orderId: order.id }),
                                  });

                                  if (!response.ok) {
                                    throw new Error('Failed to remove shipping ID');
                                  }

                                  // Update local state
                                  setOrder(prev => ({
                                    ...prev,
                                    shipping_id: null,
                                    tracking_number: null,
                                    tracking_link: null,
                                    label_url: null,
                                    status: 'pending',
                                    updated_at: new Date().toISOString()
                                  }));

                                  // Show success message
                                  toast.success('Shipping label removed successfully');

                                  // Refresh order details
                                  refreshOrder();
                                } catch (error) {
                                  console.error('Error removing shipping ID:', error);
                                  toast.error('Failed to remove shipping label');
                                }
                              }
                            }}
                            className="flex items-center gap-2 ml-4 px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-md transition-colors"
                            title="Remove shipping label"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => createShippingLabel()}
                        className={`w-full px-4 py-3 text-base rounded font-medium flex items-center justify-center ${
                          order.ok_to_ship && order.paid && currentShippingMethodId && order.shipping_address_line1 && order.shipping_address_house_number && order.shipping_address_city && order.shipping_address_postal_code && order.shipping_address_country && order.order_pack_list_id && order.name && order.email && order.phone
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={!order.ok_to_ship || !order.paid || !currentShippingMethodId || !order.shipping_address_line1 || !order.shipping_address_house_number || !order.shipping_address_city || !order.shipping_address_postal_code || !order.shipping_address_country || !order.order_pack_list_id || !order.name || !order.email || !order.phone || creatingLabel}
                      >
                        {creatingLabel ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Creating Label...
                          </>
                        ) : (
                          'Create Shipping Label'
                        )}
                      </button>
                      {/* Display SendCloud error message */}
                      {labelMessage && labelMessage.type === 'error' && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start">
                            <svg className="h-5 w-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-red-800">SendCloud Error</h3>
                              <div className="mt-1 text-sm text-red-700">
                                {labelMessage.text}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Display warning message */}
                      {labelMessage && labelMessage.type === 'warning' && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start">
                            <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                              <div className="mt-1 text-sm text-yellow-700">
                                {labelMessage.text}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Display success message */}
                      {labelMessage && labelMessage.type === 'success' && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-start">
                            <svg className="h-5 w-5 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-green-800">Success</h3>
                              <div className="mt-1 text-sm text-green-700">
                                {labelMessage.text}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* --- Label Viewing Section --- */}
                      {order.shipping_id && (
                        <div className="mt-4 space-y-2">
                           {/* Button to trigger label fetch/embed */}
                           <Button 
                              onClick={fetchAndEmbedLabel}
                              disabled={isLoadingLabel}
                              variant="info" // Use a different variant if available or default
                              className="w-full"
                            >
                              {isLoadingLabel ? ( 
                                  <><RefreshCcw className="h-4 w-4 mr-2 animate-spin" />Loading Label...</>
                               ) : embeddedLabelUrl ? (
                                   'Reload Embedded Label'
                               ) : (
                                   'View/Embed Label Below'
                               )}
                            </Button>

                            {/* Display error if fetching label failed */}
                            {labelFetchError && (
                                <p className="text-sm text-red-600 text-center">Error: {labelFetchError}</p>
                            )}

                            {/* Conditionally render iframe for embedded PDF */}
                            {embeddedLabelUrl && !isLoadingLabel && !labelFetchError && (
                              <iframe 
                                src={embeddedLabelUrl}
                                title={`Shipping Label for Order ${order.id}`}
                                className="w-full h-[500px] border rounded mt-2" // Adjust height as needed
                                type="application/pdf"
                              >
                                Your browser does not support embedded PDFs. 
                                <a href={embeddedLabelUrl} download={`label-${order.shipping_id}.pdf`}>Download the label PDF</a>.
                              </iframe>
                            )}
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center">
              No order selected
            </div>
          )}
          
          {/* Line Items Section */}
          {order && order.line_items && (
            <div className="bg-white p-4 rounded border border-gray-200 mt-4">
              <h2 className="text-lg font-semibold mb-4">Invoice Line Items</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      try {
                        const lineItems = typeof order.line_items === 'string' 
                          ? JSON.parse(order.line_items) 
                          : (Array.isArray(order.line_items) ? order.line_items : []);
                          
                        return lineItems.length > 0 ? lineItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{(item.amount || 0).toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity || 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{((item.amount || 0) * (item.quantity || 1)).toFixed(2)}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                              No line items available
                            </td>
                          </tr>
                        );
                      } catch (error) {
                        console.error('Error parsing line items:', error, order.line_items);
                        return (
                          <tr>
                            <td colSpan="4" className="px-6 py-4 text-center text-sm text-red-500">
                              Error parsing line items: {error.message}
                            </td>
                          </tr>
                        );
                      }
                    })()}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="3" className="px-6 py-3 text-right text-sm font-medium text-gray-500">Total</td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {(() => {
                          try {
                            const lineItems = typeof order.line_items === 'string' 
                              ? JSON.parse(order.line_items) 
                              : (Array.isArray(order.line_items) ? order.line_items : []);
                              
                            return `€${lineItems.reduce((sum, item) => sum + ((item.amount || 0) * (item.quantity || 1)), 0).toFixed(2)}`;
                          } catch (error) {
                            console.error('Error calculating total:', error);
                            return 'Error calculating total';
                          }
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          
          {/* Order Activity Log */}
          <div className="bg-white p-4 rounded border border-gray-200 mt-6">
            <h2 className="text-lg font-semibold mb-4">Activity Log</h2>
            {order?.id ? (
              <OrderActivityLog orderId={order.id} />
            ) : (
              <div className="text-gray-500 text-center py-4">
                No activities available
              </div>
            )}
          </div>
          
          <DialogFooter className="w-full">
            <button 
              onClick={closeModal}
              className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* This component is meant to be used with a context provider */}
      {typeof window !== 'undefined' && (
        <OrderDetailModalContext.Provider value={{ openModal }}>
          {children}
        </OrderDetailModalContext.Provider>
      )}
    </>
  );
} 