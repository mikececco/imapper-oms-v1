'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchShippingMethods, DEFAULT_SHIPPING_METHODS } from '../utils/shipping-methods';

export default function ShippingMethodDropdown({ currentMethod, orderId, onUpdate }) {
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
  
  // Function to manually refresh shipping methods
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
      
      if (!response.ok) {
        throw new Error('Failed to update shipping method');
      }
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating shipping method:', error);
      // Revert to the previous value on error
      setShippingMethod(currentMethod || 'standard');
      alert('Failed to update shipping method. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Ensure we always have at least one shipping method
  const displayMethods = shippingMethods.length > 0 ? shippingMethods : DEFAULT_SHIPPING_METHODS;
  
  return (
    <div className="shipping-method-dropdown flex items-center">
      <select
        value={shippingMethod}
        onChange={handleChange}
        disabled={isUpdating || loading || syncing}
        className="form-control form-control-sm"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          padding: '4px 8px',
          fontSize: '0.875rem',
          width: '100%',
          maxWidth: '120px',
          backgroundColor: isHovered ? '#e0e0e0' : '#f5f5f5',
          color: '#000000',
          border: '1px solid #000000',
          cursor: (isUpdating || loading || syncing) ? 'wait' : 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        {displayMethods.map(method => (
          <option key={method.id} value={method.code}>
            {method.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleSyncShippingMethods}
        disabled={syncing || loading || isUpdating}
        className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-1 focus:ring-black"
        title="Refresh shipping methods"
        style={{ minWidth: '20px' }}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} 
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
  );
} 