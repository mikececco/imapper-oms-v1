'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderStatus, updatePaymentStatus, updateShippingStatus } from '../utils/supabase-client';
import { ORDER_PACK_OPTIONS } from '../utils/constants';
import CustomOrderPackModal from './CustomOrderPackModal';
import { useSupabase } from './Providers';
import { toast } from 'react-hot-toast';

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
      toast.error('Failed to update payment status');
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
      toast.error('Failed to update shipping status');
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
            ? (isHovered ? '#15803d' : '#22c55e')  // Using green-700 for hover and green-500 for active
            : (isHovered ? '#dc2626' : '#ef4444'),  // Using red-600 for hover and red-500 for active
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
      toast.error('Failed to update order status');
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

export function OrderPackDropdown({ order, orderId, onUpdate }) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [orderPack, setOrderPack] = useState(order?.order_pack || '');
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderPackLists, setOrderPackLists] = useState([]);
  const [loadingOrderPacks, setLoadingOrderPacks] = useState(true);
  const supabase = useSupabase();
  
  // Fetch order packs when component mounts
  useEffect(() => {
    const fetchOrderPacks = async () => {
      try {
        const { data, error } = await supabase
          .from('order_pack_lists')
          .select('*')
          .order('label');
        
        if (error) throw error;
        
        setOrderPackLists(data || []);
      } catch (error) {
        console.error('Error fetching order packs:', error);
      } finally {
        setLoadingOrderPacks(false);
      }
    };

    if (supabase) {
      fetchOrderPacks();
    }
  }, [supabase]);
  
  const handleChange = async (e) => {
    const packId = e.target.value;
    
    // If "Add custom..." option is selected, show the modal
    if (packId === 'custom') {
      setIsModalOpen(true);
      return;
    }
    
    const selectedPack = orderPackLists.find(pack => pack.id === packId);
    if (!selectedPack) return;
    
    const previousValue = orderPack;
    
    // Optimistic update - immediately update the UI
    setOrderPack(selectedPack.value);
    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/orders/${orderId}/update-pack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          orderPack: selectedPack.value,
          orderPackId: selectedPack.id,
          orderPackLabel: selectedPack.label,
          weight: selectedPack.weight
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update order pack');
      }
      
      // If onUpdate is provided, call it with the updated order data
      if (onUpdate) {
        // Create an updated order object with the new pack
        const updatedOrder = {
          id: orderId,
          order_pack: selectedPack.value,
          order_pack_list_id: selectedPack.id,
          order_pack_label: selectedPack.label,
          weight: selectedPack.weight,
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
      toast.error('Failed to update order pack');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleSaveCustomPack = async (customValue) => {
    // Check if the custom value already exists in the predefined options
    const isDuplicate = orderPackLists.some(pack => 
      pack.value.toLowerCase() === customValue.toLowerCase()
    );
    
    if (isDuplicate) {
      throw new Error('This Order Pack already exists. Please use a different name.');
    }
    
    const previousValue = orderPack;
    
    // Optimistic update - immediately update the UI
    setOrderPack(customValue);
    setIsUpdating(true);
    
    try {
      // First create the new order pack in the database
      const normalizedValue = customValue
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_')
        .replace(/[^A-Z0-9_+-]/g, '');

      const { data: newPack, error: insertError } = await supabase
        .from('order_pack_lists')
        .insert([{
          value: normalizedValue,
          label: customValue.trim(),
          weight: 1.000, // Default weight
          height: 20.00, // Default dimensions
          width: 15.00,
          length: 10.00
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Then update the order with the new pack
      const response = await fetch(`/api/orders/${orderId}/update-pack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          orderPack: newPack.value,
          orderPackId: newPack.id,
          orderPackLabel: newPack.label,
          weight: newPack.weight
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update order pack');
      }
      
      // If onUpdate is provided, call it with the updated order data
      if (onUpdate) {
        const updatedOrder = {
          id: orderId,
          order_pack: newPack.value,
          order_pack_list_id: newPack.id,
          order_pack_label: newPack.label,
          weight: newPack.weight,
          updated_at: new Date().toISOString()
        };
        
        onUpdate(updatedOrder);
      }
      
      // Update the order packs list
      setOrderPackLists(prev => [...prev, newPack]);
      
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
        id={`order-pack-${orderId}`}
        value={order?.order_pack_list_id || ''}
        onChange={handleChange}
        className="w-full min-w-[350px] p-2 border border-gray-300 rounded text-sm bg-white"
        disabled={loadingOrderPacks}
        style={{ maxWidth: '100%' }}
      >
        <option value="" disabled>Select order pack</option>
        {orderPackLists.map((pack) => (
          <option key={pack.id} value={pack.id}>
            {pack.label} ({pack.weight}kg)
          </option>
        ))}
        <option value="custom">+ Add custom order pack...</option>
      </select>
      
      <CustomOrderPackModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCustomPack}
      />
    </div>
  );
}

export function ImportantFlag({ isImportant, orderId, onUpdate }) {
  const router = useRouter();
  const [important, setImportant] = useState(isImportant || false);
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleImportant = async () => {
    const previousValue = important;
    
    // Optimistic update - immediately update the UI
    setImportant(!important);
    setIsUpdating(true);
    
    try {
      const response = await fetch('/api/orders/toggle-important', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update important status');
      }
      
      // If onUpdate is provided, call it with the updated order data
      if (onUpdate) {
        const updatedOrder = {
          id: orderId,
          important: !important,
          updated_at: new Date().toISOString()
        };
        onUpdate(updatedOrder);
      }
      
      // Update the router cache without navigating
      router.refresh();
    } catch (error) {
      console.error('Error updating important status:', error);
      // Revert to the previous value on error
      setImportant(previousValue);
      toast.error('Failed to update important status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <button
      onClick={toggleImportant}
      disabled={isUpdating}
      className={`p-1.5 rounded-md transition-colors ${
        important 
          ? 'bg-red-100 hover:bg-red-200 text-red-600' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
      }`}
      title={important ? 'Mark as not important' : 'Mark as important'}
      style={{ opacity: isUpdating ? 0.5 : 1 }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fillRule="evenodd"
          d="M3 2.25a.75.75 0 01.75.75v.54l1.838-.46a9.75 9.75 0 016.725.738l.108.054a8.25 8.25 0 005.58.652l3.109-.732a.75.75 0 01.917.81 47.784 47.784 0 00.005 10.337.75.75 0 01-.574.812l-3.114.733a9.75 9.75 0 01-6.594-.77l-.108-.054a8.25 8.25 0 00-5.69-.625l-2.202.55V21a.75.75 0 01-1.5 0V3A.75.75 0 013 2.25z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
} 