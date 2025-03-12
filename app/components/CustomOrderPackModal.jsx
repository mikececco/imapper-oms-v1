'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useSupabase } from './Providers';

export default function CustomOrderPackModal({ isOpen, onClose, onSave, initialValue = '' }) {
  const [customPack, setCustomPack] = useState({
    name: initialValue,
    weight: 1.000,
    height: 20.00,
    width: 15.00,
    length: 10.00,
    comment: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [similarPackages, setSimilarPackages] = useState([]);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const supabase = useSupabase();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCustomPack({
        name: initialValue,
        weight: 1.000,
        height: 20.00,
        width: 15.00,
        length: 10.00,
        comment: ''
      });
      setSimilarPackages([]);
      setIsDuplicate(false);
    }
  }, [isOpen, initialValue]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCustomPack(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Check for similar packages
    if (name === 'name' && value.trim()) {
      checkForSimilarPacks(value);
    }
  };

  const checkForSimilarPacks = async (value) => {
    try {
      const { data: existingPacks, error } = await supabase
        .from('order_pack_lists')
        .select('*')
        .or(`value.ilike.%${value}%,label.ilike.%${value}%`);
      
      if (error) throw error;
      
      setSimilarPackages(existingPacks || []);
      
      // Check for exact match (duplicate)
      const exactMatch = existingPacks?.some(pack => 
        pack.value.toLowerCase() === value.toLowerCase() ||
        pack.label.toLowerCase() === value.toLowerCase()
      );
      
      setIsDuplicate(exactMatch);
    } catch (error) {
      console.error('Error checking for similar packs:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDuplicate) {
      alert('This Order Pack already exists. Please use a different name.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSave(customPack);
      onClose();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Order Pack</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              name="name"
              value={customPack.name}
              onChange={handleChange}
              required
            />
            {similarPackages.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-yellow-600">Similar packages found:</p>
                <ul className="text-sm text-gray-500">
                  {similarPackages.map(pack => (
                    <li key={pack.id}>
                      {pack.label} ({pack.weight}kg)
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {isDuplicate && (
              <p className="text-sm text-red-600 mt-1">
                This Order Pack already exists. Please use a different name.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Weight (kg)</label>
              <Input
                type="number"
                step="0.001"
                name="weight"
                value={customPack.weight}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Height (cm)</label>
              <Input
                type="number"
                step="0.01"
                name="height"
                value={customPack.height}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Width (cm)</label>
              <Input
                type="number"
                step="0.01"
                name="width"
                value={customPack.width}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Length (cm)</label>
              <Input
                type="number"
                step="0.01"
                name="length"
                value={customPack.length}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Comment (optional)</label>
            <Input
              name="comment"
              value={customPack.comment}
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
              disabled={isSubmitting || isDuplicate}
            >
              {isSubmitting ? 'Adding...' : 'Add Pack'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 