"use client"

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchOrders, searchOrders, filterOrders } from "../utils/supabase-client";
import OrderSearch from "../components/OrderSearch";
import EnhancedOrdersTable from "../components/EnhancedOrdersTable";
import OrderFilters from "../components/OrderFilters";
import CountryTabs from "../components/CountryTabs";
import NewOrderModal from "../components/NewOrderModal";
import { calculateOrderInstruction } from "../utils/order-instructions";
import { normalizeCountryToCode, getCountryDisplayName, COUNTRY_MAPPING } from '../utils/country-utils';
import "./orders.css";

export default function Orders() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState(null);
  const [activeCountry, setActiveCountry] = useState('all');
  const [isMounted, setIsMounted] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

  // Get search query from URL parameters using useSearchParams hook
  const query = searchParams?.get('q') ? decodeURIComponent(searchParams.get('q')) : '';
  
  // Fetch orders with search functionality
  const loadOrders = async () => {
    try {
      setLoading(true);
      let data;
      
      if (activeFilters) {
        // If filters are active, use them
        data = await filterOrders(activeFilters);
      } else if (query) {
        // If search query is present but no filters
        console.log(`Searching for orders with query: "${query}"`);
        data = await searchOrders(query);
        console.log(`Search returned ${data.length} results`);
      } else {
        // No filters, no search
        data = await fetchOrders();
      }
      
      // Calculate instruction for each order
      data = data.map(order => ({
        ...order,
        instruction: calculateOrderInstruction(order)
      }));
      
      setOrders(data);
      const filtered = filterOrdersByCountry(data, activeCountry);
      setFilteredOrders(filtered);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter orders by country
  const filterOrdersByCountry = (ordersToFilter, country) => {
    if (!ordersToFilter || ordersToFilter.length === 0) {
      return [];
    }
    
    if (country === 'all') {
      return ordersToFilter;
    }
    
    return ordersToFilter.filter(order => {
      // Try to get country from different possible fields
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
      
      // Only normalize on client side
      if (isMounted) {
        const normalizedOrderCountry = normalizeCountryToCode(orderCountry);
        const normalizedFilterCountry = normalizeCountryToCode(country);
        return normalizedOrderCountry === normalizedFilterCountry;
      } else {
        // Simple string comparison on server side
        return orderCountry === country;
      }
    });
  };

  // Handle country tab change
  const handleCountryChange = (country) => {
    setActiveCountry(country);
    const filtered = filterOrdersByCountry(orders, country);
    setFilteredOrders(filtered);
  };

  useEffect(() => {
    loadOrders();
  }, [query, activeFilters]);

  const handleFilterChange = (filters) => {
    setActiveFilters(filters);
  };

  // Handle order updates from child components
  const handleOrderUpdate = (updatedOrder) => {
    // Update the orders state with the updated order
    const updatedOrders = orders.map(order => 
      order.id === updatedOrder.id 
        ? { ...order, ...updatedOrder, instruction: calculateOrderInstruction({ ...order, ...updatedOrder }) } 
        : order
    );
    
    setOrders(updatedOrders);
    const filtered = filterOrdersByCountry(updatedOrders, activeCountry);
    setFilteredOrders(filtered);
    
    // Update the router cache without navigating
    router.refresh();
  };

  // Add useEffect to set isMounted after client-side rendering and initialize filtered orders
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Add separate useEffect to update filtered orders when orders or activeCountry changes
  useEffect(() => {
    if (orders.length > 0) {
      const filtered = filterOrdersByCountry(orders, activeCountry);
      setFilteredOrders(filtered);
    }
  }, [orders, activeCountry, isMounted]);

  // Handle order creation
  const handleOrderCreated = (newOrder) => {
    // Refresh the orders list
    loadOrders();
  };

  return (
    <div className="container">
      <header className="orders-header flex justify-between items-center">
        <div>
          <h2 className="text-black">
            {query ? `SEARCH RESULTS FOR "${query}"` : 
             activeCountry === 'all' ? 'ALL ORDERS' :
             `${COUNTRY_MAPPING[activeCountry]?.name || activeCountry} ORDERS`}
          </h2>
          {query && (
            <p className="text-sm text-gray-600 mt-1">
              {filteredOrders.length > 0 
                ? `Found ${filteredOrders.length} ${filteredOrders.length === 1 ? 'order' : 'orders'} matching your search`
                : 'No orders found matching your search'}
            </p>
          )}
          {activeFilters && (
            <p className="text-sm text-gray-600 mt-1">
              {filteredOrders.length > 0
                ? `Showing ${filteredOrders.length} ${filteredOrders.length === 1 ? 'order' : 'orders'} matching your filters`
                : 'No orders match your filters'}
            </p>
          )}
          {activeCountry !== 'all' && !query && !activeFilters && (
            <p className="text-sm text-gray-600 mt-1">
              {filteredOrders.length > 0
                ? `Showing ${filteredOrders.length} ${filteredOrders.length === 1 ? 'order' : 'orders'} from ${COUNTRY_MAPPING[activeCountry]?.name || activeCountry}`
                : `No orders found from ${COUNTRY_MAPPING[activeCountry]?.name || activeCountry}`}
            </p>
          )}
        </div>
        <button 
          onClick={() => setIsNewOrderModalOpen(true)}
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          New Order
        </button>
      </header>

      <OrderSearch />

      <div className="orders-layout">
        <div className="sidebar-container">
          <div className="filters-sidebar open">
            <OrderFilters onFilterChange={handleFilterChange} />
          </div>
        </div>
        
        <div className="orders-content">
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
      </div>

      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onOrderCreated={handleOrderCreated}
      />
    </div>
  );
}