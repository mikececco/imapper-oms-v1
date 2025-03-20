'use client';

import { useState } from 'react';
import { useSupabase } from '../Providers';
import { toast } from 'react-hot-toast';

export default function PaymentBadge({ isPaid, orderId }) {
  const supabase = useSupabase();
  const [isUpdating, setIsUpdating] = useState(false);

  const togglePaymentStatus = async () => {
    try {
      setIsUpdating(true);
      const newStatus = !isPaid;

      // Optimistically update the UI
      const { error } = await supabase
        .from('orders')
        .update({ is_paid: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(`Payment status updated to ${newStatus ? 'paid' : 'unpaid'}`);
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <button
      onClick={togglePaymentStatus}
      disabled={isUpdating}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
        isPaid
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-red-100 text-red-800 hover:bg-red-200'
      }`}
    >
      {isUpdating ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-current mr-1"></div>
          Updating...
        </div>
      ) : (
        isPaid ? 'PAID' : 'UNPAID'
      )}
    </button>
  );
} 