'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'react-hot-toast';
import { useSupabase } from './Providers';
import { createClient } from '@supabase/supabase-js';

export default function EditCustomerModal({ isOpen, onClose, customer, onUpdate }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_house_number: '',
    address_line2: '',
    address_city: '',
    address_postal_code: '',
    address_country: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabaseContext = useSupabase();
  const [supabase, setSupabase] = useState(null);

  // Initialize form data when customer changes
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address_line1: customer.address_line1 || '',
        address_house_number: customer.address_house_number || '',
        address_line2: customer.address_line2 || '',
        address_city: customer.address_city || '',
        address_postal_code: customer.address_postal_code || '',
        address_country: customer.address_country || ''
      });
    }
  }, [customer]);

  // Initialize Supabase client
  useEffect(() => {
    // Try to use the context-provided Supabase client first
    if (supabaseContext) {
      setSupabase(supabaseContext);
      return;
    }

    // Fallback to creating a new client if context is not available
    const initializeSupabase = () => {
      try {
        if (typeof window !== 'undefined') {
          const envVars = window.__ENV__ || {};
          const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

          if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Missing Supabase environment variables');
            return;
          }

          const client = createClient(supabaseUrl, supabaseAnonKey);
          setSupabase(client);
        }
      } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
      }
    };

    initializeSupabase();
  }, [supabaseContext]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!supabase) {
      toast.error('Database connection not available');
      return;
    }

    if (!customer || !customer.id) {
      toast.error('Customer information is missing');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Updating customer with ID:', customer.id);
      console.log('Form data:', formData);

      const { data, error } = await supabase
        .from('customers')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address_line1: formData.address_line1,
          address_house_number: formData.address_house_number,
          address_line2: formData.address_line2,
          address_city: formData.address_city,
          address_postal_code: formData.address_postal_code,
          address_country: formData.address_country,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Updated customer data:', data);
      
      // Ensure we're passing the complete updated customer data
      const updatedCustomer = {
        ...customer, // Keep any fields that weren't updated
        ...data,     // Override with the updated fields
      };

      toast.success('Customer details updated successfully');
      
      // Call the onUpdate callback with the updated customer data
      if (typeof onUpdate === 'function') {
        onUpdate(updatedCustomer);
      } else {
        console.warn('onUpdate is not a function');
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error(error.message || 'Failed to update customer details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <Input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address Line 1</label>
            <Input
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">House Number</label>
            <Input
              name="address_house_number"
              value={formData.address_house_number}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address Line 2</label>
            <Input
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <Input
              name="address_city"
              value={formData.address_city}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Postal Code</label>
            <Input
              name="address_postal_code"
              value={formData.address_postal_code}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <Input
              name="address_country"
              value={formData.address_country}
              onChange={handleChange}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 