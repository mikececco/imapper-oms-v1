'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase-client';

export default function PaymentStatusEditor({ orderId, currentStatus, onUpdate }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus ? 'paid' : 'unpaid');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedStatus(currentStatus ? 'paid' : 'unpaid');
    setError(null);
  };

  const handleChange = (e) => {
    setSelectedStatus(e.target.value);
  };

  const handleSubmit = async () => {
    setIsUpdating(true);
    setError(null);

    try {
      const isPaid = selectedStatus === 'paid';
      
      const { data, error: updateError } = await supabase
        .from('orders')
        .update({ 
          paid: isPaid,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select();

      if (updateError) throw updateError;

      // Call the onUpdate callback if provided
      if (onUpdate) {
        const updatedOrder = {
          id: orderId,
          paid: isPaid,
          updated_at: new Date().toISOString()
        };
        
        onUpdate(updatedOrder);
      }
      
      // Update the router cache without navigating
      router.refresh();
      
      // Close the editor
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating payment status:', err);
      setError('Failed to update payment status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center space-x-2">
        <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
          currentStatus 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {currentStatus ? 'PAID' : 'UNPAID'}
        </span>
        <button
          onClick={handleEdit}
          className="text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <select
          value={selectedStatus}
          onChange={handleChange}
          className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          disabled={isUpdating}
        >
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <button
          onClick={handleSubmit}
          disabled={isUpdating}
          className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {isUpdating ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isUpdating}
          className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
} 