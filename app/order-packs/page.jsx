'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '../components/Providers';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { toast } from 'react-hot-toast';

export default function OrderPacks() {
  const [orderPacks, setOrderPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPack, setEditingPack] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [similarPacks, setSimilarPacks] = useState([]);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    weight: 1.000,
    height: 20.00,
    width: 15.00,
    length: 10.00,
    comment: ''
  });
  const supabase = useSupabase();

  useEffect(() => {
    fetchOrderPacks();
  }, []);

  const fetchOrderPacks = async () => {
    try {
      const { data, error } = await supabase
        .from('order_pack_lists')
        .select('*')
        .order('label');

      if (error) throw error;

      setOrderPacks(data || []);
    } catch (error) {
      console.error('Error fetching order packs:', error);
      toast.error('Failed to load order packs');
    } finally {
      setLoading(false);
    }
  };

  // Filter order packs based on search term
  const filteredOrderPacks = orderPacks.filter(pack => {
    const searchLower = searchTerm.toLowerCase();
    return (
      pack.label.toLowerCase().includes(searchLower) ||
      pack.value.toLowerCase().includes(searchLower) ||
      (pack.comment && pack.comment.toLowerCase().includes(searchLower)) ||
      pack.weight.toString().includes(searchTerm)
    );
  });

  const checkForSimilarPacks = async (name) => {
    if (!name.trim()) {
      setSimilarPacks([]);
      setIsDuplicate(false);
      return;
    }

    const searchTerm = name.trim().toLowerCase();
    const similar = orderPacks.filter(pack => 
      pack.label.toLowerCase().includes(searchTerm) ||
      pack.value.toLowerCase().includes(searchTerm)
    );

    setSimilarPacks(similar);

    // Check for exact match (duplicate)
    const exactMatch = orderPacks.some(pack => 
      pack.label.toLowerCase() === searchTerm ||
      pack.value.toLowerCase() === searchTerm
    );

    setIsDuplicate(exactMatch);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check for similar packs when name changes
    if (name === 'name') {
      checkForSimilarPacks(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isDuplicate) {
      toast.error('An order pack with this name already exists');
      return;
    }

    try {
      // Normalize the value to match the database format
      const normalizedValue = formData.name
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_')
        .replace(/[^A-Z0-9_+-]/g, '');

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

      if (response.error) throw response.error;

      toast.success(editingPack ? 'Order pack updated!' : 'Order pack created!');
      setEditingPack(null);
      setFormData({
        name: '',
        weight: 1.000,
        height: 20.00,
        width: 15.00,
        length: 10.00,
        comment: ''
      });
      setSimilarPacks([]);
      setIsDuplicate(false);
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Order Packs</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editingPack ? 'Edit Order Pack' : 'Add New Order Pack'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className={isDuplicate ? 'border-red-500' : ''}
              />
              {isDuplicate && (
                <p className="text-sm text-red-500 mt-1">
                  This order pack name already exists
                </p>
              )}
              {similarPacks.length > 0 && !isDuplicate && (
                <div className="mt-2">
                  <p className="text-sm text-yellow-600">Similar packs found:</p>
                  <div className="mt-1 space-y-1">
                    {similarPacks.map(pack => (
                      <div key={pack.id} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                        <span className="font-medium">{pack.label}</span>
                        <span className="text-gray-500"> - {pack.weight}kg</span>
                        {pack.comment && (
                          <p className="text-xs text-gray-500 mt-0.5">{pack.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              <label className="block text-sm font-medium mb-1">Comment (optional)</label>
              <Input
                name="comment"
                value={formData.comment}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex justify-end space-x-2">
              {editingPack && (
                <Button
                  type="button"
                  variant="outline"
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
                    setSimilarPacks([]);
                    setIsDuplicate(false);
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isDuplicate}>
                {editingPack ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>

        {/* List Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Order Pack List</h2>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search order packs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
              <svg
                className="absolute left-3 top-3 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            {searchTerm && (
              <p className="text-sm text-gray-500 mt-2">
                Found {filteredOrderPacks.length} {filteredOrderPacks.length === 1 ? 'pack' : 'packs'} matching "{searchTerm}"
              </p>
            )}
          </div>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading order packs...</p>
              </div>
            ) : filteredOrderPacks.length === 0 ? (
              <div className="text-center py-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">
                  {searchTerm 
                    ? 'No order packs found matching your search.'
                    : 'No order packs found. Add one to get started.'}
                </p>
              </div>
            ) : (
              filteredOrderPacks.map((pack) => (
                <div key={pack.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{pack.label}</h3>
                    <p className="text-sm text-gray-500">
                      {pack.weight}kg - {pack.length}x{pack.width}x{pack.height}cm
                    </p>
                    {pack.comment && (
                      <p className="text-sm text-gray-500 truncate">{pack.comment}</p>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-4">
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
      </div>
    </div>
  );
} 