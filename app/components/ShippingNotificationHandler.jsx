"use client";

import { useEffect, useState } from 'react';
import { useSupabase } from './Providers';
import { calculateOrderInstruction } from '../utils/order-instructions';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// Debounce function to prevent rapid firing if component re-renders unexpectedly
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default function ShippingNotificationHandler() {
  const supabase = useSupabase();
  const [notificationShown, setNotificationShown] = useState(false);

  useEffect(() => {
    if (!supabase || notificationShown) {
      // Don't run if supabase not ready or notification already shown this session
      return; 
    }

    // Debounce the check to avoid potential rapid calls on mount/re-renders
    const checkOverdueOrders = debounce(async () => {
      console.log("Checking for overdue 'TO SHIP' orders...");
      try {
        // 1. Calculate timestamp 24 hours ago
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        const twentyFourHoursAgoISO = twentyFourHoursAgo.toISOString();

        // 2. Fetch potentially relevant orders 
        //    ASSUMPTION: 'became_to_ship_at' column exists and is updated correctly.
        const { data: potentialOrders, error } = await supabase
          .from('orders')
          .select('id, became_to_ship_at, status, ok_to_ship, tracking_number, manual_instruction')
          .lt('became_to_ship_at', twentyFourHoursAgoISO) // Label created > 24h ago
          .not('became_to_ship_at', 'is', null)
          // ADDED: Check if status is still pending or ready
          .in('status', ['Ready to send', 'pending'])
          // Corrected column name
          .eq('paid', true) 
          // Other filters might be removed/adjusted depending on exact logic
          // .eq('ok_to_ship', true)                  
          // .is('tracking_number', null) // Conflicts?
          // .not('status', 'in', '("shipped", "delivered", "cancelled")') // Redundant
          .order('became_to_ship_at', { ascending: true });

        if (error) {
          console.error("Error fetching potential stagnant orders for notification:", error);
          return; 
        }
        
        if (!potentialOrders || potentialOrders.length === 0) {
           console.log("No potentially stagnant orders found meeting notification criteria.");
           return;
        }

        console.log(`Found ${potentialOrders.length} potential stagnant orders for notification.`);

        // Client-side filtering is likely unnecessary now if query is accurate
        const stagnantOrders = potentialOrders; // Use results directly

        console.log(`Found ${stagnantOrders.length} stagnant orders > 24h (notification).`);

        // 4. Display notification if needed
        if (stagnantOrders.length > 0) {
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      {/* Optional Icon */}
                       <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                       </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Stagnant Shipment Alert
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {stagnantOrders.length} order{stagnantOrders.length > 1 ? 's' : ''} ha{stagnantOrders.length === 1 ? 's' : 've'} not shipped &gt; 24h after label creation.
                      </p>
                      {/* Link might need adjustment if filter param meaning changed */}
                      <Link href="/orders?filter=stagnant-shipment" className="mt-2 text-sm text-blue-600 hover:underline">
                         View Stagnant Orders
                       </Link>
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-gray-200">
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ), 
            { duration: Infinity } // Keep toast until dismissed
          );
          setNotificationShown(true); // Mark as shown for this session
        }
      } catch (err) {
        // Catch any unexpected errors during the process
        console.error("Unexpected error checking overdue orders:", err);
      }
    }, 500); // Debounce by 500ms

    checkOverdueOrders();

    // Cleanup function for debounce timer if component unmounts
    return () => clearTimeout(checkOverdueOrders.timeout); 

  }, [supabase, notificationShown]); // Re-run if supabase client changes

  // This component doesn't render anything itself
  return null; 
} 