'use client';

import { useState } from 'react';
import { supabase } from '../utils/supabase-client';

export default function ShippingStatusEditor({ orderId, currentStatus, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus ? 'ready' : 'not_ready');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedStatus(currentStatus ? 'ready' : 'not_ready');
    setError(null);
  };

  const handleChange = (e) => {
    setSelectedStatus(e.target.value);
  };

  const handleSubmit = async () => {
    setIsUpdating(true);
    setError(null);

    try {
      const isReady = selectedStatus === 'ready';
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          ok_to_ship: isReady,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Call the onUpdate callback if provided
      if (onUpdate) onUpdate();
      
      // Close the editor
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating shipping status:', err);
      setError('Failed to update shipping status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center space-x-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          currentStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {currentStatus ? 'Ready to Ship' : 'Not Ready'}
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
          <option value="ready">Ready to Ship</option>
          <option value="not_ready">Not Ready</option>
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