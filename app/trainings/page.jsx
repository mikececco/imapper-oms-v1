'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabase } from '../components/Providers';
import { toast } from 'react-hot-toast';
import { Button } from "../components/ui/button";
import { formatDate, calculateDaysSince } from '../utils/date-utils';
import LateralOrderModal from '../components/LateralOrderModal';
import ReturnsTable from '../components/ReturnsTable'; // Assuming ReturnsTable is generic enough
import OrderSearch from '../components/OrderSearch';
import { formatAddressForTable } from '../utils/formatters';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { getReasonTagStyle } from '../components/EnhancedOrdersTable'; // For styling the reason tag
import { Mail, Link as LinkIcon } from 'lucide-react'; // Added import for Mail and Link icons

// Helper function to calculate days remaining
const calculateDaysRemaining = (trialEnd) => {
  if (!trialEnd) return null;
  const now = new Date();
  const end = new Date(trialEnd * 1000); // Convert Unix timestamp to milliseconds
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export default function TrainingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabase();

  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [orderPackLists, setOrderPackLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [decodedQuery, setDecodedQuery] = useState('');
  const [updatingTrainingStatus, setUpdatingTrainingStatus] = useState(null);
  const [updatingWelcomeEmailStatus, setUpdatingWelcomeEmailStatus] = useState(null);
  const [trialEnds, setTrialEnds] = useState({});
  const [trialEndMessages, setTrialEndMessages] = useState({});
  const [subscriptionIds, setSubscriptionIds] = useState({});

  useEffect(() => {
    const queryFromUrl = searchParams?.get('q') || '';
    try {
      setDecodedQuery(decodeURIComponent(queryFromUrl));
    } catch (e) {
      console.error("Failed to decode query param:", e);
      setDecodedQuery(queryFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    setIsMounted(true);
    fetchTrainingOrdersAndPacks();
  }, []);

  useEffect(() => {
    if (loading || loadingPacks) return;
    filterOrdersTable();
  }, [decodedQuery, allOrders, orderPackLists, loading, loadingPacks]);

  const fetchTrainingOrdersAndPacks = async () => {
    setLoading(true);
    setLoadingPacks(true);
    try {
      const ordersQuery = supabase
        .from('orders')
        .select('*')
        .eq('created_via', 'standard')
        .eq('paid', true)
        .not('status', 'eq', 'pending')
        .not('status', 'eq', 'Ready to send')
        .or(
          'status.ilike.%delivered%,'
          + 'status.ilike.%package delivered%,'
          + 'status.ilike.%delivery%,'
          + 'status.ilike.%delivering%,'
          + 'status.ilike.%shipment collected by customer%,'
          + 'status.ilike.%package picked-up%'
        )
        .in('reason_for_shipment', ['new order', 'upgrade'])
        .order('created_at', { ascending: false });

      const [ordersResult, packsResult] = await Promise.allSettled([
        ordersQuery,
        supabase
          .from('order_pack_lists')
          .select('id, label')
      ]);

      if (ordersResult.status === 'fulfilled') {
        const { data, error } = ordersResult.value;
        if (error) throw error;
        setAllOrders(data || []);
      } else {
        console.error('Error loading training orders:', ordersResult.reason);
        toast.error('Failed to load training orders');
        setAllOrders([]);
      }

      if (packsResult.status === 'fulfilled') {
        const { data, error } = packsResult.value;
        if (error) {
          console.error('Error fetching order pack lists:', error);
          toast.error('Failed to load order pack lists.');
        }
        setOrderPackLists(data || []);
      } else {
        console.error('Error loading order pack lists:', packsResult.reason);
        toast.error('Failed to load order pack lists.');
        setOrderPackLists([]);
      }

    } catch (error) {
      console.error('Error loading training page data:', error);
      toast.error(`Failed to load page data: ${error.message}`);
      setAllOrders([]);
      setOrderPackLists([]);
    } finally {
      setLoading(false);
      setLoadingPacks(false);
    }
  };

  // Fetch trial_end for each order's stripe_customer_id
  useEffect(() => {
    const fetchAllTrialEnds = async () => {
      const updates = {};
      const messages = {};
      const subIds = {};
      const links = {};
      for (const order of allOrders) {
        const stripeCustomerId = order.stripe_customer_id;
        if (stripeCustomerId && !trialEnds[stripeCustomerId]) {
          try {
            const res = await fetch(`/api/stripe/trial-end/${stripeCustomerId}`);
            if (!res.ok) throw new Error('Failed to fetch trial end');
            const data = await res.json();
            updates[stripeCustomerId] = data.trial_end;
            messages[stripeCustomerId] = data.message;
            if (data.link) {
              links[stripeCustomerId] = data.link;
            }
          } catch (error) {
            console.error('Error fetching trial end:', error);
            updates[stripeCustomerId] = null;
            messages[stripeCustomerId] = 'Error fetching data';
          }
        }
      }
      if (Object.keys(updates).length > 0) {
        setTrialEnds(prev => ({ ...prev, ...updates }));
        setTrialEndMessages(prev => ({ ...prev, ...messages }));
      }
      if (Object.keys(links).length > 0) {
        setSubscriptionIds(prev => ({ ...prev, ...links }));
      }
    };
    if (allOrders.length) fetchAllTrialEnds();
  }, [allOrders]);

  const filterOrdersTable = () => {
    let filtered = allOrders;
    if (decodedQuery) {
      const lowercaseQuery = decodedQuery.toLowerCase();
      filtered = allOrders.filter(order => {
        const packLabel = orderPackLists.find(pack => pack.id === order.order_pack_list_id)?.label || '';
        // Add more fields to search if needed
        return (
          (order.id && order.id.toLowerCase().includes(lowercaseQuery)) ||
          (order.name && order.name.toLowerCase().includes(lowercaseQuery)) ||
          (order.email && order.email.toLowerCase().includes(lowercaseQuery)) ||
          (packLabel && packLabel.toLowerCase().includes(lowercaseQuery)) ||
          (order.reason_for_shipment && order.reason_for_shipment.toLowerCase().includes(lowercaseQuery))
        );
      });
    }
    setFilteredOrders(filtered);
  };

  const handleOpenOrderModal = (orderId) => {
    const orderToOpen = allOrders.find(order => order.id === orderId);
    if (orderToOpen) {
      setSelectedOrder(orderToOpen);
      setIsModalOpen(true);
    }
  };
  
  const getOrderPackLabel = useCallback((order) => {
    return orderPackLists.find(pack => pack.id === order.order_pack_list_id)?.label || 'N/A';
  }, [orderPackLists]);

  const handleTrainingDoneToggle = async (orderId, currentStatus) => {
    if (updatingTrainingStatus === orderId) return; // Prevent multiple clicks
    setUpdatingTrainingStatus(orderId);
    const newValue = !currentStatus;
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ training_done: newValue, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select('id, training_done, updated_at')
        .single();

      if (error) throw error;

      // Update local state
      setAllOrders(prevOrders => 
        prevOrders.map(o => o.id === orderId ? { ...o, training_done: data.training_done, updated_at: data.updated_at } : o)
      );
      toast.success(`Training status updated for order ${orderId}.`);
    } catch (err) {
      console.error('Error updating training status:', err);
      toast.error('Failed to update training status.');
    } finally {
      setUpdatingTrainingStatus(null);
    }
  };

  const handleWelcomeEmailSentToggle = async (orderId, currentStatus) => {
    if (updatingWelcomeEmailStatus === orderId) return; // Prevent multiple clicks
    setUpdatingWelcomeEmailStatus(orderId);
    const newValue = !currentStatus;
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ welcome_email_sent: newValue, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select('id, welcome_email_sent, updated_at')
        .single();

      if (error) throw error;

      // Update local state
      setAllOrders(prevOrders => 
        prevOrders.map(o => o.id === orderId ? { ...o, welcome_email_sent: data.welcome_email_sent, updated_at: data.updated_at } : o)
      );
      toast.success(`Welcome email status updated for order ${orderId}.`);
    } catch (err) {
      console.error('Error updating welcome email status:', err);
      toast.error('Failed to update welcome email status.');
    } finally {
      setUpdatingWelcomeEmailStatus(null);
    }
  };

  const trainingOrdersColumns = [
    {
      id: 'actions',
      label: 'Actions',
      type: 'actions',
      className: 'whitespace-nowrap',
      actions: [
        {
          label: 'View Details',
          handler: handleOpenOrderModal, 
          variant: 'outline', 
          size: 'sm'
        },
      ]
    },
    // { id: 'id', label: 'Order ID', type: 'link', linkPrefix: '/orders/', className: 'w-[110px] whitespace-nowrap' }, 
    { id: 'name', label: 'Customer', className: 'w-[180px] max-w-[180px] whitespace-nowrap truncate' },
    { 
      id: 'reason_for_shipment', 
      label: 'Order Type', 
      className: 'w-[120px] whitespace-nowrap text-center', 
      type: 'custom', 
      render: (order) => {
        const reason = order.reason_for_shipment;
        if (!reason) return <span className="text-xs text-gray-400">N/A</span>;
        const styleClasses = getReasonTagStyle(reason);
        return <span className={styleClasses}>{reason.charAt(0).toUpperCase() + reason.slice(1)}</span>;
      }
    },
    {
      id: 'welcome_email_sent',
      label: (
        <div className="flex items-center justify-center">
          <span>Welcome</span>
          <Mail className="ml-1 h-4 w-4" />
        </div>
      ),
      className: 'w-[100px] text-center',
      type: 'custom',
      render: (order) => (
        <div className="flex justify-center items-center">
          <Checkbox
            checked={!!order.welcome_email_sent}
            onCheckedChange={() => handleWelcomeEmailSentToggle(order.id, !!order.welcome_email_sent)}
            disabled={updatingWelcomeEmailStatus === order.id}
            aria-label={`Toggle welcome email sent for order ${order.id}, customer: ${order.name}`}
          />
        </div>
      ),
    },
    {
      id: 'trial_end',
      label: 'Trial Period',
      className: 'w-[150px] whitespace-nowrap text-center',
      type: 'custom',
      render: (order) => {
        const stripeCustomerId = order.stripe_customer_id;
        if (!stripeCustomerId) {
          return <span className="text-xs text-gray-400">No Stripe ID</span>;
        }
        const trialEnd = trialEnds[stripeCustomerId];
        const message = trialEndMessages[stripeCustomerId];
        const subscriptionId = subscriptionIds[stripeCustomerId];
        // Loading state
        if (trialEnd === undefined) {
          return <span className="text-xs text-gray-400">Loading...</span>;
        }
        // No trial or error states
        if (!trialEnd) {
          return (
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-gray-400">{message || 'No Trial'}</span>
            </div>
          );
        }
        // Success state with trial end data
        const daysRemaining = calculateDaysRemaining(trialEnd);
        const formattedDate = formatDate(new Date(trialEnd * 1000));
        let badgeVariant = 'default';
        if (daysRemaining < 0) {
          badgeVariant = 'destructive';
        } else if (daysRemaining <= 7) {
          badgeVariant = 'warning';
        }
        const stripeUrl = subscriptionId ? `https://dashboard.stripe.com/subscriptions/${subscriptionId}` : null;
        return (
          <div className="flex flex-col items-center gap-1">
            {stripeUrl ? (
              <a href={stripeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline text-blue-600 hover:text-blue-800">
                <Badge variant={badgeVariant}>
                  {daysRemaining < 0 
                    ? 'Expired' 
                    : `${daysRemaining} days left`}
                </Badge>
                <LinkIcon className="h-4 w-4 text-blue-500" aria-label="Open in Stripe" />
              </a>
            ) : (
              <Badge variant={badgeVariant}>
                {daysRemaining < 0 
                  ? 'Expired' 
                  : `${daysRemaining} days left`}
              </Badge>
            )}
            <span className="text-xs text-gray-500">{formattedDate}</span>
          </div>
        );
      }
    },
    {
      id: 'training_done',
      label: 'Training Done',
      className: 'w-[100px] text-center',
      type: 'custom',
      render: (order) => (
        <div className="flex justify-center items-center">
          <Checkbox
            checked={!!order.training_done}
            onCheckedChange={() => handleTrainingDoneToggle(order.id, !!order.training_done)}
            disabled={updatingTrainingStatus === order.id}
            aria-label={`Mark training as ${order.training_done ? 'not done' : 'done'} for order ${order.id}, customer: ${order.name}`}
          />
        </div>
      )
    },
    {
      id: 'days_since_arrival',
      label: 'Days Since Arrival',
      className: 'w-[120px] text-center',
      type: 'custom',
      render: (order) => {
        if (!order.sendcloud_tracking_history || order.sendcloud_tracking_history.length === 0) {
          return <span className="text-xs text-gray-400">No History</span>;
        }
        let latestDeliveryEvent = null;
        try {
          const history = typeof order.sendcloud_tracking_history === 'string' 
                          ? JSON.parse(order.sendcloud_tracking_history) 
                          : order.sendcloud_tracking_history;

          for (const event of history) {
            const parentStatus = event.parent_status?.toLowerCase() || '';
            const carrierMessage = event.carrier_message?.toLowerCase() || '';
            
            // Check parent_status for 'delivered' OR carrier_message for 'delivered' or 'delivery'
            if (parentStatus.includes('delivered') || 
                parentStatus.includes('delivery') ||
                parentStatus.includes('package delivered') || 
                parentStatus.includes('delivering') ||
                parentStatus.includes('shipment collected by customer') || 
                parentStatus.includes('package picked-up') ||
                carrierMessage.includes('delivered') || 
                carrierMessage.includes('delivery') ||
                carrierMessage.includes('delivering') ||
                carrierMessage.includes('package delivered') || 
                carrierMessage.includes('shipment collected by customer') || 
                carrierMessage.includes('package picked-up')) {
              if (!latestDeliveryEvent || new Date(event.carrier_update_timestamp) > new Date(latestDeliveryEvent.carrier_update_timestamp)) {
                latestDeliveryEvent = event;
              }
            }
          }
        } catch (e) {
          console.error("Error parsing sendcloud_tracking_history for order", order.id, e);
          return <span className="text-xs text-red-500">Error</span>;
        }

        if (latestDeliveryEvent && latestDeliveryEvent.carrier_update_timestamp) {
          const days = calculateDaysSince(
            typeof latestDeliveryEvent.carrier_update_timestamp === 'number'
              ? new Date(latestDeliveryEvent.carrier_update_timestamp * 1000).toISOString()
              : latestDeliveryEvent.carrier_update_timestamp
          );
          return days !== null ? `${days} day(s)` : 'N/A';
        }
        return <span className="text-xs text-gray-500">Not Delivered</span>;
      }
    },
    { 
      id: 'status', 
      label: 'Order Status', 
      className: 'w-[120px] whitespace-nowrap',
      type: 'custom',
      render: (order) => {
        const displayStatus = order.manual_instruction || order.status;
        let badgeVariant = 'secondary';
        const lowerStatus = displayStatus?.toLowerCase();
        if (lowerStatus === 'delivered') badgeVariant = 'success';
        else if (lowerStatus === 'pending' || lowerStatus === 'action required' || lowerStatus === 'to ship') badgeVariant = 'outline';
        else if (lowerStatus === 'processing' || lowerStatus === 'shipped') badgeVariant = 'default';
        else if (lowerStatus === 'cancelled') badgeVariant = 'destructive';
        return displayStatus ? <Badge variant={badgeVariant}>{displayStatus}</Badge> : <span className="text-gray-400">N/A</span>;
      } 
    },
    { 
      id: 'order_pack_list_id',
      label: 'Pack', 
      className: 'w-[150px] whitespace-nowrap truncate',
      type: 'custom',
      render: getOrderPackLabel
    },
    { id: 'shipping_address', label: 'Shipping Address', className: 'w-[200px] max-w-[200px] whitespace-nowrap', type: 'custom', render: (order) => formatAddressForTable(order, isMounted) },
    { id: 'created_at', label: 'Created', type: 'date', className: 'w-[130px] whitespace-nowrap' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Training</h1>
          <p className="text-gray-600">Displaying orders where training is required.</p>
        </div>
      </header>

      <div className="mb-6">
        <OrderSearch />
      </div>

      <ReturnsTable
         orders={filteredOrders}
         loading={loading || loadingPacks}
         columns={trainingOrdersColumns}
         handleRowClick={handleOpenOrderModal} // Or null if row click shouldn't open modal directly
       />

      {selectedOrder && (
        <LateralOrderModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
} 