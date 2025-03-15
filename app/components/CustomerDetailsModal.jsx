'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { formatDate } from '../utils/helpers';
import { Edit, X } from 'lucide-react';
import EditCustomerModal from './EditCustomerModal';

export default function CustomerDetailsModal({ isOpen, onClose, customer, onUpdate }) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);

  // Update the current customer when the customer prop changes
  useEffect(() => {
    if (customer) {
      setCurrentCustomer(customer);
    }
  }, [customer]);

  if (!currentCustomer) return null;

  const formatAddress = () => {
    const parts = [];
    if (currentCustomer.address_line1) parts.push(currentCustomer.address_line1);
    if (currentCustomer.address_line2) parts.push(currentCustomer.address_line2);
    if (currentCustomer.address_city) parts.push(currentCustomer.address_city);
    if (currentCustomer.address_postal_code) parts.push(currentCustomer.address_postal_code);
    if (currentCustomer.address_country) parts.push(currentCustomer.address_country);
    
    return parts.join(', ') || 'No address provided';
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleEditClose = () => {
    setIsEditModalOpen(false);
  };

  const handleCustomerUpdate = (updatedCustomer) => {
    console.log('Customer updated in details modal:', updatedCustomer);
    setCurrentCustomer(updatedCustomer);
    
    // Pass the updated customer data to the parent component
    if (typeof onUpdate === 'function') {
      onUpdate(updatedCustomer);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Customer Details</DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleEditClick}
                title="Edit Customer"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-base">{currentCustomer.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-base">{currentCustomer.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-base">{currentCustomer.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Created</p>
                  <p className="text-base">{formatDate(currentCustomer.created_at)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address</h3>
              <p className="text-base">{formatAddress()}</p>
            </div>

            {currentCustomer.stripe_customer_id && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Stripe Information</h3>
                <div>
                  <p className="text-sm font-medium text-gray-500">Stripe Customer ID</p>
                  <p className="text-base font-mono">{currentCustomer.stripe_customer_id}</p>
                </div>
              </div>
            )}

            {currentCustomer.metadata && Object.keys(currentCustomer.metadata).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Information</h3>
                <div className="bg-gray-50 p-3 rounded-md">
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(currentCustomer.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isEditModalOpen && (
        <EditCustomerModal
          isOpen={isEditModalOpen}
          onClose={handleEditClose}
          customer={currentCustomer}
          onUpdate={handleCustomerUpdate}
        />
      )}
    </>
  );
} 