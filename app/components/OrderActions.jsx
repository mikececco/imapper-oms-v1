'use client';

import { useState } from 'react';
import { updateOrderStatus, updatePaymentStatus, updateShippingStatus } from '../utils/supabase';

export function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {status}
    </span>
  );
}

export function PaymentBadge({ isPaid, orderId }) {
  const [paid, setPaid] = useState(isPaid);
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePaymentUpdate = async () => {
    setIsUpdating(true);
    const result = await updatePaymentStatus(orderId);
    if (result.success) {
      setPaid(result.isPaid);
    } else {
      alert('Failed to update payment status');
    }
    setIsUpdating(false);
  };

  return (
    <span 
      className={`paid-badge ${paid ? 'paid-yes' : 'paid-no'}`}
      onClick={handlePaymentUpdate}
      style={{ cursor: isUpdating ? 'wait' : 'pointer' }}
    >
      {isUpdating ? '...' : (paid ? 'PAID' : 'UNPAID')}
    </span>
  );
}

export function ShippingToggle({ okToShip, orderId }) {
  const [isOkToShip, setIsOkToShip] = useState(okToShip);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    setIsUpdating(true);
    const result = await updateShippingStatus(orderId);
    if (result.success) {
      setIsOkToShip(result.okToShip);
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
      <span className="toggle-slider"></span>
    </label>
  );
}

export function StatusSelector({ currentStatus, orderId }) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setIsUpdating(true);
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.success) {
      setStatus(newStatus);
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
      style={{ padding: '0.25rem', borderRadius: '4px', opacity: isUpdating ? 0.5 : 1 }}
    >
      <option value="pending">Pending</option>
      <option value="shipped">Shipped</option>
      <option value="delivered">Delivered</option>
      <option value="cancelled">Cancelled</option>
    </select>
  );
} 