'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase';

export default function NewOrderForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_address_city: '',
    shipping_address_postal_code: '',
    shipping_address_country: '',
    order_notes: '',
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
      // Combine shipping address fields into a single string
      const shipping_address = [
        formData.shipping_address_line1,
        formData.shipping_address_line2,
        formData.shipping_address_city,
        formData.shipping_address_postal_code,
        formData.shipping_address_country
      ].filter(Boolean).join(', ');
      
      // Insert the order into Supabase
      const { error } = await supabase.from('orders').insert({
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        shipping_address,
        order_notes: formData.order_notes,
        order_pack: formData.order_pack,
        status: 'pending',
        is_paid: false,
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
        <label htmlFor="customer_name">Customer Name</label>
        <input
          type="text"
          id="customer_name"
          name="customer_name"
          className="form-control"
          placeholder="Enter customer name"
          value={formData.customer_name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="customer_email">Customer Email</label>
        <input
          type="email"
          id="customer_email"
          name="customer_email"
          className="form-control"
          placeholder="Enter customer email"
          value={formData.customer_email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="customer_phone">Customer Phone</label>
        <input
          type="tel"
          id="customer_phone"
          name="customer_phone"
          className="form-control"
          placeholder="Enter customer phone"
          value={formData.customer_phone}
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
        <input
          type="text"
          id="order_pack"
          name="order_pack"
          className="form-control"
          placeholder="Enter package details"
          value={formData.order_pack}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="order_notes">Order Instructions</label>
        <textarea
          id="order_notes"
          name="order_notes"
          className="form-control"
          rows={3}
          placeholder="Enter any additional instructions"
          value={formData.order_notes}
          onChange={handleChange}
        ></textarea>
      </div>

      <button type="submit" className="btn" disabled={isSubmitting}>
        {isSubmitting ? 'Creating Order...' : 'Create Order'}
      </button>
    </form>
  );
} 