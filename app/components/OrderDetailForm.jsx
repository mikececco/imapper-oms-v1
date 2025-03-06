'use client';

import { useState } from 'react';
import { supabase } from '../utils/supabase-client';

export default function OrderDetailForm({ order, orderPackOptions, onUpdate }) {
  const [orderPack, setOrderPack] = useState(order.order_pack || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState({ text: '', type: '' });

  const handleOrderPackChange = (e) => {
    setOrderPack(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateMessage({ text: '', type: '' });

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          order_pack: orderPack,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)
        .select();

      if (error) throw error;

      setUpdateMessage({ 
        text: 'Order package updated successfully!', 
        type: 'success' 
      });
      
      // Call the onUpdate callback if provided
      if (onUpdate) onUpdate();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUpdateMessage({ text: '', type: '' });
      }, 3000);
    } catch (err) {
      console.error('Error updating order:', err);
      setUpdateMessage({ 
        text: 'Failed to update order package. Please try again.', 
        type: 'error' 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="order_pack" className="text-sm font-medium">
          Package Type
        </label>
        <select
          id="order_pack"
          name="order_pack"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          value={orderPack}
          onChange={handleOrderPackChange}
          required
        >
          <option value="" disabled>Select a package</option>
          {orderPackOptions.map((option, index) => (
            <option key={index} value={option.value}>{option.label}</option>
          ))}
        </select>
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
        {isUpdating ? 'Updating...' : 'Update Package'}
      </button>
    </form>
  );
} 