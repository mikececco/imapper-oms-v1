'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../utils/supabase-client';
import { calculateOrderInstruction } from '../utils/order-instructions';
import { calculateOrderStatus } from '../utils/order-instructions';
import { fetchShippingMethods, DEFAULT_SHIPPING_METHODS } from '../utils/shipping-methods';
import CustomOrderPackModal from './CustomOrderPackModal';
import { normalizeCountryToCode, getCountryDisplayName, COUNTRY_MAPPING } from '../utils/country-utils';
import { toast } from 'react-hot-toast';
import { formatDate } from './OrderDetailModal';

// Define countries requiring customs for reuse
const COUNTRIES_REQUIRING_CUSTOMS = ['GB', 'CH', 'US', 'CA', 'AU', 'NO'];

export default function OrderDetailForm({ order, orderPackOptions, onUpdate, calculatedInstruction }) {
  const router = useRouter();
  // Use useRef to track client-side rendering
  const hasMounted = useRef(false);
  
  const [orderPackLists, setOrderPackLists] = useState([]);
  const [loadingOrderPacks, setLoadingOrderPacks] = useState(true);
  
  const [formData, setFormData] = useState({
    name: order.name || '',
    email: order.email || '',
    phone: order.phone || '',
    shipping_address_line1: order.shipping_address_line1 || '',
    shipping_address_house_number: order.shipping_address_house_number || '',
    shipping_address_line2: order.shipping_address_line2 || '',
    shipping_address_city: order.shipping_address_city || '',
    shipping_address_postal_code: order.shipping_address_postal_code || '',
    shipping_address_country: order.shipping_address_country || '',
    order_pack: '',
    order_pack_quantity: order.order_pack_quantity || 1,
    order_notes: order.order_notes || '',
    weight: order.weight || '1.000',
    shipping_method: order.shipping_method || 'standard',
    tracking_link: order.tracking_link || '',
    shipping_id: order.shipping_id || '',
    order_pack_list_id: order.order_pack_list_id || '',
    serial_number: order.serial_number || '',
  });
  
  const [calculatedStatus, setCalculatedStatus] = useState(calculateOrderStatus(order));
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState({ text: '', type: '' });
  // Initialize with default methods to avoid hydration mismatch
  const [shippingMethods, setShippingMethods] = useState(DEFAULT_SHIPPING_METHODS);
  const [loadingShippingMethods, setLoadingShippingMethods] = useState(false); // Start with false to match server rendering
  const [syncingShippingMethods, setSyncingShippingMethods] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isCustomPackModalOpen, setIsCustomPackModalOpen] = useState(false);
  // Add state for manual status fetching
  const [isFetchingStatus, setIsFetchingStatus] = useState(false);

  // Add state to track if form has been modified
  const [isFormModified, setIsFormModified] = useState(false);
  
  // Store the original form data for comparison
  const [originalFormData, setOriginalFormData] = useState({});
  
  // --- State for Editable Customs Fields ---
  const [customsShipmentType, setCustomsShipmentType] = useState('commercial_goods');
  const [customsInvoiceNr, setCustomsInvoiceNr] = useState('');
  const [editableParcelItems, setEditableParcelItems] = useState([]);
  // --- End State --- 
  
  // Initialize form data and original data (including customs)
  useEffect(() => {
    console.log('[OrderDetailForm Effect] Received order prop with id:', order?.id);
    
    // Parse line items for initial customs state
    let initialParcelItems = [];
    let lineItems = [];
    try {
      lineItems = typeof order.line_items === 'string' 
        ? JSON.parse(order.line_items) 
        : (Array.isArray(order.line_items) ? order.line_items : []);
      
      const totalWeight = order.weight ? parseFloat(order.weight) : 0;
      const totalQuantity = lineItems.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;

      initialParcelItems = lineItems.map(item => ({
        description: item.description || '',
        quantity: item.quantity || 1,
        value: (item.amount || 0).toFixed(2),
        weight: ((totalWeight / totalQuantity) * (item.quantity || 1)).toFixed(3),
        hs_code: item.hs_code || '90151000',
        origin_country: item.origin_country || 'FR',
        sku: item.sku || ''
      }));
    } catch (err) {
      console.error('Error initializing parcel items from order.line_items:', err);
      // Leave initialParcelItems empty if parsing fails
    }
    
    // Try to get customs data from the order if it exists, otherwise use defaults/parsed items
    setCustomsShipmentType(order.customs_shipment_type || 'commercial_goods');
    // Use stripe_invoice_id if available, otherwise fallback to order.id
    setCustomsInvoiceNr(order.customs_invoice_nr || order.stripe_invoice_id || order.id || ''); 
    setEditableParcelItems(order.customs_parcel_items || initialParcelItems); // Use stored if available

    const initialData = {
      name: order.name || '',
      email: order.email || '',
      phone: order.phone || '',
      shipping_address_line1: order.shipping_address_line1 || '',
      shipping_address_house_number: order.shipping_address_house_number || '',
      shipping_address_line2: order.shipping_address_line2 || '',
      shipping_address_city: order.shipping_address_city || '',
      shipping_address_postal_code: order.shipping_address_postal_code || '',
      shipping_address_country: order.shipping_address_country || '',
      order_pack: '', // This seems derived, maybe remove from state?
      order_pack_quantity: order.order_pack_quantity || 1,
      order_notes: order.order_notes || '',
      weight: order.weight || '1.000',
      shipping_method: order.shipping_method || 'standard',
      tracking_link: order.tracking_link || '',
      shipping_id: order.shipping_id || '',
      order_pack_list_id: order.order_pack_list_id || '',
      serial_number: order.serial_number || '',
      // Add customs fields to initialData for diff tracking
      customs_shipment_type: order.customs_shipment_type || 'commercial_goods',
      customs_invoice_nr: order.customs_invoice_nr || order.stripe_invoice_id || order.id || '', 
      customs_parcel_items: JSON.stringify(order.customs_parcel_items || initialParcelItems) // Store as string for comparison
    };
    
    setFormData(initialData); // Keep this for non-customs fields
    setOriginalFormData(initialData); // Store original state including customs
  }, [order]);
  
  // Check if form data has changed
  useEffect(() => {
    // Compare current form data with original data
    const hasChanged = Object.keys(formData).some(key => 
      formData[key] !== originalFormData[key]
    );
    
    setIsFormModified(hasChanged);
  }, [formData, originalFormData]);

  // Only run this effect after the component has mounted on the client
  useEffect(() => {
    hasMounted.current = true;
    setIsMounted(true);
  }, []);

  // Fetch shipping methods when component mounts on the client
  // DISABLED: Shipping method fetching is disabled as requested
  /*
  useEffect(() => {
    // Skip this effect during server-side rendering
    if (!hasMounted.current) return;
    
    let isMounted = true;
    
    const loadShippingMethods = async () => {
      try {
        setLoadingShippingMethods(true);
        const methods = await fetchShippingMethods();
        
        // Only update state if component is still mounted
        if (isMounted) {
          setShippingMethods(methods);
        }
      } catch (error) {
        console.error('Error loading shipping methods:', error);
        // Only update state if component is still mounted
        if (isMounted) {
          // Ensure we have the default methods
          setShippingMethods(DEFAULT_SHIPPING_METHODS);
        }
      } finally {
        // Only update state if component is still mounted
        if (isMounted) {
          setLoadingShippingMethods(false);
        }
      }
    };
    
    loadShippingMethods();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [hasMounted]); // Only depend on hasMounted to prevent unnecessary API calls
  */
  
  // Function to load shipping methods - kept but not called
  const loadShippingMethods = async () => {
    try {
      setLoadingShippingMethods(true);
      const methods = await fetchShippingMethods();
      
      setShippingMethods(methods);
    } catch (error) {
      console.error('Error loading shipping methods:', error);
      // Ensure we have the default methods
      setShippingMethods(DEFAULT_SHIPPING_METHODS);
    } finally {
      setLoadingShippingMethods(false);
    }
  };

  // Function to manually refresh shipping methods - kept but not used
  const handleSyncShippingMethods = async (e) => {
    e.preventDefault(); // Prevent form submission
    
    if (syncingShippingMethods) return; // Prevent multiple clicks
    
    setSyncingShippingMethods(true);
    
    try {
      // Force bypass cache
      const methods = await fetchShippingMethods(true, true);
      setShippingMethods(methods);
      
      // Show success message
      setUpdateMessage({ 
        text: 'Shipping methods refreshed!', 
        type: 'success' 
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setUpdateMessage({ text: '', type: '' });
      }, 3000);
    } catch (error) {
      console.error('Error syncing shipping methods:', error);
      
      // Show error message
      setUpdateMessage({ 
        text: `Error refreshing shipping methods: ${error.message}`, 
        type: 'error' 
      });
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setUpdateMessage({ text: '', type: '' });
      }, 5000);
    } finally {
      setSyncingShippingMethods(false);
    }
  };

  // Fetch order packs when component mounts
  useEffect(() => {
    const fetchOrderPacks = async () => {
      try {
        setLoadingOrderPacks(true);
        const { data, error } = await supabase
          .from('order_pack_lists')
          .select('*')
          .order('label');
        
        if (error) throw error;
        
        console.log('Fetched order packs:', data); // Debug log
        setOrderPackLists(data || []);
        
        // If there's a selected pack, update the form data with all pack details
        if (order.order_pack_list_id) {
          const selectedPack = data?.find(pack => pack.id === order.order_pack_list_id);
          if (selectedPack) {
            const quantity = order.order_pack_quantity || 1;
            const totalWeight = (parseFloat(selectedPack.weight) * quantity).toFixed(3);
            
            setFormData(prev => ({
              ...prev,
              order_pack_list_id: selectedPack.id,
              order_pack: selectedPack.value,
              weight: totalWeight
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching order packs:', error);
        setUpdateMessage({ 
          text: 'Failed to load order packs. Please try refreshing the page.', 
          type: 'error' 
        });
      } finally {
        setLoadingOrderPacks(false);
      }
    };

    fetchOrderPacks();
  }, [order.order_pack_list_id]);

  // Add validation for quantity
  const validateQuantity = (value) => {
    const quantity = parseInt(value);
    return quantity > 0 && quantity <= 100; // Limit to reasonable range
  };

  // Add validation for weight
  const validateWeight = (value) => {
    const weight = parseFloat(value);
    return weight >= 0.001 && weight <= 100.000;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Prevent any changes to shipping_id
    if (name === 'shipping_id') {
      return;
    }
    
    // Handle custom order pack selection
    if (name === 'order_pack' && value === 'custom') {
      setIsCustomPackModalOpen(true);
      return;
    }
    
    // Special handling for country field
    if (name === 'shipping_address_country') {
      // Store the raw value, just convert to uppercase
      setFormData(prev => ({
        ...prev,
        [name]: value.trim().toUpperCase()
      }));
    } else if (name === 'order_pack_list_id') {
      // Find the selected order pack from the database options
      const selectedPack = orderPackLists.find(pack => pack.id === value);
      if (selectedPack) {
        const quantity = formData.order_pack_quantity || 1;
        const totalWeight = (parseFloat(selectedPack.weight) * quantity).toFixed(3);
        
        setFormData(prev => ({
          ...prev,
          order_pack_list_id: selectedPack.id,
          order_pack: selectedPack.value,
          weight: totalWeight
        }));
      } else {
        // Reset order pack related fields if no pack is selected
        setFormData(prev => ({
          ...prev,
          order_pack_list_id: '',
          order_pack: '',
          weight: '1.000'
        }));
      }
    } else if (name === 'order_pack_quantity') {
      const quantity = parseInt(value);
      if (!validateQuantity(quantity)) {
        return; // Don't update if invalid
      }
      
      // Find the selected pack to get its weight
      const selectedPack = orderPackLists.find(pack => pack.id === formData.order_pack_list_id);
      if (selectedPack) {
        // If we have a selected pack, calculate total weight
        const packWeight = selectedPack.weight;
        const totalWeight = (parseFloat(packWeight) * quantity).toFixed(3);
        
        setFormData(prev => ({
          ...prev,
          order_pack_quantity: quantity,
          weight: totalWeight
        }));
      } else {
        // If no pack is selected, keep current weight
        setFormData(prev => ({
          ...prev,
          order_pack_quantity: quantity
        }));
      }
    } else if (name === 'weight') {
      // Allow direct typing of weight
      const newWeight = e.target.value.replace(',', '.');
      
      if (!isNaN(parseFloat(newWeight)) && validateWeight(parseFloat(newWeight))) {
        setFormData(prev => ({
          ...prev,
          weight: newWeight
        }));
      } else if (newWeight === '') {
        // Reset to default weight
        setFormData(prev => ({
          ...prev,
          weight: '1.000'
        }));
      } else {
        // Revert to previous valid value
        setFormData(prev => ({
          ...prev,
          weight: prev.weight
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Mark form as modified
    setIsFormModified(true);
  };

  const handleSaveCustomPack = (customValue) => {
    // Check if the custom value already exists in the predefined options
    const isDuplicate = orderPackOptions.some(option => 
      option.value.toLowerCase() === customValue.toLowerCase()
    );
    
    if (isDuplicate) {
      throw new Error('This Order Pack already exists. Please use a different name.');
    }
    
    setFormData(prev => ({ ...prev, order_pack: customValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateMessage({ text: '', type: '' });

    // Define which fields are considered address fields
    const addressFields = [
      'shipping_address_line1',
      'shipping_address_house_number',
      'shipping_address_line2',
      'shipping_address_city',
      'shipping_address_postal_code',
      'shipping_address_country'
    ];

    // Identify changes, especially for address
    const updatedFields = {
      name: typeof formData.name === 'string' ? formData.name.trim() : '',
      email: typeof formData.email === 'string' ? formData.email.trim() : '',
      phone: typeof formData.phone === 'string' ? formData.phone.trim() : '',
      shipping_address_line1: typeof formData.shipping_address_line1 === 'string' ? formData.shipping_address_line1.trim() : '',
      shipping_address_house_number: typeof formData.shipping_address_house_number === 'string' ? formData.shipping_address_house_number.trim() : '',
      shipping_address_line2: typeof formData.shipping_address_line2 === 'string' ? formData.shipping_address_line2.trim() : '',
      shipping_address_city: typeof formData.shipping_address_city === 'string' ? formData.shipping_address_city.trim() : '',
      shipping_address_postal_code: typeof formData.shipping_address_postal_code === 'string' ? formData.shipping_address_postal_code.trim() : (formData.shipping_address_postal_code || ''),
      shipping_address_country: typeof formData.shipping_address_country === 'string' ? formData.shipping_address_country.trim().toUpperCase() : (formData.shipping_address_country || ''),
      order_pack_list_id: formData.order_pack_list_id || null,
      order_pack_quantity: formData.order_pack_quantity,
      order_notes: typeof formData.order_notes === 'string' ? formData.order_notes.trim() : '',
      weight: formData.weight,
      shipping_method: typeof formData.shipping_method === 'string' ? formData.shipping_method.trim() : 'standard', // Default to 'standard' if not string
      serial_number: typeof formData.serial_number === 'string' ? formData.serial_number.trim() : '',
      updated_at: new Date().toISOString(),
    };

    // Add tracking_link and shipping_id only if they exist in formData
    if (formData.tracking_link) {
      updatedFields.tracking_link = formData.tracking_link;
    }
    if (formData.shipping_id) {
      updatedFields.shipping_id = formData.shipping_id;
    }

    // --- Prepare Update Data ---
    const updateData = {
      ...formData, // Start with existing form data (non-customs fields)
      shipping_address_country: formData.shipping_address_country?.toUpperCase(), // Use normalized code for DB
      updated_at: new Date().toISOString(), // Always update the timestamp
      // Add customs fields from state
      customs_shipment_type: customsShipmentType,
      customs_invoice_nr: customsInvoiceNr,
      customs_parcel_items: editableParcelItems // Save the array/object directly (assuming JSONB column)
    };
    delete updateData.order_pack; // Remove derived field
    // Remove fields that might be in formData but belong to customs state
    // (These were added to originalFormData for diffing)
    delete updateData.customs_parcel_items; 


    // --- Calculate Changes for Logging ---
    const changesForLog = {};
    // Use a combined object representing the full current state for comparison
    const currentStateForCompare = {
       ...formData, // Non-customs fields
       customs_shipment_type: customsShipmentType,
       customs_invoice_nr: customsInvoiceNr,
       customs_parcel_items: JSON.stringify(editableParcelItems) // Compare stringified version
    };
    const original = originalFormData; // Contains original state including stringified customs items
    let hasActualChanges = false;

    // ---- MORE LOGGING ----
    console.log('[handleSubmit] Comparing currentState with originalFormData:');
    console.log('[handleSubmit] Original:', original);
    console.log('[handleSubmit] Current State for Compare:', currentStateForCompare);
    // ---- END LOGGING ----

    // Compare against the combined current state
    Object.keys(currentStateForCompare).forEach(key => {
      const originalValue = original.hasOwnProperty(key) ? original[key] : undefined;
      const newValue = currentStateForCompare[key];
      
      // Use string comparison, especially important for customs_parcel_items
      const valuesDiffer = String(originalValue ?? '') !== String(newValue ?? '');

      if (key !== 'updated_at' && valuesDiffer) {
        changesForLog[key] = {
          // Log the correct original value
          old_value: original.hasOwnProperty(key) ? original[key] : null, 
          new_value: newValue
        };
        hasActualChanges = true;
      }
    });

    // ---- MORE LOGGING ----
    console.log('[handleSubmit] Calculated changesForLog:', changesForLog);
    // ---- END LOGGING ----

    // --- Database Update ---
    // Only proceed if there are actual changes to save
    if (hasActualChanges) {
      try {
        const { error } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', order.id);

        if (error) throw error;

        // --- Activity Log (Re-inserted) ---
        // Log the changes only if the update was successful
        console.log('[handleSubmit] Order updated successfully, logging activity with diff:', changesForLog);
        const { error: activityError } = await supabase
          .from('order_activities')
          .insert([{
            order_id: order.id,
            action_type: 'order_update',
            changes: changesForLog, // Use the calculated diff
            created_at: new Date().toISOString()
          }]);

        if (activityError) {
          // Log the error but don't block the success message for the main update
          console.error('[handleSubmit] Error creating activity log:', activityError);
          toast.error(`Order updated, but failed to log activity: ${activityError.message}`);
        }
        // --- End Activity Log ---

        setUpdateMessage({ text: 'Order updated successfully!', type: 'success' });
        toast.success('Order updated successfully!');
        
        // Update originalFormData to reflect the successful save
        setOriginalFormData(formData);
        setIsFormModified(false); // Reset modified state
        
        // Call the onUpdate callback if provided
        if (onUpdate) {
          onUpdate(updateData); 
        }
        
        // Recalculate status after update
        setCalculatedStatus(calculateOrderStatus({ ...order, ...updateData }));
        
        // Optional: Refresh router cache if needed
        // router.refresh();
        
      } catch (error) {
        console.error('Error updating order:', error);
        setUpdateMessage({ text: `Error: ${error.message}`, type: 'error' });
        toast.error(`Failed to update order: ${error.message}`);
      } finally {
        setIsUpdating(false);
      }
    } else {
      setUpdateMessage({ text: 'No changes to save', type: 'info' });
      toast.info('No changes to save');
      setIsUpdating(false);
    }
  };

  // --- Function to manually fetch status update --- 
  const handleFetchStatus = async () => {
    if (isFetchingStatus) return; // Prevent multiple clicks
    
    setIsFetchingStatus(true);
    toast.loading('Fetching latest status...', { id: 'fetch-status-toast' });
    
    // --- INVESTIGATION LOG --- 
    console.log('[handleFetchStatus] Attempting fetch using orderId:', order?.id);
    // --- END LOG ---
    
    try {
      const response = await fetch(`/api/orders/update-delivery-status?orderId=${order.id}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch status');
      }
      
      // Update local state with the fresh data from the API response
      if (result.order) {
        const updatedOrderData = result.order;
        setFormData(prev => ({
          ...prev,
          status: updatedOrderData.status, // Update status if returned
          expected_delivery_date: updatedOrderData.expected_delivery_date, // Update expected date
          sendcloud_tracking_history: updatedOrderData.sendcloud_tracking_history // Update history
          // Note: We might need to update originalFormData too if we want these changes to persist without saving
        }));
        // Also update the calculated status if needed
        setCalculatedStatus(updatedOrderData.status || calculateOrderStatus({ ...order, ...updatedOrderData }));
        // Optionally update the parent component if needed via onUpdate
        if (onUpdate) {
          onUpdate(updatedOrderData);
        }
      }

      toast.success(`Status Updated: ${result.deliveryStatus || 'N/A'}`, { id: 'fetch-status-toast' });
      
    } catch (error) {
      console.error('Error fetching order status:', error);
      toast.error(`Failed to fetch status: ${error.message}`, { id: 'fetch-status-toast' });
    } finally {
      setIsFetchingStatus(false);
    }
  };
  // --- End function --- 

  // Ensure we always have at least one shipping method
  const displayMethods = shippingMethods.length > 0 ? shippingMethods : DEFAULT_SHIPPING_METHODS;

  // Add helper functions to check if fields are modified and apply styling
  const isFieldModified = (fieldName) => {
    return formData[fieldName] !== originalFormData[fieldName];
  };

  const getFieldBorderClass = (fieldName) => {
    return isFieldModified(fieldName) 
      ? 'border-yellow-400' 
      : 'border-gray-300';
  };

  // --- Handler for Editable Parcel Items Table ---
  const handleParcelItemChange = (index, field, value) => {
    const updatedItems = [...editableParcelItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setEditableParcelItems(updatedItems);
    setIsFormModified(true); // Mark form as modified
  };
  // --- End Handler ---

  // --- Add Parcel Item Function ---
  const addParcelItem = () => {
    setEditableParcelItems(prevItems => [
      ...prevItems,
      // Add a new item with default values
      {
        description: '', 
        quantity: 1, 
        value: '0.00', 
        weight: '0.100', // Default weight, user should adjust
        hs_code: '90151000', // Default HS code
        origin_country: 'FR', // Default origin
        sku: '' 
      }
    ]);
    setIsFormModified(true); // Mark form as modified since structure changed
  };
  // --- End Add Function ---

  // --- Remove Parcel Item Function ---
  const removeParcelItem = (indexToRemove) => {
    setEditableParcelItems(prevItems => 
      prevItems.filter((_, index) => index !== indexToRemove)
    );
    setIsFormModified(true); // Mark form as modified
  };
  // --- End Remove Function ---

  // --- Determine if customs section should be shown ---
  const destinationCountry = formData.shipping_address_country?.toUpperCase();
  const requiresCustoms = destinationCountry && COUNTRIES_REQUIRING_CUSTOMS.includes(destinationCountry);
  // --- End Determination ---

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Customer & Shipping Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-100 p-4 rounded-md">
        {/* Customer Information */}
        <div className="space-y-2">
          <div>
            <label htmlFor="name" className="text-sm font-medium block">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('name')}`}
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <label htmlFor="email" className="text-sm font-medium block">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('email')}`}
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="text-sm font-medium block">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('phone')}`}
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
        </div>
        
        {/* Shipping Information */}
        <div className="space-y-2">
          <h3 className="font-medium text-black">Shipping Information</h3>
          
          <div>
            <label htmlFor="shipping_address_line1" className="text-sm font-medium block">
              Address Line 1
            </label>
            <input
              id="shipping_address_line1"
              name="shipping_address_line1"
              type="text"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('shipping_address_line1')}`}
              value={formData.shipping_address_line1}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <label htmlFor="shipping_address_house_number" className="text-sm font-medium block">
              House Number
            </label>
            <input
              id="shipping_address_house_number"
              name="shipping_address_house_number"
              type="text"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('shipping_address_house_number')}`}
              value={formData.shipping_address_house_number}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <label htmlFor="shipping_address_line2" className="text-sm font-medium block">
              Address Line 2
            </label>
            <input
              id="shipping_address_line2"
              name="shipping_address_line2"
              type="text"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('shipping_address_line2')}`}
              value={formData.shipping_address_line2}
              onChange={handleChange}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="shipping_address_city" className="text-sm font-medium block">
                City
              </label>
              <input
                id="shipping_address_city"
                name="shipping_address_city"
                type="text"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('shipping_address_city')}`}
                value={formData.shipping_address_city}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="shipping_address_postal_code" className="text-sm font-medium block">
                Postal Code
              </label>
              <input
                id="shipping_address_postal_code"
                name="shipping_address_postal_code"
                type="text"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('shipping_address_postal_code')}`}
                value={formData.shipping_address_postal_code}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="shipping_address_country" className="text-sm font-medium block">
              Country Code (e.g. FR, GB, US)
            </label>
            <input
              id="shipping_address_country"
              name="shipping_address_country"
              type="text"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('shipping_address_country')}`}
              value={formData.shipping_address_country}
              onChange={handleChange}
              placeholder="Enter country code (e.g. FR, GB, US)"
              disabled={!isMounted}
            />
            {isMounted && formData.shipping_address_country && COUNTRY_MAPPING[formData.shipping_address_country.toUpperCase()] && (
              <p className="mt-1 text-sm text-gray-600">
                {getCountryDisplayName(formData.shipping_address_country.toUpperCase())}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Order Details Section */}
      <div className="space-y-2 bg-green-100 p-4 rounded-md">
        <h3 className="font-medium text-black">Order Details</h3>
        
        {/* Manual Instruction Display */}
        {order.manual_instruction && (
          <div className="p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
            <p className="font-medium">Manual Instruction:</p>
            <p className="text-sm">{order.manual_instruction}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="order_pack_list_id" className="text-sm font-medium block">
              Order Pack List
            </label>
            <select
              id="order_pack_list_id"
              name="order_pack_list_id"
              className={`w-full px-3 py-2 border-0 ${getFieldBorderClass('order_pack_list_id')} rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${(!formData.order_pack_list_id) ? 'text-gray-400' : 'text-white font-medium'} bg-gray-900 hover:bg-gray-800`}
              value={formData.order_pack_list_id || ''}
              onChange={handleChange}
              disabled={loadingOrderPacks}
            >
              <option value="" className="bg-white text-gray-500">
                {loadingOrderPacks ? 'Loading order packs...' : 'Select an order pack'}
              </option>
              {orderPackLists.map((pack) => (
                <option key={pack.id} value={pack.id} className="bg-white text-black">
                  {pack.label} ({pack.weight} kg)
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Required for creating shipping labels
            </p>
          </div>

          <div>
            <label htmlFor="order_pack_quantity" className="text-sm font-medium block">
              Quantity
            </label>
            <input
              type="number"
              id="order_pack_quantity"
              name="order_pack_quantity"
              min="1"
              max="100"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('order_pack_quantity')}`}
              value={formData.order_pack_quantity}
              onChange={handleChange}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter a quantity between 1 and 100
            </p>
          </div>
          
          <div>
            <label htmlFor="weight" className="text-sm font-medium block">
              Weight (kg)
            </label>
            <input
              id="weight"
              name="weight"
              type="text"
              inputMode="decimal"
              placeholder="0.000"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('weight')}`}
              value={formData.weight}
              onChange={handleChange}
              onBlur={(e) => {
                const value = e.target.value.replace(',', '.');
                const weight = parseFloat(value);
                
                if (!isNaN(weight) && validateWeight(weight)) {
                  const quantity = formData.order_pack_quantity || 1;
                  const packageWeight = (weight / quantity).toFixed(3);
                  
                  // Update both weight and package_weight
                  setFormData(prev => ({
                    ...prev,
                    weight: weight.toFixed(3),
                    package_weight: packageWeight
                  }));
                } else if (value === '') {
                  // Reset to default weight
                  setFormData(prev => ({
                    ...prev,
                    weight: '1.000',
                    package_weight: '1.000'
                  }));
                } else {
                  // Revert to previous valid value
                  setFormData(prev => ({
                    ...prev,
                    weight: prev.weight
                  }));
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter weight between 0.001 and 100.000 kg
            </p>
          </div>
        </div>
        
        <div>
          <label htmlFor="order_notes" className="text-sm font-medium block">
            Order Notes
          </label>
          <textarea
            id="order_notes"
            name="order_notes"
            rows="3"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('order_notes')}`}
            value={formData.order_notes}
            onChange={handleChange}
          ></textarea>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Hidden input to maintain the shipping_method value */}
          <input type="hidden" name="shipping_method" value={formData.shipping_method} />
          
          <div>
            <label htmlFor="instruction" className="text-sm font-medium block">
              Shipping Instruction
              {order.manual_instruction && <span className="ml-1 text-xs text-gray-500">(Manual Override)</span>}
            </label>
            <div className={`shipping-instruction ${(order.manual_instruction || calculatedInstruction)?.toLowerCase().replace(/\s+/g, '-') || 'unknown'} p-2 rounded`}>
              {order.manual_instruction || calculatedInstruction || 'ACTION REQUIRED'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {order.manual_instruction 
                ? 'Instruction manually set.' 
                : 'Auto-calculated based on order status, payment, and tracking information.'}
            </p>
          </div>
        </div>
      </div>

      {/* --- EDITABLE Customs Information Section (Conditionally Rendered) --- */}
      {requiresCustoms && (
        <div className="mt-6 pt-6 border-t border-gray-200 bg-blue-100 border border-blue-300 p-4 rounded-md">
          <h3 className="text-lg font-semibold mb-4">
            Customs Information (Required for {destinationCountry})
          </h3>
          <div className="space-y-4">
            {/* Customs Shipment Type */}
            <div>
              <label htmlFor="customs_shipment_type" className="text-sm font-medium block mb-1">
                Customs Shipment Type
              </label>
              <select
                id="customs_shipment_type"
                name="customs_shipment_type"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('customs_shipment_type')}`}
                value={customsShipmentType}
                onChange={(e) => { setCustomsShipmentType(e.target.value); setIsFormModified(true); }}
              >
                <option value="commercial_goods">Commercial Goods</option>
                <option value="gift">Gift</option>
                <option value="documents">Documents</option>
                <option value="sample">Sample</option>
                <option value="return_merchandise">Return Merchandise</option>
              </select>
            </div>

            {/* Customs Invoice Nr */}
            <div>
              <label htmlFor="customs_invoice_nr" className="text-sm font-medium block mb-1">
                Customs Invoice Nr.
              </label>
              <input
                id="customs_invoice_nr"
                name="customs_invoice_nr"
                type="text"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('customs_invoice_nr')}`}
                value={customsInvoiceNr}
                onChange={(e) => { setCustomsInvoiceNr(e.target.value); setIsFormModified(true); }}
                placeholder="e.g., Order ID or Invoice Number"
              />
            </div>

            {/* Editable Parcel Items Table */}            
            <div>
              <h4 className="text-md font-semibold mb-2">Parcel Items</h4>
              {editableParcelItems.length > 0 ? (
                <div className="overflow-x-auto border rounded-md">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase">Desc.</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase">Qty</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase">Value (€)</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase">Weight (kg)</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase">HS Code</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase">Origin</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {editableParcelItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-1 py-1"><input type="text" value={item.description} onChange={(e) => handleParcelItemChange(index, 'description', e.target.value)} className="w-full border-gray-200 rounded p-1" /></td>
                          <td className="px-1 py-1"><input type="number" value={item.quantity} onChange={(e) => handleParcelItemChange(index, 'quantity', parseInt(e.target.value) || 1)} className="w-16 border-gray-200 rounded p-1" min="1"/></td>
                          <td className="px-1 py-1"><input type="text" inputMode="decimal" value={item.value} onChange={(e) => handleParcelItemChange(index, 'value', e.target.value)} className="w-20 border-gray-200 rounded p-1" /></td>
                          <td className="px-1 py-1"><input type="text" inputMode="decimal" value={item.weight} onChange={(e) => handleParcelItemChange(index, 'weight', e.target.value)} className="w-20 border-gray-200 rounded p-1" /></td>
                          <td className="px-1 py-1"><input type="text" value={item.hs_code} onChange={(e) => handleParcelItemChange(index, 'hs_code', e.target.value)} className="w-24 border-gray-200 rounded p-1" /></td>
                          <td className="px-1 py-1"><input type="text" value={item.origin_country} onChange={(e) => handleParcelItemChange(index, 'origin_country', e.target.value.toUpperCase())} className="w-12 border-gray-200 rounded p-1" maxLength="2" /></td>
                          <td className="px-1 py-1 text-center">
                            <button
                              type="button"
                              onClick={() => removeParcelItem(index)}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                              title="Remove Item"
                            >
                              X
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 italic">No line items found to generate parcel items. Please ensure order has line items.</p>
              )}
              {/* --- Add Item Button (Moved outside conditional rendering of table content) --- */}
              <button
                type="button" 
                onClick={addParcelItem}
                className="mt-2 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                + Add Parcel Item
              </button>
              {/* --- End Button --- */}
            </div>
          </div>
        </div>
      )}
      {/* --- END EDITABLE Customs Information Section --- */}

      {/* Shipping & Tracking Information Section */}
      <div className="mt-8 pt-6 border-t border-gray-200 bg-indigo-100 p-4 rounded-md">
        <h3 className="font-medium text-black mb-4">Shipping & Tracking Information</h3>
        
        <div className="space-y-4">
          {/* Manual Status Fetch Button */}
          <button 
            type="button"
            onClick={handleFetchStatus}
            disabled={isFetchingStatus || !order.id || (!order.tracking_link && !order.shipping_id)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium transition-colors ${isFetchingStatus ? 'bg-gray-200 text-gray-500 cursor-wait' : 'bg-white text-gray-700 hover:bg-gray-50'} ${(!order.id || (!order.tracking_link && !order.shipping_id)) ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={(!order.id || (!order.tracking_link && !order.shipping_id)) ? 'Order needs a tracking link or shipping ID to fetch status' : 'Fetch latest status from Sendcloud'}
          >
            {isFetchingStatus ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Fetching Status...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 00-15.357-2m15.357 2H15" />
                </svg>
                Refresh Status from Sendcloud
              </>
            )}
          </button>

          <div>
            <label htmlFor="status" className="text-sm font-medium block mb-2">
              Order Status
            </label>
            <div className={`order-status ${(order.status ? order.status : calculatedStatus)?.toLowerCase().replace(/\s+/g, '-') || 'unknown'} p-2 rounded`}>
              {order.status ? order.status : calculatedStatus || 'Unknown'}
            </div>
            <div className="text-xs text-gray-500 mt-1 flex justify-between items-center">
              <span>{order.status ? 'Status from SendCloud tracking' : 'No status available'}</span>
              {order.updated_at && (
                <span>Last update: {formatDate(order.last_delivery_status_check)}</span>
              )}
            </div>
          </div>

          {/* Expected Delivery Date - TEMP DEBUG */}
          {order.expected_delivery_date && (
            <div>
               <label className="text-sm font-medium block mb-1">
                 Expected Delivery Date
               </label>
              <div className="text-sm p-2 border border-gray-200 rounded bg-gray-50">
                {formatDate(order.expected_delivery_date)}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="shipping_id" className="text-sm font-medium block">
              SendCloud Parcel ID
              <span className="ml-2 px-1.5 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">Read-only</span>
            </label>
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                id="shipping_id"
                name="shipping_id"
                value={formData.shipping_id}
                placeholder="SendCloud parcel ID"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                readOnly
                disabled
              />
              {formData.shipping_id && (
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

                        // Update form data
                        setFormData(prev => ({
                          ...prev,
                          shipping_id: null,
                          tracking_number: null,
                          tracking_link: null,
                          label_url: null
                        }));

                        // Call onUpdate to update parent component
                        onUpdate({
                          shipping_id: null,
                          tracking_number: null,
                          tracking_link: null,
                          label_url: null,
                          status: 'pending'
                        });

                        // Show success message
                        toast.success('Shipping label removed successfully');

                      } catch (error) {
                        console.error('Error removing shipping ID:', error);
                        toast.error('Failed to remove shipping label');
                      }
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-md transition-colors"
                  title="Remove shipping label"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Delete</span>
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This ID is automatically assigned when you create a shipping label and cannot be edited.
            </p>
          </div>

          <div>
            <label htmlFor="tracking_link" className="text-sm font-medium block">
              Tracking Link
            </label>
            <div className="flex items-center mt-1">
              <input
                type="text"
                id="tracking_link"
                name="tracking_link"
                value={formData.tracking_link}
                onChange={handleChange}
                placeholder="Enter tracking link"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
              {formData.tracking_link && (
                <a 
                  href={formData.tracking_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Open
                </a>
              )}
            </div>
            {formData.shipping_id && !formData.tracking_link && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/orders/fetch-tracking-link?shippingId=${formData.shipping_id}`, {
                      method: 'GET',
                    });

                    if (!response.ok) {
                      throw new Error('Failed to fetch tracking link');
                    }

                    const data = await response.json();
                    if (data.tracking_url) {
                      setFormData(prev => ({
                        ...prev,
                        tracking_link: data.tracking_url
                      }));
                      toast.success('Tracking link updated successfully');
                    } else {
                      toast.error('No tracking link available');
                    }
                  } catch (error) {
                    console.error('Error fetching tracking link:', error);
                    toast.error('Failed to fetch tracking link');
                  }
                }}
                className="mt-2 w-full px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                Fetch Tracking Link from SendCloud
              </button>
            )}
          </div>

          <div>
            <label htmlFor="serial_number" className="text-sm font-medium block">
              Serial Number
            </label>
            <input
              type="text"
              id="serial_number"
              name="serial_number"
              value={formData.serial_number}
              onChange={handleChange}
              placeholder="Enter serial number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent mt-1"
            />
          </div>

          {/* Sendcloud Tracking History - TEMP DEBUG */}
          {order.sendcloud_tracking_history && Array.isArray(order.sendcloud_tracking_history) && order.sendcloud_tracking_history.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-medium text-black mb-2">Tracking History</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
                {order.sendcloud_tracking_history.slice().map((item, index) => ( // Show oldest first
                  <div key={item.parcel_status_history_id || index} className="text-xs text-gray-700 border-b border-gray-100 pb-1 mb-1 last:border-b-0 last:mb-0">
                    <span className="font-medium">{formatDate(item.carrier_update_timestamp)}:</span> {item.carrier_message || item.parent_status || 'Status update'}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm text-gray-600 italic">
            You can manually update tracking information if needed.
          </p>
        </div>
      </div>

      <div className="mt-6 w-full">
        <button
          type="submit"
          className={`w-full px-4 py-3 rounded-md font-medium ${
            isUpdating || !isFormModified
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-black text-white hover:bg-gray-800'
          }`}
          disabled={isUpdating || !isFormModified}
        >
          {isUpdating ? 'Updating...' : 'Update Order'}
        </button>
        
        {updateMessage.text && (
          <div className={`mt-3 p-3 rounded-md text-center ${
            updateMessage.type === 'success' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {updateMessage.text}
          </div>
        )}
      </div>
    </form>
  );
} 