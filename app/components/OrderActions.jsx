'use client';

import { useState } from 'react';
import { updateOrderStatus, updatePaymentStatus, updateShippingStatus } from '../utils/supabase-client';
import { ORDER_PACK_OPTIONS } from '../utils/constants';

export function StatusBadge({ status }) {
  return (
    <span className="status-badge">
      {status}
    </span>
  );
}

export function PaymentBadge({ isPaid, orderId, onUpdate }) {
  const [paid, setPaid] = useState(isPaid);
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePaymentUpdate = async () => {
    setIsUpdating(true);
    const result = await updatePaymentStatus(orderId);
    if (result.success) {
      setPaid(result.isPaid);
      if (onUpdate) onUpdate();
    } else {
      alert('Failed to update payment status');
    }
    setIsUpdating(false);
  };

  return (
    <span 
      className="paid-badge"
      onClick={handlePaymentUpdate}
      style={{ cursor: isUpdating ? 'wait' : 'pointer' }}
    >
      {isUpdating ? '...' : (paid ? 'PAID' : 'UNPAID')}
    </span>
  );
}

export function ShippingToggle({ okToShip, orderId, onUpdate }) {
  const [isOkToShip, setIsOkToShip] = useState(okToShip);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    setIsUpdating(true);
    const result = await updateShippingStatus(orderId);
    if (result.success) {
      setIsOkToShip(result.okToShip);
      if (onUpdate) onUpdate();
    } else {
      alert('Failed to update shipping status');
    }
    setIsUpdating(false);
  };

  return (
    <label className="toggle-switch" style={{ opacity: isUpdating ? 0.5 : 1 }}>
      <input 
        type="checkbox" 
        checked={isOkToShip} 
        onChange={handleToggle}
        disabled={isUpdating}
      />
      <span className="toggle-slider" style={{ backgroundColor: isOkToShip ? '#000000' : '#cccccc' }}></span>
    </label>
  );
}

export function StatusSelector({ currentStatus, orderId, onUpdate }) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setIsUpdating(true);
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.success) {
      setStatus(newStatus);
      if (onUpdate) onUpdate();
    } else {
      alert('Failed to update order status');
    }
    setIsUpdating(false);
  };

  return (
    <select 
      value={status} 
      onChange={handleStatusChange}
      disabled={isUpdating}
      className="status-select"
      style={{ 
        padding: '0.25rem', 
        borderRadius: '4px', 
        opacity: isUpdating ? 0.5 : 1,
        backgroundColor: '#f5f5f5',
        color: '#000000',
        border: '1px solid #000000'
      }}
    >
      <option value="pending">Pending</option>
      <option value="shipped">Shipped</option>
      <option value="delivered">Delivered</option>
      <option value="cancelled">Cancelled</option>
    </select>
  );
}

export function OrderPackDropdown({ currentPack, orderId, onUpdate }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [orderPack, setOrderPack] = useState(currentPack || '');
  
  const handleChange = async (e) => {
    const newValue = e.target.value;
    setOrderPack(newValue);
    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/orders/${orderId}/update-pack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderPack: newValue }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update order pack');
      }
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating order pack:', error);
      // Revert to the previous value on error
      setOrderPack(currentPack);
      alert('Failed to update order pack. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="order-pack-dropdown">
      <select
        value={orderPack}
        onChange={handleChange}
        disabled={isUpdating}
        className="form-control form-control-sm"
        style={{
          padding: '4px 8px',
          fontSize: '0.875rem',
          width: '100%',
          maxWidth: '180px',
          backgroundColor: isUpdating ? '#f0f0f0' : '#f5f5f5',
          color: '#000000',
          border: '1px solid #000000',
          cursor: isUpdating ? 'wait' : 'pointer'
        }}
      >
        <option value="" disabled>Select package</option>
        {ORDER_PACK_OPTIONS.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
} 