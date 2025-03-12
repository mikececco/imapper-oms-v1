"use client"

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
let supabase;

// Initialize Supabase client only on the client side
if (typeof window !== 'undefined') {
  supabase = createClient(
    window.__ENV__.NEXT_PUBLIC_SUPABASE_URL,
    window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export default function OrderPackList() {
  const [isOpen, setIsOpen] = useState(false);
  const [orderPacks, setOrderPacks] = useState([]);
  const [editingPack, setEditingPack] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    weight: 1.000,
    height: 20.00,
    width: 15.00,
    length: 10.00,
    comment: ''
  });
  const [loadingOrderPacks, setLoadingOrderPacks] = useState(true);

  useEffect(() => {
    fetchOrderPacks();
  }, []);

  const fetchOrderPacks = async () => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized. Check your environment variables.');
      }

      const { data, error } = await supabase
        .from('order_pack_lists')
        .select('*')
        .order('label');

      if (error) {
        throw error;
      }

      setOrderPacks(data || []);
      setLoadingOrderPacks(false);
    } catch (error) {
      console.error('Error fetching order packs:', error);
      toast.error(error.message || 'Failed to load order packs');
      setLoadingOrderPacks(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Normalize the value to match the database format
      const normalizedValue = formData.name
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_')  // Replace both spaces and hyphens with underscores
        .replace(/[^A-Z0-9_+-]/g, ''); // Allow A-Z, 0-9, underscore, plus, and hyphen

      const payload = {
        value: normalizedValue,
        label: formData.name.trim(),
        weight: parseFloat(formData.weight).toFixed(3),
        height: parseFloat(formData.height).toFixed(2),
        width: parseFloat(formData.width).toFixed(2),
        length: parseFloat(formData.length).toFixed(2),
        comment: formData.comment || null
      };

      let response;
      if (editingPack) {
        response = await supabase
          .from('order_pack_lists')
          .update(payload)
          .eq('id', editingPack.id);
      } else {
        response = await supabase
          .from('order_pack_lists')
          .insert([payload]);
      }

      if (response.error) {
        console.error('Supabase error:', response.error);
        throw new Error(response.error.message || 'Failed to save order pack');
      }

      toast.success(editingPack ? 'Order pack updated!' : 'Order pack created!');
      setIsOpen(false);
      setEditingPack(null);
      setFormData({
        name: '',
        weight: 1.000,
        height: 20.00,
        width: 15.00,
        length: 10.00,
        comment: ''
      });
      fetchOrderPacks();
    } catch (error) {
      console.error('Error saving order pack:', error);
      toast.error(error.message || 'Failed to save order pack');
    }
  };

  const handleEdit = (pack) => {
    setEditingPack(pack);
    setFormData({
      name: pack.label,
      weight: pack.weight,
      height: pack.height,
      width: pack.width,
      length: pack.length,
      comment: pack.comment || ''
    });
    setIsOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this order pack?')) return;

    try {
      const { error } = await supabase
        .from('order_pack_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Order pack deleted!');
      fetchOrderPacks();
    } catch (error) {
      console.error('Error deleting order pack:', error);
      toast.error('Failed to delete order pack');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Order Pack Lists</h2>
        <Button
          onClick={() => {
            setEditingPack(null);
            setFormData({
              name: '',
              weight: 1.000,
              height: 20.00,
              width: 15.00,
              length: 10.00,
              comment: ''
            });
            setIsOpen(true);
          }}
        >
          Add Order Pack
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 max-h-[60vh]">
        <div className="space-y-2">
          {loadingOrderPacks ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading order packs...</p>
            </div>
          ) : orderPacks.length === 0 ? (
            <div className="text-center py-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No order packs found. Add one to get started.</p>
            </div>
          ) : (
            orderPacks.map((pack) => (
              <div key={pack.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{pack.label}</h3>
                  <p className="text-sm text-gray-500">
                    {pack.weight}kg - {pack.length}x{pack.width}x{pack.height}cm
                  </p>
                  {pack.comment && (
                    <p className="text-sm text-gray-500 truncate">{pack.comment}</p>
                  )}
                </div>
                <div className="flex space-x-2 ml-4 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(pack)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(pack.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPack ? 'Edit Order Pack' : 'Add Order Pack'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
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
                  value={formData.weight}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Height (cm)</label>
                <Input
                  type="number"
                  step="0.01"
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Width (cm)</label>
                <Input
                  type="number"
                  step="0.01"
                  name="width"
                  value={formData.width}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Length (cm)</label>
                <Input
                  type="number"
                  step="0.01"
                  name="length"
                  value={formData.length}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Comment</label>
              <Textarea
                name="comment"
                value={formData.comment}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingPack ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 