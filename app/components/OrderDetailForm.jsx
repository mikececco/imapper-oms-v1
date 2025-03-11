'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../utils/supabase-client';
import { calculateOrderInstruction, calculateOrderStatus } from '../utils/order-instructions';
import { fetchShippingMethods, DEFAULT_SHIPPING_METHODS } from '../utils/shipping-methods';
import CustomOrderPackModal from './CustomOrderPackModal';
import { normalizeCountryToCode, getCountryDisplayName, COUNTRY_MAPPING } from '../utils/country-utils';

export default function OrderDetailForm({ order, orderPackOptions, onUpdate }) {
  const router = useRouter();
  // Use useRef to track client-side rendering
  const hasMounted = useRef(false);
  
  const [formData, setFormData] = useState({
    name: order.name || '',
    email: order.email || '',
    phone: order.phone || '',
    shipping_address_line1: order.shipping_address_line1 || '',
    shipping_address_line2: order.shipping_address_line2 || '',
    shipping_address_city: order.shipping_address_city || '',
    shipping_address_postal_code: order.shipping_address_postal_code || '',
    shipping_address_country: normalizeCountryToCode(order.shipping_address_country || ''),
    order_pack: order.order_pack || '',
    order_pack_label: order.order_pack_label || '',
    order_notes: order.order_notes || '',
    weight: order.weight || '1.000',
    shipping_method: order.shipping_method || 'standard',
    tracking_link: order.tracking_link || '',
    tracking_number: order.tracking_number || '',
    shipping_id: order.shipping_id || '',
  });
  
  const [calculatedInstruction, setCalculatedInstruction] = useState(order.instruction || 'ACTION REQUIRED');
  const [calculatedStatus, setCalculatedStatus] = useState(calculateOrderStatus(order));
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState({ text: '', type: '' });
  // Initialize with default methods to avoid hydration mismatch
  const [shippingMethods, setShippingMethods] = useState(DEFAULT_SHIPPING_METHODS);
  const [loadingShippingMethods, setLoadingShippingMethods] = useState(false); // Start with false to match server rendering
  const [syncingShippingMethods, setSyncingShippingMethods] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isCustomPackModalOpen, setIsCustomPackModalOpen] = useState(false);

  // Add state to track if form has been modified
  const [isFormModified, setIsFormModified] = useState(false);
  
  // Store the original form data for comparison
  const [originalFormData, setOriginalFormData] = useState({});
  
  // Initialize form data and original data
  useEffect(() => {
    const initialData = {
      name: order.name || '',
      email: order.email || '',
      phone: order.phone || '',
      shipping_address_line1: order.shipping_address_line1 || '',
      shipping_address_line2: order.shipping_address_line2 || '',
      shipping_address_city: order.shipping_address_city || '',
      shipping_address_postal_code: order.shipping_address_postal_code || '',
      shipping_address_country: normalizeCountryToCode(order.shipping_address_country || ''),
      order_pack: order.order_pack || '',
      order_pack_label: order.order_pack_label || '',
      order_notes: order.order_notes || '',
      weight: order.weight || '1.000',
      shipping_method: order.shipping_method || 'standard',
      tracking_link: order.tracking_link || '',
      tracking_number: order.tracking_number || '',
      shipping_id: order.shipping_id || '',
    };
    
    setFormData(initialData);
    setOriginalFormData(initialData);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Prevent changes to shipping_id if it already has a value
    if (name === 'shipping_id' && formData.shipping_id) {
      return;
    }
    
    // Handle custom order pack selection
    if (name === 'order_pack' && value === 'custom') {
      setIsCustomPackModalOpen(true);
      return;
    }
    
    // Special handling for country field to normalize it
    if (name === 'shipping_address_country') {
      // Convert to uppercase and trim
      const normalizedValue = value.trim().toUpperCase();
      setFormData(prev => ({
        ...prev,
        [name]: normalizedValue
      }));
    } else if (name === 'order_pack') {
      // Find the matching order pack option to get the label
      const orderPackOption = orderPackOptions.find(option => option.value === value);
      setFormData(prev => ({
        ...prev,
        order_pack: value,
        order_pack_label: orderPackOption ? orderPackOption.label : value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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
    
    try {
      // Create update object
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        shipping_address_line1: formData.shipping_address_line1,
        shipping_address_line2: formData.shipping_address_line2,
        shipping_address_city: formData.shipping_address_city,
        shipping_address_postal_code: formData.shipping_address_postal_code,
        shipping_address_country: formData.shipping_address_country,
        order_pack: formData.order_pack,
        order_pack_label: formData.order_pack_label,
        order_notes: formData.order_notes,
        weight: formData.weight,
        shipping_method: formData.shipping_method,
        tracking_link: formData.tracking_link,
        tracking_number: formData.tracking_number,
        updated_at: new Date().toISOString()
      };
      
      // Only include shipping_id in the update if it wasn't already set in the original order
      if (!order.shipping_id && formData.shipping_id) {
        updateData.shipping_id = formData.shipping_id;
      }
      
      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Calculate new instruction based on updated data
      const newInstruction = calculateOrderInstruction(data);
      setCalculatedInstruction(newInstruction);
      
      // Calculate new status based on updated data
      const newStatus = calculateOrderStatus(data);
      setCalculatedStatus(newStatus);
      
      // If onUpdate is provided, call it with the updated order data
      if (onUpdate) {
        onUpdate({
          ...data,
          instruction: newInstruction
        });
      }
      
      // Update the router cache without navigating
      router.refresh();
      
      // Show success message
      setUpdateMessage({ 
        text: 'Order updated successfully!', 
        type: 'success' 
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setUpdateMessage({ text: '', type: '' });
      }, 3000);
    } catch (error) {
      console.error('Error updating order:', error);
      
      // Show error message
      setUpdateMessage({ 
        text: `Error updating order: ${error.message}`, 
        type: 'error' 
      });
    } finally {
      setIsUpdating(false);
    }
  };

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Information */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-black">Customer Information</h3>
            {order.customer_id && (
              <Link 
                href={`/customers/${order.customer_id}`}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                View Customer Profile
              </Link>
            )}
          </div>
          
          <div>
            <label htmlFor="name" className="text-sm font-medium block">
              Name
              {order.customer_id && (
                <Link 
                  href={`/customers/${order.customer_id}`}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  (View Profile)
                </Link>
              )}
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
            {isMounted ? (
              <input
                id="shipping_address_country"
                name="shipping_address_country"
                type="text"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('shipping_address_country')}`}
                value={formData.shipping_address_country}
                onChange={handleChange}
                placeholder="Enter country code (e.g. FR, GB, US)"
              />
            ) : (
              <input
                id="shipping_address_country"
                name="shipping_address_country"
                type="text"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('shipping_address_country')}`}
                value={formData.shipping_address_country}
                readOnly
              />
            )}
            {formData.shipping_address_country && COUNTRY_MAPPING[formData.shipping_address_country.toUpperCase()] && (
              <p className="mt-1 text-sm text-gray-600">
                {getCountryDisplayName(formData.shipping_address_country.toUpperCase())}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Order Details */}
      <div className="space-y-2">
        <h3 className="font-medium text-black">Order Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="order_pack" className="text-sm font-medium block">
              Order Pack List
            </label>
            <select
              id="order_pack"
              name="order_pack"
              required
              className={`w-full px-3 py-2 border ${getFieldBorderClass('order_pack')} rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${(!formData.order_pack || formData.order_pack === '') ? 'text-gray-500' : 'text-black'}`}
              value={formData.order_pack || ''}
              onChange={handleChange}
              aria-describedby="order-pack-description"
            >
              <option value="" disabled>Select an order pack</option>
              {orderPackOptions.map((option, index) => (
                <option key={index} value={option.value}>{option.label}</option>
              ))}
              <option value="custom">+ Add Order Pack</option>
            </select>
            <p id="order-pack-description" className="text-xs text-gray-500 mt-1">
              Required for creating shipping labels
            </p>
            
            <CustomOrderPackModal 
              isOpen={isCustomPackModalOpen}
              onClose={() => setIsCustomPackModalOpen(false)}
              onSave={handleSaveCustomPack}
            />
          </div>
          
          <div>
            <label htmlFor="weight" className="text-sm font-medium block">
              Weight (kg)
            </label>
            <input
              id="weight"
              name="weight"
              type="text"
              placeholder="1.000"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${getFieldBorderClass('weight')}`}
              value={formData.weight}
              onChange={handleChange}
            />
            <p className="text-xs text-gray-500 mt-1">
              Used for shipping label creation (e.g., 1.000 for 1kg)
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
          {/* Shipping Method dropdown hidden */}
          {/* Hidden input to maintain the shipping_method value */}
          <input type="hidden" name="shipping_method" value={formData.shipping_method} />
          
          <div>
            <label htmlFor="instruction" className="text-sm font-medium block">
              Shipping Instruction (Auto-calculated)
            </label>
            <div className={`shipping-instruction ${calculatedInstruction?.toLowerCase().replace(/\s+/g, '-') || 'unknown'} p-2 rounded`}>
              {calculatedInstruction || 'ACTION REQUIRED'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Based on order status, payment, and tracking information.
            </p>
          </div>
          
          <div>
            <label htmlFor="status" className="text-sm font-medium block">
              Delivery Status (From SendCloud)
            </label>
            <div className={`order-status ${calculatedStatus?.toLowerCase().replace(/\s+/g, '-') || 'unknown'} p-2 rounded`}>
              {calculatedStatus || 'EMPTY'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Status from SendCloud when tracking link is present.
            </p>
          </div>
        </div>
        
        {/* Tracking Information */}
        <div className="mt-4">
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
          <div className="mt-2">
            <label htmlFor="tracking_number" className="text-sm font-medium block">
              Tracking Number
            </label>
            <input
              type="text"
              id="tracking_number"
              name="tracking_number"
              value={formData.tracking_number}
              onChange={handleChange}
              placeholder="Enter tracking number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent mt-1"
            />
          </div>
          <div className="mt-2">
            <label htmlFor="shipping_id" className="text-sm font-medium block">
              SendCloud Parcel ID
              {formData.shipping_id && (
                <span className="ml-2 px-1.5 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">Locked</span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                id="shipping_id"
                name="shipping_id"
                value={formData.shipping_id}
                onChange={handleChange}
                placeholder="SendCloud parcel ID"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${formData.shipping_id ? 'bg-gray-50 text-gray-700' : ''} ${!formData.shipping_id ? 'focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent' : ''}`}
                readOnly={!!formData.shipping_id}
              />
              {formData.shipping_id && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              )}
            </div>
            {formData.shipping_id && (
              <p className="text-xs text-gray-500 mt-1">
                SendCloud Parcel ID cannot be edited once assigned.
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
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