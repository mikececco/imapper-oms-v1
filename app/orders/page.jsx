"use client"

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { fetchOrders, searchOrders, filterOrders } from "../utils/supabase-client";
import OrderSearch from "../components/OrderSearch";
import EnhancedOrdersTable from "../components/EnhancedOrdersTable";
import OrderFilters from "../components/OrderFilters";
import CountryTabs from "../components/CountryTabs";
import { calculateOrderInstruction } from "../utils/order-instructions";
import { normalizeCountryToCode, getCountryDisplayName, COUNTRY_MAPPING } from '../utils/country-utils';
import "./orders.css";

export default function Orders({ searchParams }) {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState(null);
  const [activeCountry, setActiveCountry] = useState('all');
  const [isMounted, setIsMounted] = useState(false);

  // Get search query from URL parameters - properly unwrapped with use()
  const unwrappedParams = use(searchParams);
  const query = unwrappedParams?.q || '';
  
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
        data = await searchOrders(query);
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

  return (
    <div className="container">
      <header className="orders-header">
        <h1 className="text-2xl font-bold mb-4">
          {activeCountry === 'all' ? 'All Orders' : 
            (isMounted ? `${getCountryDisplayName(activeCountry)} Orders` : `${activeCountry} Orders`)}
        </h1>
        <h2 className="text-black">
          {query ? `SEARCH RESULTS FOR "${query}"` : 
           activeFilters ? 'FILTERED ORDERS' : 
           activeCountry !== 'all' ? `ORDERS FROM ${COUNTRY_MAPPING[activeCountry]?.name || activeCountry}` : 'ALL ORDERS'}
        </h2>
        {query && filteredOrders.length > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            Found {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} matching your search
          </p>
        )}
        {activeFilters && (
          <p className="text-sm text-gray-600 mt-1">
            Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} matching your filters
          </p>
        )}
        {activeCountry !== 'all' && !query && !activeFilters && (
          <p className="text-sm text-gray-600 mt-1">
            Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} from {COUNTRY_MAPPING[activeCountry]?.name || activeCountry}
          </p>
        )}
      </header>

      <OrderSearch />

      <div className="orders-layout">
        <div className="filters-sidebar">
          <OrderFilters onFilterChange={handleFilterChange} />
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
    </div>
  );
}