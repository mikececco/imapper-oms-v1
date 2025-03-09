'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderStatus, updatePaymentStatus, updateShippingStatus } from '../utils/supabase-client';
import { ORDER_PACK_OPTIONS } from '../utils/constants';
import CustomOrderPackModal from './CustomOrderPackModal';

export function StatusBadge({ status }) {
  return (
    <span className="status-badge">
      {status}
    </span>
  );
}

export function PaymentBadge({ isPaid, orderId, onUpdate }) {
  const router = useRouter();
  const [paid, setPaid] = useState(isPaid);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handlePaymentUpdate = async () => {
    const previousValue = paid;
    
    // Optimistic update - immediately update the UI
    setPaid(!paid);
    setIsUpdating(true);
    
    try {
      const result = await updatePaymentStatus(orderId);
      if (!result.success) {
        throw new Error('Failed to update payment status');
      }
      
      // If onUpdate is provided, call it with the updated order data
      if (onUpdate) {
        // Create an updated order object with the new payment status
        const updatedOrder = {
          id: orderId,
          paid: result.isPaid,
          // Include any other fields that might be needed by the parent component
          updated_at: new Date().toISOString()
        };
        
        onUpdate(updatedOrder);
      }
      
      // Update the router cache without navigating
      router.refresh();
    } catch (error) {
      console.error('Error updating payment status:', error);
      // Revert to the previous value on error
      setPaid(previousValue);
      alert('Failed to update payment status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <span 
      className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium cursor-pointer ${
        paid 
          ? isHovered ? 'bg-green-600' : 'bg-green-500' 
          : isHovered ? 'bg-red-600' : 'bg-red-500'
      } text-white transition-colors duration-200`}
      onClick={handlePaymentUpdate}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isUpdating ? '...' : (paid ? 'PAID' : 'UNPAID')}
    </span>
  );
}

export function ShippingToggle({ okToShip, orderId, onUpdate }) {
  const router = useRouter();
  const [isOkToShip, setIsOkToShip] = useState(okToShip);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = async () => {
    const previousValue = isOkToShip;
    
    // Optimistic update - immediately update the UI
    setIsOkToShip(!isOkToShip);
    setIsUpdating(true);
    
    try {
      const result = await updateShippingStatus(orderId);
      if (!result.success) {
        throw new Error('Failed to update shipping status');
      }
      
      // If onUpdate is provided, call it with the updated order data
      if (onUpdate) {
        // Create an updated order object with the new shipping status
        const updatedOrder = {
          id: orderId,
          ok_to_ship: result.okToShip,
          // Include any other fields that might be needed by the parent component
          updated_at: new Date().toISOString()
        };
        
        onUpdate(updatedOrder);
      }
      
      // Update the router cache without navigating
      router.refresh();
    } catch (error) {
      console.error('Error updating shipping status:', error);
      // Revert to the previous value on error
      setIsOkToShip(previousValue);
      alert('Failed to update shipping status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <label 
      className="toggle-switch" 
      style={{ opacity: isUpdating ? 0.5 : 1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <input 
        type="checkbox" 
        checked={isOkToShip} 
        onChange={handleToggle}
        disabled={isUpdating}
      />
      <span 
        className="toggle-slider" 
        style={{ 
          backgroundColor: isOkToShip 
            ? (isHovered ? '#333333' : '#000000') 
            : (isHovered ? '#bbbbbb' : '#cccccc'),
          transition: 'all 0.2s ease'
        }}
      ></span>
    </label>
  );
}

export function StatusSelector({ currentStatus, orderId, onUpdate }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    const previousStatus = status;
    
    // Optimistic update
    setStatus(newStatus);
    setIsUpdating(true);
    
    try {
      const result = await updateOrderStatus(orderId, newStatus);
      if (result.success) {
        // If onUpdate is provided, call it with the updated order data
        if (onUpdate) {
          const updatedOrder = {
            id: orderId,
            status: newStatus,
            updated_at: new Date().toISOString()
          };
          
          onUpdate(updatedOrder);
        }
        
        // Update the router cache without navigating
        router.refresh();
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      // Revert to the previous value on error
      setStatus(previousStatus);
      alert('Failed to update order status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <select 
      value={status} 
      onChange={handleStatusChange}
      disabled={isUpdating}
      className="status-select"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        padding: '0.25rem', 
        borderRadius: '4px', 
        opacity: isUpdating ? 0.5 : 1,
        backgroundColor: isHovered ? '#e0e0e0' : '#f5f5f5',
        color: '#000000',
        border: '1px solid #000000',
        transition: 'all 0.2s ease',
        cursor: isUpdating ? 'wait' : 'pointer'
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
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [orderPack, setOrderPack] = useState(currentPack || '');
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Check if the current pack is not in the predefined options
  useEffect(() => {
    if (currentPack && !ORDER_PACK_OPTIONS.some(option => option.value === currentPack)) {
      setOrderPack(currentPack);
    }
  }, [currentPack]);
  
  const handleChange = async (e) => {
    const newValue = e.target.value;
    
    // If "Add custom..." option is selected, show the modal
    if (newValue === 'custom') {
      setIsModalOpen(true);
      return;
    }
    
    const previousValue = orderPack;
    
    // Optimistic update - immediately update the UI
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
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update order pack');
      }
      
      // If onUpdate is provided, call it with the updated order data
      // This allows parent components to update their state without a full refresh
      if (onUpdate) {
        // Create an updated order object with the new pack
        const updatedOrder = {
          id: orderId,
          order_pack: newValue,
          // Include any other fields that might be needed by the parent component
          updated_at: new Date().toISOString()
        };
        
        onUpdate(updatedOrder);
      }
      
      // Update the router cache without navigating
      router.refresh();
    } catch (error) {
      console.error('Error updating order pack:', error);
      // Revert to the previous value on error
      setOrderPack(previousValue);
      alert('Failed to update order pack. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleSaveCustomPack = async (customValue) => {
    // Check if the custom value already exists in the predefined options
    const isDuplicate = ORDER_PACK_OPTIONS.some(option => 
      option.value.toLowerCase() === customValue.toLowerCase()
    );
    
    if (isDuplicate) {
      throw new Error('This Order Pack already exists. Please use a different name.');
    }
    
    const previousValue = orderPack;
    
    // Optimistic update - immediately update the UI
    setOrderPack(customValue);
    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/orders/${orderId}/update-pack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderPack: customValue }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update order pack');
      }
      
      // If onUpdate is provided, call it with the updated order data
      if (onUpdate) {
        const updatedOrder = {
          id: orderId,
          order_pack: customValue,
          updated_at: new Date().toISOString()
        };
        
        onUpdate(updatedOrder);
      }
      
      // Update the router cache without navigating
      router.refresh();
    } catch (error) {
      console.error('Error updating order pack:', error);
      // Revert to the previous value on error
      setOrderPack(previousValue);
      throw error; // Re-throw to be caught by the modal
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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          padding: '4px 8px',
          fontSize: '0.875rem',
          width: '100%',
          maxWidth: '180px',
          backgroundColor: isHovered ? '#e0e0e0' : '#f5f5f5',
          color: '#000000',
          border: '1px solid #000000',
          cursor: isUpdating ? 'wait' : 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <option value="" disabled>Select package</option>
        {ORDER_PACK_OPTIONS.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value="custom">+ Add custom package...</option>
      </select>
      
      <CustomOrderPackModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCustomPack}
      />
    </div>
  );
} 