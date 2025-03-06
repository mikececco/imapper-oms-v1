'use client';

import { useState } from 'react';
import { supabase } from '../utils/supabase';

export default function OrderDetailForm({ order, orderPackOptions }) {
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
        <label htmlFor="order_pack">Package Type</label>
        <select
          id="order_pack"
          name="order_pack"
          className="form-control"
          value={orderPack}
          onChange={handleOrderPackChange}
          required
        >
          <option value="" disabled>Select a package</option>
          {orderPackOptions.map((option, index) => (
            <option key={index} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {updateMessage.text && (
        <div 
          className={`update-message ${updateMessage.type}`}
          style={{ 
            color: updateMessage.type === 'success' ? 'green' : 'red',
            marginTop: '0.5rem',
            marginBottom: '0.5rem'
          }}
        >
          {updateMessage.text}
        </div>
      )}

      <button 
        type="submit" 
        className="btn" 
        disabled={isUpdating}
        style={{ marginTop: '0.5rem' }}
      >
        {isUpdating ? 'Updating...' : 'Update Package'}
      </button>
    </form>
  );
} 