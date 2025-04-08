'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

// Helper to format address object or string
const formatAddress = (address) => {
  if (!address) return 'N/A';
  if (typeof address === 'string') return address; // Handle legacy string address
  
  const parts = [
    address.line1,
    address.line2,
    address.house_number,
    address.city,
    address.postal_code,
    address.country
  ].filter(Boolean); // Filter out null/empty parts
  return parts.join(', ');
};

export default function ReturnConfirmationModal({
  isOpen,
  onClose,
  order,
  onConfirm,
  returnToAddress, // The fixed warehouse address
  isLoading,
}) {
  // State for the editable return address
  const [returnFromAddress, setReturnFromAddress] = useState({
    line1: '',
    line2: '',
    house_number: '',
    city: '',
    postal_code: '',
    country: ''
  });

  // Effect to initialize/reset address state when order changes
  useEffect(() => {
    if (order) {
      // Try to parse from shipping_address object first
      if (order.shipping_address && typeof order.shipping_address === 'object') {
        setReturnFromAddress({
          line1: order.shipping_address.line1 || '',
          line2: order.shipping_address.line2 || '',
          house_number: order.shipping_address.house_number || '',
          city: order.shipping_address.city || '',
          postal_code: order.shipping_address.postal_code || '',
          country: order.shipping_address.country || ''
        });
      } else if (typeof order.shipping_address === 'string') {
        // Basic fallback for legacy string address (less ideal)
        const parts = order.shipping_address.split(',').map(p => p.trim());
        setReturnFromAddress({
          line1: parts[0] || '',
          line2: '', // Cannot reliably parse line2
          house_number: '', // Cannot reliably parse house_number
          city: parts[1] || '',
          postal_code: parts[2] || '',
          country: parts[3] || ''
        });
      } else {
        // Fallback to individual fields
        setReturnFromAddress({
          line1: order.shipping_address_line1 || '',
          line2: order.shipping_address_line2 || '',
          house_number: order.shipping_address_house_number || '',
          city: order.shipping_address_city || '',
          postal_code: order.shipping_address_postal_code || '',
          country: order.shipping_address_country || ''
        });
      }
    } else {
      // Reset if order is null
      setReturnFromAddress({ line1: '', line2: '', house_number: '', city: '', postal_code: '', country: '' });
    }
  }, [order]); // Rerun when order changes

  if (!order) return null;

  const handleConfirm = () => {
    if (order && order.id) {
      // Pass the potentially modified address object along with the id
      onConfirm(order.id, returnFromAddress);
    }
  };

  // Handler for input changes
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setReturnFromAddress(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Confirm Return Label Creation</DialogTitle>
          <DialogDescription>
            Please review the details below before creating the return label for Order #{order.id}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <span className="text-right font-medium">Order ID:</span>
            <span>{order.id}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <span className="text-right font-medium">Customer:</span>
            <span>{order.name || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <span className="text-right font-medium">Order Pack:</span>
            <span>{order.order_pack || 'N/A'}</span>
          </div>
          <div className="mt-2 border-t pt-4">
            <label className="font-medium text-md mb-2 block">Return From (Editable)</label>
            <div className="grid gap-2">
              <Input 
                name="line1"
                placeholder="Address Line 1"
                value={returnFromAddress.line1}
                onChange={handleAddressChange}
                disabled={isLoading}
              />
              <div className="grid grid-cols-2 gap-2">
              <Input 
                name="line2"
                placeholder="Address Line 2 (Optional)"
                value={returnFromAddress.line2}
                onChange={handleAddressChange}
                disabled={isLoading}
              /><Input 
                name="house_number"
                placeholder="House Number"
                value={returnFromAddress.house_number}
                onChange={handleAddressChange}
                disabled={isLoading}
              />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  name="city"
                  placeholder="City"
                  value={returnFromAddress.city}
                  onChange={handleAddressChange}
                  disabled={isLoading}
                />
                <Input 
                  name="postal_code"
                  placeholder="Postal Code"
                  value={returnFromAddress.postal_code}
                  onChange={handleAddressChange}
                  disabled={isLoading}
                />
              </div>
              <Input 
                name="country"
                placeholder="Country Code (e.g., NL, US)"
                value={returnFromAddress.country}
                onChange={handleAddressChange}
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-start gap-4 border-t pt-4 mt-4">
            <span className="text-right font-medium">Return To:</span>
            <span className="text-sm">{returnToAddress ? formatAddress(returnToAddress) : 'Return address not configured!'}</span> 
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            This will generate a Sendcloud return label using the addresses above. 
            The label PDF and tracking information will be linked to this order.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              'Confirm & Create Label'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 