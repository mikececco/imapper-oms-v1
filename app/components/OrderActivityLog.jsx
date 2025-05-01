'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from './Providers';
import { formatDistanceToNow } from 'date-fns';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  TruckIcon, 
  CreditCardIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// Map activity types to icons
const ACTIVITY_ICONS = {
  'payment_status': CreditCardIcon,
  'shipping_status': TruckIcon,
  'order_status': ClockIcon,
  'order_update': ArrowPathIcon,
  'default': InformationCircleIcon
};

// Format activity message based on action type and data
const formatActivityMessage = (activity) => {
  const { action_type, changes } = activity;
  
  switch (action_type) {
    case 'payment_status':
      return `Payment status changed to ${changes.new_status}`;
    case 'shipping_status':
      return `Shipping status updated to ${changes.new_status}`;
    case 'order_status':
      return `Order status changed to ${changes.new_status}`;
    case 'shipping_label_created':
      return `Shipping label created (ID: ${changes.shipping_id || 'N/A'}, Tracking: ${changes.tracking_number || 'N/A'})`;
    case 'order_update':
      const updateChanges = [];
      if (changes) {
        Object.entries(changes).forEach(([field, { old_value, new_value }]) => {
          // Format field name for display
          const formattedField = field.replace(/_/g, ' ').toLowerCase();
          updateChanges.push(`${formattedField} updated from "${old_value}" to "${new_value}"`);
        });
      }
      return updateChanges.join(', ') || 'Order details updated';
    default:
      return activity.message || `Activity: ${action_type.replace(/_/g, ' ')}`;
  }
};

export default function OrderActivityLog({ orderId }) {
  const supabase = useSupabase();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const displayLimit = 5;

  // Fetch activities for the order
  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('order_activities')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setActivities(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`order_activities:${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'order_activities',
        filter: `order_id=eq.${orderId}`
      }, (payload) => {
        setActivities(current => [payload.new, ...current]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center py-4">
        {error}
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="text-gray-500 text-center py-4">
        No activities recorded yet
      </div>
    );
  }

  const displayedActivities = showAll ? activities : activities.slice(0, displayLimit);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {displayedActivities.map((activity, index) => {
          const IconComponent = ACTIVITY_ICONS[activity.action_type] || ACTIVITY_ICONS.default;
          
          return (
            <div 
              key={activity.id} 
              className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-shrink-0">
                <IconComponent className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 break-words">
                  {formatActivityMessage(activity)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {activities.length > displayLimit && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-sm text-gray-600 hover:text-gray-900 py-2 border rounded-md hover:bg-gray-50 transition-colors"
        >
          {showAll ? 'Show Less' : `Show ${activities.length - displayLimit} More Activities`}
        </button>
      )}
    </div>
  );
} 