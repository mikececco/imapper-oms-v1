'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchShippingMethods, DEFAULT_SHIPPING_METHODS } from '../utils/shipping-methods';

export default function ShippingMethodDropdown({ currentMethod, orderId, onUpdate }) {
  const router = useRouter();
  // Use useRef to track client-side rendering
  const hasMounted = useRef(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [shippingMethod, setShippingMethod] = useState(currentMethod || 'standard');
  const [isHovered, setIsHovered] = useState(false);
  // Initialize with default methods to avoid hydration mismatch
  const [shippingMethods, setShippingMethods] = useState(DEFAULT_SHIPPING_METHODS);
  const [loading, setLoading] = useState(false); // Start with false to match server rendering
  const [syncing, setSyncing] = useState(false);
  
  // Only run this effect after the component has mounted on the client
  useEffect(() => {
    hasMounted.current = true;
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
        setLoading(true);
        const methods = await fetchShippingMethods();
        
        // Only update state if component is still mounted
        if (isMounted) {
          setShippingMethods(methods);
          
          // If current method is not in the list, set to first available method
          if (methods.length > 0 && !methods.some(m => m.code === shippingMethod)) {
            setShippingMethod(methods[0].code);
          }
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
          setLoading(false);
        }
      }
    };
    
    loadShippingMethods();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [hasMounted]); // Remove shippingMethod dependency to prevent unnecessary API calls
  */
  
  // Function to manually refresh shipping methods - kept but not used
  const loadShippingMethods = async () => {
    try {
      setLoading(true);
      const methods = await fetchShippingMethods();
      
      setShippingMethods(methods);
      
      // If current method is not in the list, set to first available method
      if (methods.length > 0 && !methods.some(m => m.code === shippingMethod)) {
        setShippingMethod(methods[0].code);
      }
    } catch (error) {
      console.error('Error loading shipping methods:', error);
      // Ensure we have the default methods
      setShippingMethods(DEFAULT_SHIPPING_METHODS);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to manually refresh shipping methods - kept but disabled
  const handleSyncShippingMethods = async (e) => {
    e.stopPropagation(); // Prevent event bubbling
    
    if (syncing || loading) return; // Prevent multiple clicks
    
    setSyncing(true);
    
    try {
      // Force bypass cache
      const methods = await fetchShippingMethods(true, true);
      setShippingMethods(methods);
      
      // If current method is not in the list, set to first available method
      if (methods.length > 0 && !methods.some(m => m.code === shippingMethod)) {
        setShippingMethod(methods[0].code);
      }
    } catch (error) {
      console.error('Error syncing shipping methods:', error);
    } finally {
      setSyncing(false);
    }
  };
  
  const handleChange = async (e) => {
    const newValue = e.target.value;
    const previousValue = shippingMethod;
    
    // Optimistic update - immediately update the UI
    setShippingMethod(newValue);
    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/orders/${orderId}/update-shipping-method`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shipping_method: newValue }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update shipping method');
      }
      
      // If onUpdate is provided, call it with the updated order data
      // This allows parent components to update their state without a full refresh
      if (onUpdate) {
        // Create an updated order object with the new shipping method
        const updatedOrder = {
          id: orderId,
          shipping_method: newValue,
          // Include any other fields that might be needed by the parent component
          updated_at: new Date().toISOString()
        };
        
        onUpdate(updatedOrder);
      }
      
      // Update the router cache without navigating
      router.refresh();
    } catch (error) {
      console.error('Error updating shipping method:', error);
      // Revert to the previous value on error
      setShippingMethod(previousValue);
      alert('Failed to update shipping method. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Ensure we always have at least one shipping method
  const displayMethods = shippingMethods.length > 0 ? shippingMethods : DEFAULT_SHIPPING_METHODS;
  
  // Return null to hide the component
  return null;
} 