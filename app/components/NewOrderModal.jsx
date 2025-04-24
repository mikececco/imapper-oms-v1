"use client"

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { normalizeCountryToCode, getCountryDisplayName, COUNTRY_MAPPING } from '../utils/country-utils';
import { Badge } from './ui/badge';

const initialFormData = {
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
  order_notes: '',
  manual_instruction: ''
};

const initialNewPackData = {
  name: '',
  weight: 1.000,
  height: 20.00,
  width: 15.00,
  length: 10.00,
  comment: ''
};

export default function NewOrderModal({ isOpen, onClose, onOrderCreated, originalOrderContext, isReturnsContext }) {
  const [customers, setCustomers] = useState([]);
  const [orderPacks, setOrderPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewPackForm, setShowNewPackForm] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [stripeCustomerId, setStripeCustomerId] = useState('');
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [newPackData, setNewPackData] = useState(initialNewPackData);
  const [supabase, setSupabase] = useState(null);

  const resetForm = () => {
    setFormData(initialFormData);
    setNewPackData(initialNewPackData);
    setStripeCustomerId('');
    setShowNewPackForm(false);
    setShowNewCustomerForm(false);
  };

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

  useEffect(() => {
    if (!supabase) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .order('name');

        if (customersError) throw customersError;
        setCustomers(customersData || []);

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

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'shipping_address_country') {
      setFormData(prev => ({
        ...prev,
        [name]: value.trim().toUpperCase()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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
        ...initialFormData,
        manual_instruction: '',
        customer_id: customerId,
        name: selectedCustomer.name,
        email: selectedCustomer.email,
        phone: selectedCustomer.phone,
        shipping_address_line1: selectedCustomer.address_line1,
        shipping_address_house_number: selectedCustomer.address_house_number || '',
        shipping_address_line2: selectedCustomer.address_line2,
        shipping_address_city: selectedCustomer.address_city,
        shipping_address_postal_code: selectedCustomer.address_postal_code,
        shipping_address_country: selectedCustomer.address_country,
        stripe_customer_id: selectedCustomer.stripe_customer_id
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

      setOrderPacks(prev => [...prev, newPack]);
      
      setFormData(prev => ({
        ...prev,
        order_pack_list_id: newPack.id,
        order_pack: newPack.value,
        weight: newPack.weight
      }));

      setNewPackData(initialNewPackData);
      
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

      setFormData(prev => ({
        ...prev,
        customer_id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        shipping_address_line1: data.address_line1,
        shipping_address_house_number: data.address_house_number || '',
        shipping_address_line2: data.address_line2,
        shipping_address_city: data.address_city,
        shipping_address_postal_code: data.address_postal_code,
        shipping_address_country: data.address_country,
        stripe_customer_id: stripeCustomerId
      }));

      const existingCustomer = customers.find(c => c.id === data.id);
      if (!existingCustomer) {
        setCustomers(prev => [...prev, data]);
      }
      
      toast.success('Customer data fetched and updated!');

    } catch (error) {
      console.error('Error fetching Stripe customer:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoadingCustomer(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    
    const toastId = toast.loading('Creating order...');

    try {
      const newOrderData = {
        customer_id: formData.customer_id || null,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        shipping_address_line1: formData.shipping_address_line1,
        shipping_address_house_number: formData.shipping_address_house_number || null,
        shipping_address_line2: formData.shipping_address_line2 || null,
        shipping_address_city: formData.shipping_address_city,
        shipping_address_postal_code: formData.shipping_address_postal_code,
        shipping_address_country: normalizeCountryToCode(formData.shipping_address_country),
        order_pack_list_id: formData.order_pack_list_id || null,
        weight: parseFloat(formData.weight).toFixed(3) || 1.000,
        order_notes: formData.order_notes || null,
        created_via: isReturnsContext ? 'returns_portal' : 'manual',
        ...(formData.manual_instruction && { manual_instruction: formData.manual_instruction }), 
        paid: true,
        ok_to_ship: true
      };
      
      if (!newOrderData.name || !newOrderData.shipping_address_line1 || !newOrderData.shipping_address_city || !newOrderData.shipping_address_postal_code || !newOrderData.shipping_address_country || !newOrderData.order_pack_list_id) {
        throw new Error('Please fill in all required fields (Name, Address, Pack).');
      }

      const { data: createdOrder, error } = await supabase
        .from('orders')
        .insert([newOrderData])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Order created successfully!', { id: toastId });
      onOrderCreated(createdOrder);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order', { id: toastId });
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isReturnsContext ? 'Create New Order for Return' : 'Create New Order'}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-1 pr-4">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isReturnsContext && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm font-medium text-yellow-800">
                    Note: Creating an order from the Returns portal typically marks the original order as 'Delivered'.
                    {originalOrderContext && (
                      <span>
                        {' '}Original Order ID referenced: <code className="font-mono bg-yellow-100 px-1 rounded">{originalOrderContext.id}</code>.
                      </span>
                    )}
                  </p>
                </div>
              )}
              <section>
                <h3 className="text-lg font-medium mb-2">Customer</h3>
                <div className="space-y-2">
                  <label htmlFor="customer_id" className="block text-sm font-medium">Select Existing Customer</label>
                  <select
                    id="customer_id"
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleCustomerChange}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.email})
                      </option>
                    ))}
                  </select>

                  <div className="mt-2 text-sm">Or fetch/create new:</div>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Enter Stripe Customer ID (cus_...)"
                      value={stripeCustomerId}
                      onChange={(e) => setStripeCustomerId(e.target.value)}
                      className="flex-grow"
                    />
                    <Button type="button" onClick={handleFetchStripeCustomer} disabled={loadingCustomer}>
                      {loadingCustomer ? 'Fetching...' : 'Fetch Data'}
                    </Button>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md bg-gray-50">
                <h3 className="text-lg font-medium mb-2 col-span-full">Customer Details</h3>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium">Name *</label>
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required className="bg-white"/>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium">Email *</label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required className="bg-white"/>
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium">Phone *</label>
                  <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} required className="bg-white"/>
                </div>
              </section>
              
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md bg-gray-50">
                <h3 className="text-lg font-medium mb-2 col-span-full">Shipping Address</h3>
                <div className="col-span-full">
                  <label htmlFor="shipping_address_line1" className="block text-sm font-medium">Address Line 1 *</label>
                  <Input id="shipping_address_line1" name="shipping_address_line1" value={formData.shipping_address_line1} onChange={handleInputChange} required className="bg-white"/>
                </div>
                <div>
                  <label htmlFor="shipping_address_house_number" className="block text-sm font-medium">House Number *</label>
                  <Input id="shipping_address_house_number" name="shipping_address_house_number" value={formData.shipping_address_house_number} onChange={handleInputChange} required className="bg-white"/>
                </div>
                <div>
                  <label htmlFor="shipping_address_line2" className="block text-sm font-medium">Address Line 2</label>
                  <Input id="shipping_address_line2" name="shipping_address_line2" value={formData.shipping_address_line2} onChange={handleInputChange} className="bg-white"/>
                </div>
                <div>
                  <label htmlFor="shipping_address_city" className="block text-sm font-medium">City *</label>
                  <Input id="shipping_address_city" name="shipping_address_city" value={formData.shipping_address_city} onChange={handleInputChange} required className="bg-white"/>
                </div>
                <div>
                  <label htmlFor="shipping_address_postal_code" className="block text-sm font-medium">Postal Code *</label>
                  <Input id="shipping_address_postal_code" name="shipping_address_postal_code" value={formData.shipping_address_postal_code} onChange={handleInputChange} required className="bg-white"/>
                </div>
                <div className="col-span-full">
                  <label htmlFor="shipping_address_country" className="block text-sm font-medium">Country Code (2 letters, e.g., GB) *</label>
                  <Input id="shipping_address_country" name="shipping_address_country" value={formData.shipping_address_country} onChange={handleInputChange} required maxLength={2} className="bg-white"/>
                  {formData.shipping_address_country && COUNTRY_MAPPING[formData.shipping_address_country.toUpperCase()] && (
                    <p className="mt-1 text-sm text-gray-600">
                      {getCountryDisplayName(formData.shipping_address_country.toUpperCase())}
                    </p>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-lg font-medium mb-2">Order Pack</h3>
                <div className="space-y-2">
                  <label htmlFor="order_pack_list_id" className="block text-sm font-medium">Select Order Pack *</label>
                  <select
                    id="order_pack_list_id"
                    name="order_pack_list_id"
                    value={formData.order_pack_list_id}
                    onChange={handleOrderPackChange}
                    required
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">-- Select Pack --</option>
                    {orderPacks.map(pack => (
                      <option key={pack.id} value={pack.id}>
                        {pack.label} ({pack.weight} kg)
                      </option>
                    ))}
                  </select>
                  <Button type="button" onClick={() => setShowNewPackForm(!showNewPackForm)} variant="outline" size="sm">
                    {showNewPackForm ? 'Cancel New Pack' : 'Add New Pack'}
                  </Button>
                </div>
              </section>

              {showNewPackForm && (
                <section className="border p-4 rounded-md bg-gray-50">
                  <h3 className="text-lg font-medium mb-2">Create New Order Pack</h3>
                  <form onSubmit={handleCreateNewPack} className="space-y-2">
                    <div>
                      <label htmlFor="new_pack_name" className="block text-sm font-medium">Pack Name *</label>
                      <Input id="new_pack_name" name="name" value={newPackData.name} onChange={handleNewPackInputChange} required/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="new_pack_weight" className="block text-sm font-medium">Weight (kg) *</label>
                        <Input id="new_pack_weight" name="weight" type="number" step="0.001" value={newPackData.weight} onChange={handleNewPackInputChange} required/>
                      </div>
                      <div>
                        <label htmlFor="new_pack_length" className="block text-sm font-medium">Length (cm)</label>
                        <Input id="new_pack_length" name="length" type="number" step="0.01" value={newPackData.length} onChange={handleNewPackInputChange} />
                      </div>
                      <div>
                        <label htmlFor="new_pack_width" className="block text-sm font-medium">Width (cm)</label>
                        <Input id="new_pack_width" name="width" type="number" step="0.01" value={newPackData.width} onChange={handleNewPackInputChange} />
                      </div>
                      <div>
                        <label htmlFor="new_pack_height" className="block text-sm font-medium">Height (cm)</label>
                        <Input id="new_pack_height" name="height" type="number" step="0.01" value={newPackData.height} onChange={handleNewPackInputChange} />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="new_pack_comment" className="block text-sm font-medium">Comment</label>
                      <Input id="new_pack_comment" name="comment" value={newPackData.comment} onChange={handleNewPackInputChange} />
                    </div>
                    <Button type="submit" size="sm">Create Pack</Button>
                  </form>
                </section>
              )}

              <section>
                <h3 className="text-lg font-medium mb-2">Order Notes</h3>
                <div className="grid grid-cols-1 gap-4">
                  <Textarea
                    name="order_notes"
                    value={formData.order_notes}
                    onChange={handleInputChange}
                    placeholder="Order Notes"
                  />
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Manual Instruction (Optional)
                    </h3>
                    <select
                      id="manual_instruction"
                      name="manual_instruction"
                      value={formData.manual_instruction}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">-- Select --</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="NO ACTION REQUIRED">NO ACTION REQUIRED</option>
                    </select>
                  </div>
                </div>
              </section>

              <div className="pt-4 border-t">
                <Button type="submit">{isReturnsContext ? 'Create Return Order' : 'Create Order'}</Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 