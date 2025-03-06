'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase-client';
import { calculateOrderInstruction, calculateOrderStatus } from '../utils/order-instructions';
import { fetchShippingMethods, DEFAULT_SHIPPING_METHODS } from '../utils/shipping-methods';

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
    shipping_address_country: order.shipping_address_country || '',
    order_pack: order.order_pack || '',
    order_notes: order.order_notes || '',
    weight: order.weight || '1.000',
    shipping_method: order.shipping_method || 'standard',
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

  // Only run this effect after the component has mounted on the client
  useEffect(() => {
    hasMounted.current = true;
  }, []);

  // Fetch shipping methods when component mounts on the client
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

  // Function to manually refresh shipping methods
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
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUpdateMessage({ text: '', type: '' });
      }, 3000);
    } catch (error) {
      console.error('Error syncing shipping methods:', error);
      setUpdateMessage({ 
        text: 'Failed to refresh shipping methods.', 
        type: 'error' 
      });
    } finally {
      setSyncingShippingMethods(false);
    }
  };

  // Calculate the instruction and status whenever relevant order data changes
  useEffect(() => {
    // Skip this effect during server-side rendering
    if (!isMounted) return;
    
    // Create a temporary order object with the current form data and original order data
    const tempOrder = {
      ...order,
      ...formData,
    };
    
    // Calculate the instruction and status
    const instruction = calculateOrderInstruction(tempOrder);
    const status = calculateOrderStatus(tempOrder);
    
    setCalculatedInstruction(instruction);
    setCalculatedStatus(status);
  }, [order, formData, isMounted]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateMessage({ text: '', type: '' });

    try {
      // Calculate the instruction one more time before saving
      const tempOrder = {
        ...order,
        ...formData,
      };
      const instruction = calculateOrderInstruction(tempOrder);

      const { data, error } = await supabase
        .from('orders')
        .update({ 
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          shipping_address_line1: formData.shipping_address_line1,
          shipping_address_line2: formData.shipping_address_line2,
          shipping_address_city: formData.shipping_address_city,
          shipping_address_postal_code: formData.shipping_address_postal_code,
          shipping_address_country: formData.shipping_address_country,
          order_pack: formData.order_pack,
          order_notes: formData.order_notes,
          weight: formData.weight,
          shipping_method: formData.shipping_method,
          instruction: instruction, // Use the calculated instruction
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)
        .select();

      if (error) throw error;

      setUpdateMessage({ 
        text: 'Order updated successfully!', 
        type: 'success' 
      });
      
      // Call the onUpdate callback if provided
      if (onUpdate) onUpdate(data[0]);
      
      // Update the router cache without navigating
      router.refresh();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUpdateMessage({ text: '', type: '' });
      }, 3000);
    } catch (err) {
      console.error('Error updating order:', err);
      setUpdateMessage({ 
        text: 'Failed to update order. Please try again.', 
        type: 'error' 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Ensure we always have at least one shipping method
  const displayMethods = shippingMethods.length > 0 ? shippingMethods : DEFAULT_SHIPPING_METHODS;

  useEffect(() => {
    // This will only run on the client, after the component has mounted
    setIsMounted(true);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Information */}
        <div className="space-y-2">
          <h3 className="font-medium text-black">Customer Information</h3>
          
          <div>
            <label htmlFor="name" className="text-sm font-medium block">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                value={formData.shipping_address_postal_code}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="shipping_address_country" className="text-sm font-medium block">
              Country
            </label>
            <input
              id="shipping_address_country"
              name="shipping_address_country"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              value={formData.shipping_address_country}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>
      
      {/* Order Details */}
      <div className="space-y-2">
        <h3 className="font-medium text-black">Order Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="order_pack" className="text-sm font-medium block">
              Package Type
            </label>
            <select
              id="order_pack"
              name="order_pack"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              value={formData.order_pack}
              onChange={handleChange}
            >
              <option value="">Select a package</option>
              {orderPackOptions.map((option, index) => (
                <option key={index} value={option.value}>{option.label}</option>
              ))}
            </select>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            value={formData.order_notes}
            onChange={handleChange}
          ></textarea>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <div className="flex items-center space-x-2">
              <label htmlFor="shipping_method" className="text-sm font-medium">
                Shipping Method
              </label>
              <button
                type="button"
                onClick={handleSyncShippingMethods}
                disabled={syncingShippingMethods || loadingShippingMethods}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                title="Refresh shipping methods"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-4 w-4 ${syncingShippingMethods ? 'animate-spin' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
              </button>
            </div>
            <select
              id="shipping_method"
              name="shipping_method"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent mt-1"
              value={formData.shipping_method}
              onChange={handleChange}
              disabled={loadingShippingMethods || isUpdating || syncingShippingMethods}
            >
              {displayMethods.map(method => (
                <option key={method.id} value={method.code}>
                  {method.name}
                </option>
              ))}
            </select>
            {(loadingShippingMethods || syncingShippingMethods) && (
              <p className="text-xs text-gray-500 mt-1">
                {syncingShippingMethods ? 'Refreshing shipping methods...' : 'Loading shipping methods...'}
              </p>
            )}
          </div>
          
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
              Order Status (From SendCloud)
            </label>
            <div className={`order-status ${calculatedStatus?.toLowerCase().replace(/\s+/g, '-') || 'unknown'} p-2 rounded`}>
              {calculatedStatus || 'EMPTY'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Status from SendCloud when tracking link is present.
            </p>
          </div>
        </div>
      </div>

      {updateMessage.text && (
        <div 
          className={`p-2 rounded text-sm ${
            updateMessage.type === 'success' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}
        >
          {updateMessage.text}
        </div>
      )}

      <button 
        type="submit" 
        disabled={isUpdating}
        className="w-full px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
      >
        {isUpdating ? 'Updating...' : 'Update Order'}
      </button>
    </form>
  );
} 