"use client"

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { fetchOrders, searchOrders, filterOrders } from "../utils/supabase-client";
import OrderSearch from "../components/OrderSearch";
import EnhancedOrdersTable from "../components/EnhancedOrdersTable";
import OrderFilters from "../components/OrderFilters";
import CountryTabs from "../components/CountryTabs";
import NewOrderModal from "../components/NewOrderModal";
import { calculateOrderInstruction } from "../utils/order-instructions";
import { normalizeCountryToCode, getCountryDisplayName, COUNTRY_MAPPING } from '../utils/country-utils';
import "./orders.css";
import { toast } from "react-hot-toast";
import { supabase } from "../utils/supabase-client";
import { Bell } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import OverdueOrdersPopup from "../components/OverdueOrdersPopup";

export default function Orders() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState(null);
  const [activeCountry, setActiveCountry] = useState('all');
  const [isMounted, setIsMounted] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [decodedQuery, setDecodedQuery] = useState('');
  const [activeUrlFilter, setActiveUrlFilter] = useState('');
  const [hasOverdueOrders, setHasOverdueOrders] = useState(false);
  const [isOverduePopupOpen, setIsOverduePopupOpen] = useState(false);
  const [overdueOrdersForPopup, setOverdueOrdersForPopup] = useState([]);
  const [isLoadingOverdue, setIsLoadingOverdue] = useState(false);

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
    const filterFromUrl = searchParams?.get('filter') || '';
    setActiveUrlFilter(filterFromUrl);
    if (filterFromUrl === 'stagnant-shipment') {
      setActiveFilters(null);
    }
  }, [searchParams]);

  // Function to check if ANY overdue orders exist (lightweight check)
  const checkIfAnyOverdueOrders = async () => {
    // Don't run if supabase client isn't ready
    if (!supabase) return;
    
    console.log("Performing lightweight check for any overdue orders (using became_to_ship_at)...");
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      const twentyFourHoursAgoISO = twentyFourHoursAgo.toISOString();

      // ASSUMPTION: 'became_to_ship_at' column exists and is updated correctly.
      // Fetch count of orders where label created > 24h ago AND status is still pending/ready
      const { error, count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true }) 
        .lt('became_to_ship_at', twentyFourHoursAgoISO) // Label created > 24h ago
        .not('became_to_ship_at', 'is', null)        
        // ADDED: Check if status is still pending or ready
        .in('status', ['Ready to send', 'pending']) 
        // Corrected column name
        .eq('paid', true)
        // .eq('ok_to_ship', true) // Also check if this column name is correct?
        // .is('tracking_number', null) // This might conflict now         
        // .not('status', 'in', '("shipped", "delivered", "cancelled")') // Redundant due to .in()

      if (error) {
        console.error("Error during lightweight check for stagnant orders:", error);
        return; 
      }
      
      const anyStagnant = count > 0;
      console.log(`Lightweight check result: count = ${count}, anyStagnant = ${anyStagnant}`);
      // Update state (keeping name hasOverdueOrders for now, but meaning changed)
      setHasOverdueOrders(!!anyStagnant);

    } catch (err) {
      console.error("Unexpected error during lightweight overdue check:", err);
    }
  };

  // Run the lightweight check once on mount
  useEffect(() => {
    checkIfAnyOverdueOrders();
  }, [supabase]); // Rerun if supabase client initializes later

  // Function to specifically fetch overdue orders based on the notification filter
  const fetchOverdueOrders = async () => {
    console.log("Fetching overdue 'TO SHIP' orders (using became_to_ship_at > 24h)...");
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      const twentyFourHoursAgoISO = twentyFourHoursAgo.toISOString();

      // ASSUMPTION: 'became_to_ship_at' column exists and is updated correctly.
      // Fetch orders where label created > 24h ago AND status is still pending/ready
      const { data: stagnantOrders, error } = await supabase
        .from('orders')
        .select('*, became_to_ship_at') // Select all needed fields + the timestamp
        .lt('became_to_ship_at', twentyFourHoursAgoISO) // Label created > 24h ago
        .not('became_to_ship_at', 'is', null)
        // ADDED: Check if status is still pending or ready
        .in('status', ['Ready to send', 'pending']) 
        // Corrected column name
        .eq('paid', true)
        // .eq('ok_to_ship', true) // Also check if this column name is correct?
        // .is('tracking_number', null) // Conflicts? Tracking number should exist if label created
        // .not('status', 'in', '("shipped", "delivered", "cancelled")') // Redundant
        .order('became_to_ship_at', { ascending: true }); // Order by oldest label creation time

      if (error) {
        console.error("Error fetching stagnant orders for popup:", error);
        toast.error("Failed to fetch stagnant orders list.");
        return [];
      }

      // No client-side filtering should be needed now
      const finalStagnantOrders = stagnantOrders || [];

      console.log(`Found ${finalStagnantOrders.length} stagnant orders for popup display.`);
      return finalStagnantOrders;

    } catch (err) {
      console.error("Unexpected error fetching stagnant orders for popup:", err);
      toast.error("Failed to fetch stagnant orders list.");
      return [];
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      let data;

      // Prioritize the URL filter if it's set
      if (activeUrlFilter === 'stagnant-shipment') {
        console.log("[loadOrders] Fetching stagnant orders based on URL filter.");
        data = await fetchOverdueOrders();
      } else if (activeFilters) {
        console.log("[loadOrders] Fetching with UI filters:", activeFilters);
        data = await filterOrders(activeFilters);
      } else if (decodedQuery) {
        console.log(`[loadOrders] Searching for orders with query: \"${decodedQuery}\"`);
        data = await searchOrders(decodedQuery);
        console.log(`[loadOrders] Search returned ${data?.length ?? 0} results`);
      } else {
        console.log("[loadOrders] Fetching all orders (no query/filters)");
        data = await fetchOrders();
      }
      
      // Instruction calculation is needed regardless of fetch source
      data = (data || []).map(order => ({
        ...order,
        instruction: calculateOrderInstruction(order)
      }));
      
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filterOrdersByCountry = (ordersToFilter, country) => {
    if (!ordersToFilter || ordersToFilter.length === 0) {
      return [];
    }
    
    if (country === 'all') {
      return ordersToFilter;
    }
    
    return ordersToFilter.filter(order => {
      let orderCountry = 'Unknown';
      
      if (order.shipping_address_country) {
        orderCountry = order.shipping_address_country;
      } else if (order.shipping_address?.country) {
        orderCountry = order.shipping_address.country;
      } else if (typeof order.shipping_address === 'string' && order.shipping_address.includes(',')) {
        const parts = order.shipping_address.split(',');
        if (parts.length >= 4) {
          orderCountry = parts[3].trim();
        }
      }
      
      if (isMounted) {
        const normalizedOrderCountry = normalizeCountryToCode(orderCountry);
        const normalizedFilterCountry = normalizeCountryToCode(country);
        return normalizedOrderCountry === normalizedFilterCountry;
      } else {
        return orderCountry === country;
      }
    });
  };

  const handleCountryChange = (country) => {
    setActiveCountry(country);
    const filtered = filterOrdersByCountry(orders, country);
    setFilteredOrders(filtered);
  };

  useEffect(() => {
    loadOrders();
  }, [decodedQuery, activeFilters, activeUrlFilter]);

  const handleFilterChange = (filters) => {
    setActiveFilters(filters);
  };

  const handleOrderUpdate = (updatedOrder) => {
    const updatedOrders = orders.map(order => 
      order.id === updatedOrder.id 
        ? { ...order, ...updatedOrder, instruction: calculateOrderInstruction({ ...order, ...updatedOrder }) } 
        : order
    );
    
    setOrders(updatedOrders);
    const filtered = filterOrdersByCountry(updatedOrders, activeCountry);
    setFilteredOrders(filtered);
    
    router.refresh();
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      const filtered = filterOrdersByCountry(orders, activeCountry);
      setFilteredOrders(filtered);
    }
  }, [orders, activeCountry, isMounted]);

  const handleOrderCreated = (newOrder) => {
    loadOrders();
  };

  const handleUpdateDeliveryStatus = async () => {
    try {
      setIsUpdatingStatus(true);
      const response = await fetch('/api/scheduled-tasks?task=delivery-status', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to update delivery statuses');
      }
      
      const data = await response.json();
      toast.success('Delivery statuses updated successfully');
      
      loadOrders();
    } catch (error) {
      console.error('Error updating delivery statuses:', error);
      toast.error('Failed to update delivery statuses');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // NEW: Handler for the notification button click
  const handleNotificationClick = async () => {
    console.log('[handleNotificationClick] Clicked. hasOverdueOrders:', hasOverdueOrders, 'isLoadingOverdue:', isLoadingOverdue);
    
    // Clear any active URL filter to prevent main table reload with filter
    if (activeUrlFilter) {
        console.log('[handleNotificationClick] Clearing activeUrlFilter.');
        setActiveUrlFilter(''); 
        // Optionally, also remove the filter from the URL, but this might trigger 
        // an unwanted page reload depending on router behavior. Let's avoid for now.
        // const params = new URLSearchParams(searchParams);
        // params.delete('filter');
        // router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
    }
    
    // Only exit if already loading, otherwise always proceed
    if (isLoadingOverdue) {
      console.log('[handleNotificationClick] Exiting: Currently loading.');
      return;
    }
    
    console.log('[handleNotificationClick] Setting loading state to true...');
    setIsLoadingOverdue(true); // Set loading state for button
    try {
      console.log('[handleNotificationClick] Calling fetchOverdueOrders...');
      const overdueData = await fetchOverdueOrders(); // Fetch the full list
      console.log('[handleNotificationClick] fetchOverdueOrders returned:', overdueData);
      setOverdueOrdersForPopup(overdueData || []);
      console.log('[handleNotificationClick] Setting isOverduePopupOpen to true...');
      setIsOverduePopupOpen(true); // Open the popup
    } catch (error) {
      // Error is handled within fetchOverdueOrders with a toast
      console.error("[handleNotificationClick] Error preparing overdue orders popup:", error);
    } finally {
      console.log('[handleNotificationClick] Setting loading state to false.');
      setIsLoadingOverdue(false); // Reset loading state
    }
  };

  // NEW: Handler to close the popup
  const handleCloseOverduePopup = () => {
    setIsOverduePopupOpen(false);
    setOverdueOrdersForPopup([]); // Clear data when closing
  };

  return (
    <div className="">
      <header className="orders-header flex justify-between items-center">
        <div>
          <h2 className="text-black">
            {activeUrlFilter === 'stagnant-shipment' ? 'STAGNANT ORDERS (> 24H SINCE LABEL)' :
             decodedQuery ? `SEARCH RESULTS FOR "${decodedQuery}"` :
             activeCountry === 'all' ? 'ALL ORDERS' :
             `${COUNTRY_MAPPING[activeCountry]?.name || activeCountry} ORDERS`}
          </h2>
          {activeUrlFilter === 'stagnant-shipment' ? (
             <p className="text-sm text-yellow-700 mt-1">
               {filteredOrders.length > 0
                 ? `Showing ${filteredOrders.length} order${filteredOrders.length === 1 ? '' : 's'} not shipped > 24h after label creation.`
                 : 'No stagnant orders found.'}
             </p>
           ) : decodedQuery ? (
            <p className="text-sm text-gray-600 mt-1">
              {filteredOrders.length > 0 
                ? `Found ${filteredOrders.length} ${filteredOrders.length === 1 ? 'order' : 'orders'} matching your search`
                : 'No orders found matching your search'}
            </p>
          ) : activeFilters ? (
            <p className="text-sm text-gray-600 mt-1">
              {filteredOrders.length > 0
                ? `Showing ${filteredOrders.length} ${filteredOrders.length === 1 ? 'order' : 'orders'} matching your filters`
                : 'No orders match your filters'}
            </p>
          ) : activeCountry !== 'all' ? (
            <p className="text-sm text-gray-600 mt-1">
              {filteredOrders.length > 0
                ? `Showing ${filteredOrders.length} ${filteredOrders.length === 1 ? 'order' : 'orders'} from ${COUNTRY_MAPPING[activeCountry]?.name || activeCountry}`
                : `No orders found from ${COUNTRY_MAPPING[activeCountry]?.name || activeCountry}`}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button 
             onClick={handleNotificationClick}
             title={hasOverdueOrders ? "Show overdue orders" : "No overdue orders"}
             disabled={isLoadingOverdue}
             className={`relative px-3 py-2 rounded-md transition-colors duration-150 
                         bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:bg-opacity-50 
                         flex items-center gap-1.5 ${isLoadingOverdue ? 'cursor-wait' : 'cursor-pointer'}`
            }
           >
            {isLoadingOverdue ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {/* Removed conditional logic - Text and Dot are always visible */}
            <>
              <span className="text-xs font-semibold text-red-600">NOT SHIPPED YET</span>
              {/* Adjusted dot slightly for better visual placement when always shown */}
              <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" /> 
            </>
           </button>
          <button 
            onClick={handleUpdateDeliveryStatus}
            disabled={isUpdatingStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
             {isUpdatingStatus ? (
               <>
                 <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                 Updating...
               </>
             ) : (
               <>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                 </svg>
                 Update Delivery Statuses
               </>
             )}
           </button>
          <button 
            onClick={() => setIsNewOrderModalOpen(true)}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            New Order
          </button>
        </div>
      </header>

      <OrderSearch />
      <OrderFilters onFilterChange={handleFilterChange} className="mt-[-1rem]" />

      <div className="orders-content mt-4">
        <CountryTabs
          orders={orders}
          activeTab={activeCountry}
          setActiveTab={handleCountryChange}
        />
        <EnhancedOrdersTable
          orders={filteredOrders}
          loading={loading}
          onRefresh={loadOrders}
          onOrderUpdate={handleOrderUpdate}
        />
      </div>

      <OverdueOrdersPopup
        isOpen={isOverduePopupOpen}
        onClose={handleCloseOverduePopup}
        orders={overdueOrdersForPopup}
      />

      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onOrderCreated={handleOrderCreated}
      />
    </div>
  );
}