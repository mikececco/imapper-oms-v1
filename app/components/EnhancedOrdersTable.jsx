"use client"

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { StatusBadge, PaymentBadge, ShippingToggle, OrderPackDropdown } from "./OrderActions";
import ShippingMethodDropdown from "./ShippingMethodDropdown";
import { useOrderDetailModal } from "./OrderDetailModal";
import { calculateOrderInstruction } from "../utils/order-instructions";
import "./order-status.css";

// Format date for display
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

// Format address for display in table with truncation
const formatAddressForTable = (order) => {
  if (!order) return 'N/A';
  
  let fullAddress = '';
  
  // Check if we have individual address components
  if (order.shipping_address_line1 || order.shipping_address_city || order.shipping_address_postal_code || order.shipping_address_country) {
    const addressParts = [
      order.shipping_address_line1,
      order.shipping_address_line2,
      order.shipping_address_city,
      order.shipping_address_postal_code,
      order.shipping_address_country
    ].filter(Boolean);
    
    fullAddress = addressParts.join(', ') || 'N/A';
  }
  // Fallback to legacy shipping_address field if it exists
  else if (order.shipping_address) {
    const parsedAddress = parseShippingAddress(order.shipping_address);
    fullAddress = `${parsedAddress.street}, ${parsedAddress.city}, ${parsedAddress.postalCode}, ${parsedAddress.country}`;
  }
  else {
    return 'N/A';
  }
  
  return fullAddress;
};

// Truncate text with ellipsis if it exceeds maxLength
const truncateText = (text, maxLength = 30) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export default function EnhancedOrdersTable({ orders, loading, onRefresh }) {
  // Use useRef to track client-side rendering
  const hasMounted = useRef(false);
  const [hoveredButtonId, setHoveredButtonId] = useState(null);
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const { openModal } = useOrderDetailModal();
  const [isMounted, setIsMounted] = useState(false);

  // Only run this effect after the component has mounted on the client
  useEffect(() => {
    hasMounted.current = true;
  }, []);

  useEffect(() => {
    // This will only run on the client, after the component has mounted
    setIsMounted(true);
  }, []);

  const openOrderDetail = (orderId) => {
    openModal(orderId);
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
      if (onRefresh) onRefresh();
      
      return { success: true };
    } catch (error) {
      console.error('Error creating shipping label:', error);
      alert(`Error: ${error.message}`);
      return { success: false, error };
    }
  };

  // Update delivery status
  const updateDeliveryStatus = async (orderId) => {
    try {
      const response = await fetch(`/api/orders/update-delivery-status?orderId=${orderId}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update delivery status');
      }
      
      // Refresh orders to show updated status
      if (onRefresh) onRefresh();
      
      return { success: true };
    } catch (error) {
      console.error('Error updating delivery status:', error);
      alert(`Error: ${error.message}`);
      return { success: false, error };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="enhanced-table-container">
      <div className="enhanced-table-scrollable">
        <Table>
          <TableCaption>
            {orders.length > 0 
              ? `Showing ${orders.length} order${orders.length === 1 ? '' : 's'}.` 
              : 'No orders found.'}
          </TableCaption>
          <TableHeader className="enhanced-table-header">
            <TableRow>
              <TableHead className="text-black w-[60px] sticky-col">Actions</TableHead>
              <TableHead className="text-black w-[60px]">ID</TableHead>
              <TableHead className="text-black w-[150px]">Name</TableHead>
              <TableHead className="text-black w-[180px]">Email</TableHead>
              <TableHead className="text-black w-[120px]">Phone</TableHead>
              <TableHead className="text-black w-[200px]">Address</TableHead>
              <TableHead className="text-black w-[120px]">Order Pack</TableHead>
              <TableHead className="text-black w-[150px]">Notes</TableHead>
              <TableHead className="text-black w-[80px]">Weight</TableHead>
              <TableHead className="text-black w-[100px]">Ship Method</TableHead>
              <TableHead className="text-black w-[80px]">Paid?</TableHead>
              <TableHead className="text-black w-[100px]">Ok to Ship?</TableHead>
              <TableHead className="text-black w-[150px]">INSTRUCTION</TableHead>
              <TableHead className="text-black w-[120px]">Tracking #</TableHead>
              <TableHead className="text-black w-[120px]">Delivery Status</TableHead>
              <TableHead className="text-black w-[80px]">Label</TableHead>
              <TableHead className="text-black w-[180px]">Created At</TableHead>
              <TableHead className="text-black w-[180px]">Updated At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders && orders.length > 0 ? (
              orders.map((order) => {
                // Only calculate instruction on the client side after mounting
                // Use the stored instruction during server-side rendering
                const calculatedInstruction = isMounted
                  ? calculateOrderInstruction(order)
                  : (order.instruction || 'ACTION REQUIRED');
                
                return (
                  <TableRow key={order.id} className="text-black">
                    <TableCell>
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
                    </TableCell>
                    <TableCell>{order.id}</TableCell>
                    <TableCell className="enhanced-table-cell-truncate">{order.name || 'N/A'}</TableCell>
                    <TableCell className="enhanced-table-cell-truncate">{order.email || 'N/A'}</TableCell>
                    <TableCell>{order.phone || 'N/A'}</TableCell>
                    <TableCell className="address-container">
                      <span className="address-text">
                        {truncateText(formatAddressForTable(order), 25)}
                      </span>
                      <div className="address-tooltip">
                        {formatAddressForTable(order)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <OrderPackDropdown 
                        currentPack={order.order_pack} 
                        orderId={order.id}
                        onUpdate={onRefresh}
                      />
                    </TableCell>
                    <TableCell className="enhanced-table-cell-truncate">{order.order_notes || 'N/A'}</TableCell>
                    <TableCell>{order.weight || '1.000'}</TableCell>
                    <TableCell>
                      <ShippingMethodDropdown
                        currentMethod={order.shipping_method}
                        orderId={order.id}
                        onUpdate={onRefresh}
                      />
                    </TableCell>
                    <TableCell>
                      <PaymentBadge 
                        isPaid={order.paid} 
                        orderId={order.id}
                        onUpdate={onRefresh}
                      />
                    </TableCell>
                    <TableCell>
                      <ShippingToggle 
                        okToShip={order.ok_to_ship} 
                        orderId={order.id}
                        onUpdate={onRefresh}
                      />
                    </TableCell>
                    <TableCell>
                      <div className={`shipping-instruction ${calculatedInstruction?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                        {calculatedInstruction || 'ACTION REQUIRED'}
                      </div>
                    </TableCell>
                    <TableCell className="enhanced-table-cell-truncate">
                      {order.tracking_number || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className={`order-status ${(order.delivery_status || 'empty').toLowerCase().replace(/\s+/g, '-')} px-2 py-1 rounded text-sm`}>
                          {order.delivery_status || 'EMPTY'}
                        </div>
                        {order.tracking_number && (
                          <button
                            onClick={() => updateDeliveryStatus(order.id)}
                            className="text-gray-500 hover:text-black"
                            title="Refresh delivery status"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
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
                          <div className="relative tooltip-container">
                            <span className="text-gray-400 cursor-help">N/A</span>
                            <div className="tooltip">
                              {!order.ok_to_ship ? "Not ready to ship" : 
                               !order.paid ? "Order not paid" : 
                               !order.shipping_address ? "Missing shipping address" : 
                               "Cannot create label"}
                            </div>
                          </div>
                        )
                      )}
                    </TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell>{formatDate(order.updated_at)}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan="16" className="h-24 text-center">
                  {query 
                    ? `No results found for "${query}". Try a different search term.` 
                    : 'No orders available. Create your first order to get started.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 