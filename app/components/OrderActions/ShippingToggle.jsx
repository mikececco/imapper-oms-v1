'use client';

import { useState } from 'react';
import { useSupabase } from '../Providers';
import { toast } from 'react-hot-toast';

export default function ShippingToggle({ okToShip, orderId }) {
  const supabase = useSupabase();
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleShippingStatus = async () => {
    try {
      setIsUpdating(true);
      const newStatus = !okToShip;

      // Optimistically update the UI
      const { error } = await supabase
        .from('orders')
        .update({ ok_to_ship: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(`Shipping status updated to ${newStatus ? 'OK to ship' : 'Not ready'}`);
    } catch (error) {
      console.error('Error updating shipping status:', error);
      toast.error('Failed to update shipping status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <button
      onClick={toggleShippingStatus}
      disabled={isUpdating}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        okToShip ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          okToShip ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
    </button>
  );
} 