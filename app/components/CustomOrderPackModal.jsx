'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { ORDER_PACK_OPTIONS } from '../utils/constants';

export default function CustomOrderPackModal({ isOpen, onClose, onSave, initialValue = '' }) {
  const [customPack, setCustomPack] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [similarPackages, setSimilarPackages] = useState([]);
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCustomPack(initialValue);
      setSimilarPackages([]);
      setIsDuplicate(false);
    }
  }, [isOpen, initialValue]);

  const handleChange = (e) => {
    const value = e.target.value;
    setCustomPack(value);
    
    // Check for similar packages
    if (value.trim()) {
      const similar = ORDER_PACK_OPTIONS.filter(option => {
        // Case insensitive comparison
        return option.value.toLowerCase() === value.toLowerCase() ||
               option.value.toLowerCase().includes(value.toLowerCase()) ||
               value.toLowerCase().includes(option.value.toLowerCase());
      });
      
      setSimilarPackages(similar);
      
      // Check for exact match (duplicate)
      const exactMatch = ORDER_PACK_OPTIONS.some(option => 
        option.value.toLowerCase() === value.toLowerCase()
      );
      
      setIsDuplicate(exactMatch);
    } else {
      setSimilarPackages([]);
      setIsDuplicate(false);
    }
  };

  const handleSubmit = async () => {
    if (!customPack.trim()) {
      alert('Please enter a custom Order Pack');
      return;
    }
    
    if (isDuplicate) {
      alert('This Order Pack already exists. Please use a different name.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSave(customPack);
      onClose();
    } catch (error) {
      console.error('Error saving custom order pack:', error);
      alert('Failed to save custom order pack. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Custom Order Pack</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <label htmlFor="custom-pack" className="block text-sm font-medium text-gray-700 mb-2">
            Order Pack
          </label>
          <input
            id="custom-pack"
            type="text"
            value={customPack}
            onChange={handleChange}
            placeholder="Enter custom Order Pack"
            className={`w-full px-3 py-2 border ${isDuplicate ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 ${isDuplicate ? 'focus:ring-red-500' : 'focus:ring-black'} focus:border-transparent`}
            autoFocus
          />
          
          {isDuplicate && (
            <p className="mt-2 text-sm text-red-600">
              This Order Pack already exists. Please use a different name.
            </p>
          )}
          
          {!isDuplicate && similarPackages.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-amber-600">
                Similar Order Packs found:
              </p>
              <ul className="mt-1 text-sm text-gray-600 list-disc pl-5">
                {similarPackages.map((pkg, index) => (
                  <li key={index}>{pkg.label}</li>
                ))}
              </ul>
            </div>
          )}
          
          {!isDuplicate && similarPackages.length === 0 && (
            <p className="text-sm text-gray-500 mb-4">
              Enter a unique name for this order pack.
            </p>
          )}
        </div>
        
        <DialogFooter className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isDuplicate || customPack.trim() === ''}
            className={`px-4 py-2 rounded-md text-white ${
              isSubmitting || isDuplicate || customPack.trim() === ''
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-black hover:bg-gray-800'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save Order Pack'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 