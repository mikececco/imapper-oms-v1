"use client"

import { useState, useEffect, use } from "react";
import { fetchOrders, searchOrders, filterOrders } from "../utils/supabase-client";
import OrderSearch from "../components/OrderSearch";
import OrderDetailModal from "../components/OrderDetailModal";
import EnhancedOrdersTable from "../components/EnhancedOrdersTable";
import OrderFilters from "../components/OrderFilters";
import "./orders.css";

export default function Orders({ searchParams }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState(null);

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
      
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [query, activeFilters]);

  const handleFilterChange = (filters) => {
    setActiveFilters(filters);
  };

  return (
    <div className="container">
      <header className="orders-header">
        <h1 className="text-black">Order Management System</h1>
        <h2 className="text-black">
          {query ? `SEARCH RESULTS FOR "${query}"` : 
           activeFilters ? 'FILTERED ORDERS' : 'ALL ORDERS'}
        </h2>
        {query && orders.length > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            Found {orders.length} {orders.length === 1 ? 'order' : 'orders'} matching your search
          </p>
        )}
        {activeFilters && (
          <p className="text-sm text-gray-600 mt-1">
            Showing {orders.length} {orders.length === 1 ? 'order' : 'orders'} matching your filters
          </p>
        )}
      </header>

      <OrderSearch />

      <div className="orders-layout">
        <div className="filters-sidebar">
          <OrderFilters onFilterChange={handleFilterChange} />
        </div>
        <div className="orders-content">
          <EnhancedOrdersTable 
            orders={orders} 
            loading={loading} 
            onRefresh={loadOrders} 
          />
        </div>
      </div>
      
      {/* Include the OrderDetailModal component */}
      {/* This is the single order detail modal used throughout the application */}
      <OrderDetailModal />
    </div>
  );
}