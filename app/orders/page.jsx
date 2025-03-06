"use client"

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { fetchOrders, searchOrders, filterOrders } from "../utils/supabase-client";
import OrderSearch from "../components/OrderSearch";
import EnhancedOrdersTable from "../components/EnhancedOrdersTable";
import OrderFilters from "../components/OrderFilters";
import CountryTabs from "../components/CountryTabs";
import { calculateOrderInstruction } from "../utils/order-instructions";
import "./orders.css";

export default function Orders({ searchParams }) {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState(null);
  const [activeCountry, setActiveCountry] = useState('all');

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
      filterOrdersByCountry(data, activeCountry);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter orders by country
  const filterOrdersByCountry = (ordersToFilter, country) => {
    if (!ordersToFilter || ordersToFilter.length === 0) {
      setFilteredOrders([]);
      return;
    }
    
    if (country === 'all') {
      setFilteredOrders(ordersToFilter);
      return;
    }
    
    const filtered = ordersToFilter.filter(order => {
      let orderCountry = 'Unknown';
      
      if (order.shipping_address_country) {
        orderCountry = order.shipping_address_country.trim().toUpperCase();
      } else if (order.shipping_address) {
        // Try to extract from combined address
        const parts = order.shipping_address.split(',');
        if (parts.length >= 4) {
          orderCountry = parts[3].trim().toUpperCase();
        }
      }
      
      // Normalize country name
      if (orderCountry === 'USA' || orderCountry === 'US' || orderCountry === 'UNITED STATES') {
        orderCountry = 'USA';
      } else if (orderCountry === 'UK' || orderCountry === 'UNITED KINGDOM' || orderCountry === 'GREAT BRITAIN') {
        orderCountry = 'UK';
      } else if (orderCountry === 'FRANCE' || orderCountry === 'FR') {
        orderCountry = 'FRANCE';
      } else if (orderCountry === 'GERMANY' || orderCountry === 'DE') {
        orderCountry = 'GERMANY';
      } else if (orderCountry === 'NETHERLANDS' || orderCountry === 'NL') {
        orderCountry = 'NETHERLANDS';
      }
      
      return orderCountry === country;
    });
    
    setFilteredOrders(filtered);
  };

  // Handle country tab change
  const handleCountryChange = (country) => {
    setActiveCountry(country);
    filterOrdersByCountry(orders, country);
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
    filterOrdersByCountry(updatedOrders, activeCountry);
    
    // Update the router cache without navigating
    router.refresh();
  };

  return (
    <div className="container">
      <header className="orders-header">
        <h1 className="text-black">Order Management System</h1>
        <h2 className="text-black">
          {query ? `SEARCH RESULTS FOR "${query}"` : 
           activeFilters ? 'FILTERED ORDERS' : 
           activeCountry !== 'all' ? `ORDERS FROM ${activeCountry}` : 'ALL ORDERS'}
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
            Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} from {activeCountry}
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
            onCountryChange={handleCountryChange} 
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