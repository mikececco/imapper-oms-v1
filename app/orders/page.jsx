"use client"

import { useState, useEffect, use } from "react";
import { fetchOrders, searchOrders } from "../utils/supabase-client";
import OrderSearch from "../components/OrderSearch";
import OrderDetailModalFixed from "../components/OrderDetailModalFixed";
import EnhancedOrdersTable from "../components/EnhancedOrdersTable";

export default function Orders({ searchParams }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get search query from URL parameters - properly unwrapped with use()
  const unwrappedParams = use(searchParams);
  const query = unwrappedParams?.q || '';
  
  // Fetch orders with search functionality
  const loadOrders = async () => {
    try {
      setLoading(true);
      let data;
      
      if (query) {
        data = await searchOrders(query);
      } else {
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
  }, [query]);

  return (
    <div className="container">
      <header className="orders-header">
        <h1 className="text-black">Order Management System</h1>
        <h2 className="text-black">
          {query ? `SEARCH RESULTS FOR "${query}"` : 'ALL ORDERS'}
        </h2>
        {query && orders.length > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            Found {orders.length} {orders.length === 1 ? 'order' : 'orders'} matching your search
          </p>
        )}
      </header>

      <OrderSearch />

      <EnhancedOrdersTable 
        orders={orders} 
        loading={loading} 
        onRefresh={loadOrders} 
      />
      
      {/* Include the OrderDetailModalFixed component */}
      <OrderDetailModalFixed />
    </div>
  );
}