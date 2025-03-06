'use client';

import { useState } from 'react';
import { supabase } from '../utils/supabase-client';

export default function OrderDetailForm({ order, orderPackOptions, onUpdate }) {
  const [formData, setFormData] = useState({
    name: order.name || '',
    email: order.email || '',
    phone: order.phone || '',
    shipping_address_line1: order.shipping_address_line1 || '',
    shipping_address_line2: order.shipping_address_line2 || '',
    shipping_address_city: order.shipping_address_city || '',
    shipping_address_postal_code: order.shipping_address_postal_code || '',
    shipping_address_country: order.shipping_address_country || '',
    order_pack: order.order_pack || '',
    order_notes: order.order_notes || '',
    instruction: order.instruction || 'TO SHIP',
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState({ text: '', type: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateMessage({ text: '', type: '' });

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          shipping_address_line1: formData.shipping_address_line1,
          shipping_address_line2: formData.shipping_address_line2,
          shipping_address_city: formData.shipping_address_city,
          shipping_address_postal_code: formData.shipping_address_postal_code,
          shipping_address_country: formData.shipping_address_country,
          order_pack: formData.order_pack,
          order_notes: formData.order_notes,
          instruction: formData.instruction,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)
        .select();

      if (error) throw error;

      setUpdateMessage({ 
        text: 'Order updated successfully!', 
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
        text: 'Failed to update order. Please try again.', 
        type: 'error' 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Information */}
        <div className="space-y-2">
          <h3 className="font-medium text-black">Customer Information</h3>
          
          <div>
            <label htmlFor="name" className="text-sm font-medium block">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <label htmlFor="email" className="text-sm font-medium block">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="text-sm font-medium block">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
        </div>
        
        {/* Shipping Information */}
        <div className="space-y-2">
          <h3 className="font-medium text-black">Shipping Information</h3>
          
          <div>
            <label htmlFor="shipping_address_line1" className="text-sm font-medium block">
              Address Line 1
            </label>
            <input
              id="shipping_address_line1"
              name="shipping_address_line1"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              value={formData.shipping_address_line1}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <label htmlFor="shipping_address_line2" className="text-sm font-medium block">
              Address Line 2
            </label>
            <input
              id="shipping_address_line2"
              name="shipping_address_line2"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              value={formData.shipping_address_line2}
              onChange={handleChange}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="shipping_address_city" className="text-sm font-medium block">
                City
              </label>
              <input
                id="shipping_address_city"
                name="shipping_address_city"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                value={formData.shipping_address_city}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="shipping_address_postal_code" className="text-sm font-medium block">
                Postal Code
              </label>
              <input
                id="shipping_address_postal_code"
                name="shipping_address_postal_code"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                value={formData.shipping_address_postal_code}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="shipping_address_country" className="text-sm font-medium block">
              Country
            </label>
            <input
              id="shipping_address_country"
              name="shipping_address_country"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              value={formData.shipping_address_country}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>
      
      {/* Order Details */}
      <div className="space-y-2">
        <h3 className="font-medium text-black">Order Details</h3>
        
        <div>
          <label htmlFor="order_pack" className="text-sm font-medium block">
            Package Type
          </label>
          <select
            id="order_pack"
            name="order_pack"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            value={formData.order_pack}
            onChange={handleChange}
          >
            <option value="">Select a package</option>
            {orderPackOptions.map((option, index) => (
              <option key={index} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="order_notes" className="text-sm font-medium block">
            Order Notes
          </label>
          <textarea
            id="order_notes"
            name="order_notes"
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            value={formData.order_notes}
            onChange={handleChange}
          ></textarea>
        </div>
        
        <div>
          <label htmlFor="instruction" className="text-sm font-medium block">
            Shipping Instruction
          </label>
          <select
            id="instruction"
            name="instruction"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            value={formData.instruction}
            onChange={handleChange}
          >
            <option value="TO SHIP">TO SHIP</option>
            <option value="TO SHIP BUT NO STICKERS">TO SHIP BUT NO STICKERS</option>
            <option value="TO SHIP BUT WRONG TRACKING LINK">TO SHIP BUT WRONG TRACKING LINK</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="DO NOT SHIP">DO NOT SHIP</option>
          </select>
        </div>
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
        {isUpdating ? 'Updating...' : 'Update Order'}
      </button>
    </form>
  );
} 