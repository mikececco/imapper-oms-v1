"use client"

import { useState } from "react";
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
import { StatusBadge, PaymentBadge, ShippingToggle, StatusSelector, OrderPackDropdown } from "./OrderActions";
import { useOrderDetailModal } from "./OrderDetailModal";

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

// Format address for display in table
const formatAddressForTable = (address) => {
  if (!address) return 'N/A';
  
  const parsedAddress = parseShippingAddress(address);
  return `${parsedAddress.street}, ${parsedAddress.city}, ${parsedAddress.postalCode}, ${parsedAddress.country}`;
};

export default function EnhancedOrdersTable({ orders, loading, onRefresh }) {
  const [hoveredButtonId, setHoveredButtonId] = useState(null);
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const { openModal } = useOrderDetailModal();

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
              <TableHead className="text-black w-[80px]">Paid?</TableHead>
              <TableHead className="text-black w-[100px]">Ok to Ship?</TableHead>
              <TableHead className="text-black w-[100px]">Status</TableHead>
              <TableHead className="text-black w-[150px]">INSTRUCTION</TableHead>
              <TableHead className="text-black w-[120px]">Tracking #</TableHead>
              <TableHead className="text-black w-[80px]">Label</TableHead>
              <TableHead className="text-black w-[180px]">Created At</TableHead>
              <TableHead className="text-black w-[180px]">Updated At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders && orders.length > 0 ? (
              orders.map((order) => (
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
                  <TableCell className="enhanced-table-cell-wrap">{formatAddressForTable(order.shipping_address)}</TableCell>
                  <TableCell>
                    <OrderPackDropdown 
                      currentPack={order.order_pack} 
                      orderId={order.id}
                      onUpdate={onRefresh}
                    />
                  </TableCell>
                  <TableCell className="enhanced-table-cell-truncate">{order.order_notes || 'N/A'}</TableCell>
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
                    <StatusSelector 
                      currentStatus={order.status || 'pending'} 
                      orderId={order.id}
                      onUpdate={onRefresh}
                    />
                  </TableCell>
                  <TableCell>
                    <div className={`shipping-instruction ${order.shipping_instruction?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                      {order.shipping_instruction || 'ACTION REQUIRED'}
                    </div>
                  </TableCell>
                  <TableCell className="enhanced-table-cell-truncate">
                    {order.tracking_number || 'N/A'}
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
              ))
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