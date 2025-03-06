"use client"

import { useState, useEffect, use } from "react";
import { fetchOrders, searchOrders } from "../utils/supabase-client";
import OrderSearch from "../components/OrderSearch";
import { StatusBadge, PaymentBadge, ShippingToggle, StatusSelector, OrderPackDropdown } from "../components/OrderActions";
import OrderDetailModalFixed from "../components/OrderDetailModalFixed";

export default function Orders({ searchParams }) {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredButtonId, setHoveredButtonId] = useState(null);

  // Get search query from URL parameters - properly unwrapped with use()
  const unwrappedParams = use(searchParams);
  const query = unwrappedParams?.q || '';
  
  // Fetch orders with search functionality
  useEffect(() => {
    async function loadOrders() {
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
    }
    
    loadOrders();
  }, [query]);

  // Format date for display - using a detailed format matching the image
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(',', '');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Parse shipping address for display
  const parseShippingAddress = (address) => {
    if (!address) return { street: 'N/A', city: 'N/A', postalCode: 'N/A', country: 'N/A' };
    
    const parts = address.split(',').map(part => part.trim());
    return {
      street: parts[0] || 'N/A',
      city: parts[1] || 'N/A',
      postalCode: parts[2] || 'N/A',
      country: parts[3] || 'NL'
    };
  };

  // Format address for display in table
  const formatAddressForTable = (address) => {
    if (!address) return 'N/A';
    
    const parsedAddress = parseShippingAddress(address);
    return `${parsedAddress.city}, ${parsedAddress.country}`;
  };

  const openOrderDetail = (orderId) => {
    // Use the global function if it exists (from the fixed modal)
    if (window.openOrderDetail) {
      window.openOrderDetail(orderId);
    } else {
      // Fallback to the old method
      setSelectedOrderId(orderId);
      setIsModalOpen(true);
    }
  };

  const closeOrderDetail = () => {
    setIsModalOpen(false);
    setSelectedOrderId(null);
  };

  // Create shipping label
  const createShippingLabel = async (orderId) => {
    try {
      const response = await fetch('/api/orders/create-shipping-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create shipping label');
      }
      
      // Refresh orders to show updated tracking info
      const updatedOrders = await fetchOrders();
      setOrders(updatedOrders);
      
      return { success: true };
    } catch (error) {
      console.error('Error creating shipping label:', error);
      alert(`Error: ${error.message}`);
      return { success: false, error };
    }
  };

  return (
    <div className="container">
      <header className="orders-header">
        <h1 className="text-black">Order Management System</h1>
        <h2 className="text-black">ALL ORDERS</h2>
      </header>

      <OrderSearch />

      <div className="orders-table-container">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
          </div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th className="text-black">Actions</th>
                <th className="text-black">ID</th>
                <th className="text-black">Name</th>
                <th className="text-black">Address</th>
                <th className="text-black">Order Pack</th>
                <th className="text-black">Paid?</th>
                <th className="text-black">Ok to Ship?</th>
                <th className="text-black">Status</th>
                <th className="text-black">Shipping</th>
                <th className="text-black">Label</th>
                <th className="text-black">Created At</th>
              </tr>
            </thead>
            <tbody>
              {orders && orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className="text-black">
                    <td>
                      <button 
                        onClick={() => openOrderDetail(order.id)}
                        className="open-btn"
                        onMouseEnter={() => setHoveredButtonId(order.id)}
                        onMouseLeave={() => setHoveredButtonId(null)}
                        style={{
                          backgroundColor: hoveredButtonId === order.id ? '#333333' : '#000000',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Open
                      </button>
                    </td>
                    <td>{order.id}</td>
                    <td>{order.name || 'N/A'}</td>
                    <td>{formatAddressForTable(order.shipping_address)}</td>
                    <td>
                      <OrderPackDropdown 
                        currentPack={order.order_pack} 
                        orderId={order.id} 
                      />
                    </td>
                    <td>
                      <PaymentBadge 
                        isPaid={order.paid} 
                        orderId={order.id} 
                      />
                    </td>
                    <td>
                      <ShippingToggle 
                        okToShip={order.ok_to_ship} 
                        orderId={order.id} 
                      />
                    </td>
                    <td>
                      <StatusSelector 
                        currentStatus={order.status || 'pending'} 
                        orderId={order.id} 
                      />
                    </td>
                    <td>
                      <div className={`shipping-instruction ${order.shipping_instruction?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                        {order.shipping_instruction || 'UNKNOWN'}
                      </div>
                    </td>
                    <td>
                      {order.label_url ? (
                        <a 
                          href={order.label_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        order.ok_to_ship && order.paid && order.shipping_address ? (
                          <button
                            onClick={() => createShippingLabel(order.id)}
                            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                          >
                            Create
                          </button>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )
                      )}
                    </td>
                    <td>{formatDate(order.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="empty-state text-black">
                    {query ? `No results found for "${query}"` : 'No orders available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Include the fixed modal component */}
      <OrderDetailModalFixed />
    </div>
  );
}