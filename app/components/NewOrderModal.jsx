"use client"

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';

export default function NewOrderModal({ isOpen, onClose, onOrderCreated }) {
  const [customers, setCustomers] = useState([]);
  const [orderPacks, setOrderPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewPackForm, setShowNewPackForm] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [stripeCustomerId, setStripeCustomerId] = useState('');
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    name: '',
    email: '',
    phone: '',
    shipping_address_line1: '',
    shipping_address_house_number: '',
    shipping_address_line2: '',
    shipping_address_city: '',
    shipping_address_postal_code: '',
    shipping_address_country: '',
    order_pack_list_id: '',
    weight: '',
    order_notes: ''
  });
  const [newPackData, setNewPackData] = useState({
    name: '',
    weight: 1.000,
    height: 20.00,
    width: 15.00,
    length: 10.00,
    comment: ''
  });
  const [supabase, setSupabase] = useState(null);

  // Initialize Supabase client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supabaseUrl = window.__ENV__?.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = window.__ENV__?.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseAnonKey) {
        const client = createClient(supabaseUrl, supabaseAnonKey);
        setSupabase(client);
      }
    }
  }, []);

  // Fetch customers and order packs
  useEffect(() => {
    if (!supabase) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch customers
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .order('name');

        if (customersError) throw customersError;
        setCustomers(customersData || []);

        // Fetch order packs
        const { data: orderPacksData, error: orderPacksError } = await supabase
          .from('order_pack_lists')
          .select('*')
          .order('label');

        if (orderPacksError) throw orderPacksError;
        setOrderPacks(orderPacksData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNewPackInputChange = (e) => {
    const { name, value } = e.target;
    setNewPackData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCustomerChange = (e) => {
    const customerId = e.target.value;
    const selectedCustomer = customers.find(c => c.id === customerId);
    
    if (selectedCustomer) {
      setFormData(prev => ({
        ...prev,
        customer_id: customerId,
        name: selectedCustomer.name,
        email: selectedCustomer.email,
        phone: selectedCustomer.phone,
        shipping_address_line1: selectedCustomer.address_line1,
        shipping_address_line2: selectedCustomer.address_line2,
        shipping_address_city: selectedCustomer.address_city,
        shipping_address_postal_code: selectedCustomer.address_postal_code,
        shipping_address_country: selectedCustomer.address_country,
      }));
    }
  };

  const handleOrderPackChange = (e) => {
    const packId = e.target.value;
    const selectedPack = orderPacks.find(p => p.id === packId);
    
    if (selectedPack) {
      setFormData(prev => ({
        ...prev,
        order_pack_list_id: packId,
        order_pack: selectedPack.value,
        weight: selectedPack.weight
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        order_pack_list_id: '',
        order_pack: '',
        weight: ''
      }));
    }
  };

  const handleCreateNewPack = async (e) => {
    e.preventDefault();
    if (!supabase) return;

    try {
      // Normalize the value to match the database format
      const normalizedValue = newPackData.name
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_')
        .replace(/[^A-Z0-9_+-]/g, '');

      const { data: newPack, error } = await supabase
        .from('order_pack_lists')
        .insert([{
          value: normalizedValue,
          label: newPackData.name.trim(),
          weight: parseFloat(newPackData.weight).toFixed(3),
          height: parseFloat(newPackData.height).toFixed(2),
          width: parseFloat(newPackData.width).toFixed(2),
          length: parseFloat(newPackData.length).toFixed(2),
          comment: newPackData.comment || null
        }])
        .select()
        .single();

      if (error) throw error;

      // Update the order packs list
      setOrderPacks(prev => [...prev, newPack]);
      
      // Set the new pack as selected and update weight
      setFormData(prev => ({
        ...prev,
        order_pack_list_id: newPack.id,
        order_pack: newPack.value,
        weight: newPack.weight
      }));

      // Reset the new pack form
      setNewPackData({
        name: '',
        weight: 1.000,
        height: 20.00,
        width: 15.00,
        length: 10.00,
        comment: ''
      });
      
      // Hide the new pack form
      setShowNewPackForm(false);
      
      toast.success('Order pack created successfully!');
    } catch (error) {
      console.error('Error creating order pack:', error);
      toast.error(error.message || 'Failed to create order pack');
    }
  };

  const handleFetchStripeCustomer = async () => {
    if (!stripeCustomerId.trim()) {
      toast.error('Please enter a Stripe customer ID');
      return;
    }

    setLoadingCustomer(true);
    try {
      const response = await fetch(`/api/customers/fetch-stripe?customerId=${stripeCustomerId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customer data');
      }

      // Update form data with the fetched customer data
      setFormData(prev => ({
        ...prev,
        customer_id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        shipping_address_line1: data.address_line1,
        shipping_address_line2: data.address_line2,
        shipping_address_city: data.address_city,
        shipping_address_postal_code: data.address_postal_code,
        shipping_address_country: data.address_country,
        stripe_customer_id: stripeCustomerId
      }));

      // Update customers list
      setCustomers(prev => {
        const exists = prev.some(c => c.id === data.id);
        if (!exists) {
          return [...prev, { ...data, stripe_customer_id: stripeCustomerId }];
        }
        return prev;
      });

      toast.success('Customer data fetched successfully!');
      setShowNewCustomerForm(false);
      setStripeCustomerId('');
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error(error.message || 'Failed to fetch customer data');
    } finally {
      setLoadingCustomer(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) return;

    // Check if order pack is selected
    if (!formData.order_pack_list_id) {
      toast.error('Please select or create an order pack');
      return;
    }

    try {
      // Get the selected order pack to include its value
      const selectedPack = orderPacks.find(p => p.id === formData.order_pack_list_id);
      
      const { data, error } = await supabase
        .from('orders')
        .insert([{
          ...formData,
          order_pack: selectedPack.value // Add the order_pack value from the selected pack
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Order created successfully!');
      onOrderCreated(data);
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="h-full flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">Customer</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
              >
                {showNewCustomerForm ? 'Cancel New Customer' : 'Create New Customer'}
              </Button>
            </div>
            
            {showNewCustomerForm ? (
              <div className="space-y-4 p-4 bg-gray-50 rounded-md">
                <div>
                  <label className="block text-sm font-medium mb-1">Stripe Customer ID</label>
                  <div className="flex gap-2">
                    <Input
                      value={stripeCustomerId}
                      onChange={(e) => setStripeCustomerId(e.target.value)}
                      placeholder="Enter Stripe customer ID"
                      required
                    />
                    <Button
                      type="button"
                      onClick={handleFetchStripeCustomer}
                      disabled={loadingCustomer}
                      className="whitespace-nowrap"
                    >
                      {loadingCustomer ? 'Fetching...' : 'Fetch Customer'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={handleCustomerChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select a customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">Order Pack</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewPackForm(!showNewPackForm)}
              >
                {showNewPackForm ? 'Cancel New Pack' : 'Create New Pack'}
              </Button>
            </div>
            
            {showNewPackForm ? (
              <div className="space-y-4 p-4 bg-gray-50 rounded-md">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <Input
                    name="name"
                    value={newPackData.name}
                    onChange={handleNewPackInputChange}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                    <Input
                      type="number"
                      step="0.001"
                      name="weight"
                      value={newPackData.weight}
                      onChange={handleNewPackInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Height (cm)</label>
                    <Input
                      type="number"
                      step="0.01"
                      name="height"
                      value={newPackData.height}
                      onChange={handleNewPackInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Width (cm)</label>
                    <Input
                      type="number"
                      step="0.01"
                      name="width"
                      value={newPackData.width}
                      onChange={handleNewPackInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Length (cm)</label>
                    <Input
                      type="number"
                      step="0.01"
                      name="length"
                      value={newPackData.length}
                      onChange={handleNewPackInputChange}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Comment</label>
                  <Input
                    name="comment"
                    value={newPackData.comment}
                    onChange={handleNewPackInputChange}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleCreateNewPack}
                  className="w-full"
                >
                  Create Order Pack
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  name="order_pack_list_id"
                  value={formData.order_pack_list_id}
                  onChange={handleOrderPackChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select an order pack</option>
                  {orderPacks.map(pack => (
                    <option key={pack.id} value={pack.id}>
                      {pack.label} ({pack.weight}kg)
                    </option>
                  ))}
                </select>
                {!formData.order_pack_list_id ? (
                  <p className="text-sm text-yellow-600">
                    Select an order pack to set the weight automatically
                  </p>
                ) : (
                  <p className="text-sm text-green-600">
                    Weight set to {formData.weight}kg from selected order pack
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Weight (kg)</label>
            <Input
              type="number"
              step="0.001"
              name="weight"
              value={formData.weight || ''}
              readOnly
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
            {!formData.order_pack_list_id ? (
              <p className="text-sm text-yellow-600 mt-1">
                Weight will be set automatically when you select an order pack
              </p>
            ) : (
              <p className="text-sm text-gray-600 mt-1">
                Weight is determined by the selected order pack and cannot be modified
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <Input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address Line 1</label>
            <Input
              name="shipping_address_line1"
              value={formData.shipping_address_line1}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              House Number <span className="text-red-500">*</span>
            </label>
            <Input
              name="shipping_address_house_number"
              value={formData.shipping_address_house_number}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address Line 2</label>
            <Input
              name="shipping_address_line2"
              value={formData.shipping_address_line2}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <Input
                name="shipping_address_city"
                value={formData.shipping_address_city}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Postal Code</label>
              <Input
                name="shipping_address_postal_code"
                value={formData.shipping_address_postal_code}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <Input
              name="shipping_address_country"
              value={formData.shipping_address_country}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 sticky bottom-0 bg-white border-t py-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!formData.customer_id || !formData.order_pack_list_id}
              className={(!formData.customer_id || !formData.order_pack_list_id) ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {!formData.customer_id && !formData.order_pack_list_id ? 'Select Customer & Order Pack' :
               !formData.customer_id ? 'Select Customer First' :
               !formData.order_pack_list_id ? 'Select Order Pack First' :
               'Create Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 