"use client"

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase-client';
import { calculateOrderInstruction } from '../utils/order-instructions';

export default function DeliveryStats() {
  const [stats, setStats] = useState({
    total_tracked: 0,
    delivered: 0,
    in_transit: 0,
    to_ship: 0,
    do_not_ship: 0,
    unknown: 0,
    by_instruction: {}
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchDeliveryStats();
  }, []);

  const fetchDeliveryStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all orders with their relevant fields for instruction calculation
      const { data, error } = await supabase
        .from('orders')
        .select('*');
      
      if (error) {
        throw error;
      }
      
      // Process the data
      const stats = {
        total_tracked: 0,
        delivered: 0,
        in_transit: 0,
        to_ship: 0,
        do_not_ship: 0,
        unknown: 0,
        by_instruction: {}
      };
      
      data.forEach(order => {
        // Only count orders with tracking information
        if (order.tracking_number || order.tracking_link) {
          stats.total_tracked++;
          
          // Count by delivery status
          if (order.delivery_status?.toLowerCase().includes('delivered')) {
            stats.delivered++;
          } else if (order.delivery_status?.toLowerCase().includes('transit') || 
                    order.delivery_status?.toLowerCase().includes('shipped')) {
            stats.in_transit++;
          }
          
          // Calculate shipping instruction for each order
          const instruction = calculateOrderInstruction(order);
          
          // Count by shipping instruction
          if (instruction) {
            if (!stats.by_instruction[instruction]) {
              stats.by_instruction[instruction] = 0;
            }
            stats.by_instruction[instruction]++;
            
            // Also update the summary counts
            if (instruction === 'TO SHIP') {
              stats.to_ship++;
            } else if (instruction === 'DO NOT SHIP') {
              stats.do_not_ship++;
            } else if (instruction === 'UNKNOWN' || instruction === 'ACTION REQUIRED') {
              stats.unknown++;
            }
          }
        }
      });
      
      setStats(stats);
    } catch (error) {
      console.error('Error fetching delivery stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatuses = async () => {
    try {
      setUpdating(true);
      const response = await fetch('/api/scheduled-tasks?task=delivery-status', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to update delivery statuses');
      }
      
      // Refresh stats after update
      await fetchDeliveryStats();
    } catch (error) {
      console.error('Error updating delivery statuses:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <h2>Delivery Tracking</h2>
      
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
        </div>
      ) : (
        <>
          <div className="stats-grid mt-4">
            <div className="stat-card">
              <div className="stat-value">{stats.total_tracked}</div>
              <div className="stat-label">Tracked Orders</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.delivered}</div>
              <div className="stat-label">Delivered</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.in_transit}</div>
              <div className="stat-label">In Transit</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.to_ship}</div>
              <div className="stat-label">To Ship</div>
            </div>
          </div>

          {Object.keys(stats.by_instruction).length > 0 && (
            <>
              <h3 className="text-lg font-semibold mt-4 mb-2">Shipping Instructions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(stats.by_instruction).map(([instruction, count]) => (
                  <div key={instruction} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className={`shipping-instruction ${instruction.toLowerCase().replace(/\s+/g, '-')}`}>
                      {instruction}
                    </div>
                    <div className="font-bold">{count}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-4">
            <button 
              onClick={updateDeliveryStatuses}
              disabled={updating}
              className="btn"
            >
              {updating ? 'Updating...' : 'Update Delivery Statuses'}
            </button>
          </div>
        </>
      )}
    </div>
  );
} 