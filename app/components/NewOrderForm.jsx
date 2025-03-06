'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase';
import { ORDER_PACK_OPTIONS } from '../utils/constants';

export default function NewOrderForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_address_city: '',
    shipping_address_postal_code: '',
    shipping_address_country: '',
    instruction: '',
    order_pack: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Insert the order into Supabase
      const { error } = await supabase.from('orders').insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        shipping_address_city: formData.shipping_address_city,
        shipping_address_line1: formData.shipping_address_line1,
        shipping_address_line2: formData.shipping_address_line2,
        shipping_address_postal_code: formData.shipping_address_postal_code,
        shipping_address_country: formData.shipping_address_country,
        instruction: formData.instruction,
        order_pack: formData.order_pack,
        status: 'pending',
        paid: false,
        ok_to_ship: false
      });

      if (error) throw error;

      // Redirect to the orders page
      router.push('/orders');
      router.refresh();
    } catch (err) {
      console.error('Error creating order:', err);
      setError('Failed to create order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="error-message" style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="name">Customer Name</label>
        <input
          type="text"
          id="name"
          name="name"
          className="form-control"
          placeholder="Enter customer name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Customer Email</label>
        <input
          type="email"
          id="email"
          name="email"
          className="form-control"
          placeholder="Enter customer email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="phone">Customer Phone</label>
        <input
          type="tel"
          id="phone"
          name="phone"
          className="form-control"
          placeholder="Enter customer phone"
          value={formData.phone}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="shipping_address_line1">Address Line 1</label>
        <input
          type="text"
          id="shipping_address_line1"
          name="shipping_address_line1"
          className="form-control"
          placeholder="Enter street address"
          value={formData.shipping_address_line1}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="shipping_address_line2">Address Line 2</label>
        <input
          type="text"
          id="shipping_address_line2"
          name="shipping_address_line2"
          className="form-control"
          placeholder="Enter apartment, suite, etc."
          value={formData.shipping_address_line2}
          onChange={handleChange}
        />
      </div>

      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label htmlFor="shipping_address_city">City</label>
          <input
            type="text"
            id="shipping_address_city"
            name="shipping_address_city"
            className="form-control"
            placeholder="Enter city"
            value={formData.shipping_address_city}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="shipping_address_postal_code">Postal Code</label>
          <input
            type="text"
            id="shipping_address_postal_code"
            name="shipping_address_postal_code"
            className="form-control"
            placeholder="Enter postal code"
            value={formData.shipping_address_postal_code}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="shipping_address_country">Country</label>
        <input
          type="text"
          id="shipping_address_country"
          name="shipping_address_country"
          className="form-control"
          placeholder="Enter country"
          value={formData.shipping_address_country}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="order_pack">Order Package</label>
        <select
          id="order_pack"
          name="order_pack"
          className="form-control"
          value={formData.order_pack}
          onChange={handleChange}
          required
        >
          <option value="" disabled>Select a package</option>
          {ORDER_PACK_OPTIONS.map((option, index) => (
            <option key={index} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="instruction">Order Instructions</label>
        <textarea
          id="instruction"
          name="instruction"
          className="form-control"
          rows={3}
          placeholder="Enter any additional instructions"
          value={formData.instruction}
          onChange={handleChange}
        ></textarea>
      </div>

      <button type="submit" className="btn" disabled={isSubmitting}>
        {isSubmitting ? 'Creating Order...' : 'Create Order'}
      </button>
    </form>
  );
} 