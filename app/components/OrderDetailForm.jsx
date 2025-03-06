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
    <form onSubmit={handleSubmit} className="order-detail-form">
      <div className="form-group">
        <label htmlFor="order_pack" className="text-black font-medium">Package Type</label>
        <select
          id="order_pack"
          name="order_pack"
          className="form-control"
          value={orderPack}
          onChange={handleOrderPackChange}
          required
          style={{
            backgroundColor: '#f5f5f5',
            color: '#000000',
            border: '1px solid #000000',
            padding: '0.5rem',
            borderRadius: '4px',
            width: '100%',
            marginTop: '0.25rem'
          }}
        >
          <option value="" disabled>Select a package</option>
          {orderPackOptions.map((option, index) => (
            <option key={index} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {updateMessage.text && (
        <div 
          className={`update-message ${updateMessage.type}`}
          style={{ 
            color: '#000000',
            marginTop: '0.5rem',
            marginBottom: '0.5rem',
            fontWeight: updateMessage.type === 'success' ? 'bold' : 'normal'
          }}
        >
          {updateMessage.text}
        </div>
      )}

      <button 
        type="submit" 
        className="btn" 
        disabled={isUpdating}
        style={{ 
          marginTop: '0.5rem',
          backgroundColor: '#000000',
          color: '#ffffff',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: isUpdating ? 'wait' : 'pointer',
          opacity: isUpdating ? 0.7 : 1
        }}
      >
        {isUpdating ? 'Updating...' : 'Update Package'}
      </button>
    </form>
  );
} 