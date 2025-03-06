'use client';

import { useState } from 'react';

export default function ShippingMethodDropdown({ currentMethod, orderId, onUpdate }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [shippingMethod, setShippingMethod] = useState(currentMethod || 'standard');
  const [isHovered, setIsHovered] = useState(false);
  
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
  
  return (
    <div className="shipping-method-dropdown">
      <select
        value={shippingMethod}
        onChange={handleChange}
        disabled={isUpdating}
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
          cursor: isUpdating ? 'wait' : 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <option value="standard">Standard</option>
        <option value="express">Express</option>
        <option value="priority">Priority</option>
        <option value="economy">Economy</option>
      </select>
    </div>
  );
} 