"use client"

import { useState } from 'react';
import OrderDetailModalFixed from './OrderDetailModalFixed';
import { Button } from './ui/button';

export default function TestOrderModal() {
  const [orderId, setOrderId] = useState('');
  
  const handleOpenModal = () => {
    if (window.openOrderDetail && orderId) {
      window.openOrderDetail(orderId);
    } else {
      alert('Please enter an order ID');
    }
  };

  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium mb-4">Test Order Modal</h3>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Enter Order ID"
          className="px-3 py-2 border rounded-md flex-1"
        />
        
        <Button onClick={handleOpenModal}>
          Open Order Modal
        </Button>
      </div>
      
      <p className="text-sm text-gray-500">
        Enter an order ID and click the button to test the fixed order detail modal.
      </p>
      
      {/* This component manages its own state and renders the Dialog */}
      <OrderDetailModalFixed />
    </div>
  );
} 