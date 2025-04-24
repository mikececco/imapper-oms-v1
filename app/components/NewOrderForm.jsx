'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from './Providers';
import { toast } from 'react-hot-toast';

export default function NewOrderForm() {
  const router = useRouter();
  const supabase = useSupabase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPacks, setOrderPacks] = useState([]);
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
    order_pack_list_id: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrderPacks = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('order_pack_lists')
          .select('id, name')
          .order('name', { ascending: true });

        if (error) throw error;
        setOrderPacks(data || []);
      } catch (err) {
        console.error('Error fetching order packs:', err);
        toast.error('Failed to load order pack options.');
      }
    };

    fetchOrderPacks();
  }, [supabase]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.order_pack_list_id) {
        setError('Order Pack is required.');
        toast.error('Please select an Order Pack.');
        return;
    }

    setIsSubmitting(true);
    setError('');

    if (!supabase) {
        setError('Database connection not available.');
        setIsSubmitting(false);
        return;
    }

    try {
      const { data, error: insertError } = await supabase.from('orders').insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        shipping_address_city: formData.shipping_address_city,
        shipping_address_line1: formData.shipping_address_line1,
        shipping_address_line2: formData.shipping_address_line2,
        shipping_address_postal_code: formData.shipping_address_postal_code,
        shipping_address_country: formData.shipping_address_country,
        instruction: formData.instruction,
        order_pack_list_id: formData.order_pack_list_id,
        status: 'pending',
        paid: false,
        ok_to_ship: false
      }).select().single();

      if (insertError) throw insertError;

      toast.success('Order created successfully!');
      router.push('/orders');
      router.refresh();
    } catch (err) {
      console.error('Error creating order:', err);
      const errorMessage = err.message?.includes('violates foreign key constraint') 
        ? 'Invalid Order Pack selected.' 
        : 'Failed to create order. Please check details and try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', border: '1px solid red', borderRadius: '4px' }}>
          ❌ {error}
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
        <label htmlFor="order_pack_list_id">Order Pack</label>
        <select
          id="order_pack_list_id"
          name="order_pack_list_id"
          value={formData.order_pack_list_id}
          onChange={handleChange}
          className="form-control"
          required
        >
          <option value="">Select an order pack...</option>
          {orderPacks.map((pack) => (
            <option key={pack.id} value={pack.id}>{pack.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="instruction">Instructions</label>
        <textarea
          id="instruction"
          name="instruction"
          className="form-control"
          placeholder="Enter any special instructions"
          value={formData.instruction}
          onChange={handleChange}
          rows="3"
        />
      </div>

      <button type="submit" disabled={isSubmitting} className="btn btn-primary">
        {isSubmitting ? 'Creating Order...' : 'Create Order'}
      </button>
    </form>
  );
} 