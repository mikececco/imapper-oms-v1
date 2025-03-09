"use client"

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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

export default function EnhancedOrdersTable({ orders, loading, onRefresh, onOrderUpdate }) {
  const router = useRouter();
  // Use useRef to track client-side rendering
  const hasMounted = useRef(false);
  const [hoveredButtonId, setHoveredButtonId] = useState(null);
  const [hoveredDeleteId, setHoveredDeleteId] = useState(null);
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const { openModal } = useOrderDetailModal();
  const [isMounted, setIsMounted] = useState(false);
  const [localOrders, setLocalOrders] = useState([]);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize localOrders with the provided orders
  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

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

  // Handle optimistic updates for order changes
  const handleOrderUpdate = (updatedOrder) => {
    // Update the local orders state with the updated order
    setLocalOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === updatedOrder.id 
          ? { ...order, ...updatedOrder, instruction: calculateOrderInstruction({ ...order, ...updatedOrder }) } 
          : order
      )
    );
    
    // Call the parent's onOrderUpdate if provided
    if (onOrderUpdate) {
      onOrderUpdate(updatedOrder);
    } else {
      // If no parent handler, update the router cache
      router.refresh();
    }
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
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create shipping label');
      }
      
      // Current timestamp for updates
      const currentTimestamp = new Date().toISOString();
      
      // Check if there's a warning but the label was still created
      if (data.warning) {
        console.warn('Warning from shipping label API:', data.message);
        
        // If we have tracking info, update the order locally
        if (data.tracking_number || data.tracking_link || data.label_url) {
          const updatedOrder = {
            id: orderId,
            shipping_id: data.shipping_id || '',
            tracking_number: data.tracking_number || '',
            tracking_link: data.tracking_link || '',
            label_url: data.label_url || '',
            status: 'Ready to send',
            last_delivery_status_check: currentTimestamp,
            updated_at: currentTimestamp
          };
          
          // Update local state
          setLocalOrders(prevOrders => 
            prevOrders.map(order => 
              order.id === orderId 
                ? { ...order, ...updatedOrder } 
                : order
            )
          );
          
          // Show warning to user
          alert(`Shipping label created but there was an issue updating the order: ${data.message}`);
        } else {
          // No tracking info available
          alert(`Warning: ${data.message}`);
        }
      } else {
        // Success case - update local state with the returned data
        const updatedOrder = {
          id: orderId,
          shipping_id: data.shipping_id || '',
          tracking_number: data.tracking_number || '',
          tracking_link: data.tracking_link || '',
          label_url: data.label_url || '',
          status: 'Ready to send',
          last_delivery_status_check: currentTimestamp,
          updated_at: currentTimestamp
        };
        
        // Update local state
        setLocalOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { ...order, ...updatedOrder } 
              : order
          )
        );
        
        // Show success message
        alert('Shipping label created successfully!');
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
      
      const data = await response.json();
      
      // If we have updated order data, update the local state
      if (data.success && data.order) {
        // Update local state with the returned data
        setLocalOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { ...order, ...data.order } 
              : order
          )
        );
        
        // Show success message
        alert(`Delivery status updated to: ${data.deliveryStatus || 'Unknown'}`);
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

  // Function to handle order deletion
  const handleDeleteOrder = async (orderId) => {
    setDeletingOrderId(orderId);
    setShowConfirmation(true);
  };

  // Function to confirm and execute order deletion
  const confirmDeleteOrder = async () => {
    if (!deletingOrderId) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/orders/${deletingOrderId}/delete`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete order');
      }
      
      // Remove the order from local state
      setLocalOrders(prevOrders => prevOrders.filter(order => order.id !== deletingOrderId));
      
      // Call the parent's onRefresh if provided
      if (onRefresh) {
        onRefresh();
      } else {
        // If no parent handler, update the router cache
        router.refresh();
      }
      
      // Reset state
      setShowConfirmation(false);
      setDeletingOrderId(null);
      
      // Show success message
      alert('Order deleted successfully');
    } catch (error) {
      console.error('Error deleting order:', error);
      alert(`Error deleting order: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to cancel order deletion
  const cancelDeleteOrder = () => {
    setShowConfirmation(false);
    setDeletingOrderId(null);
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
      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="mb-6">Are you sure you want to delete this order? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteOrder}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteOrder}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="enhanced-table-scrollable">
        <Table>
          <TableCaption>
            {localOrders.length > 0 
              ? `Showing ${localOrders.length} order${localOrders.length === 1 ? '' : 's'}.` 
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
            {localOrders && localOrders.length > 0 ? (
              localOrders.map((order) => {
                // Only calculate instruction on the client side after mounting
                // Use the stored instruction during server-side rendering
                const calculatedInstruction = isMounted
                  ? calculateOrderInstruction(order)
                  : (order.instruction || 'ACTION REQUIRED');
                
                return (
                  <TableRow key={order.id} className="text-black">
                    <TableCell>
                      <div className="flex space-x-2">
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
                        <button 
                          onClick={() => handleDeleteOrder(order.id)}
                          className="delete-btn"
                          onMouseEnter={() => setHoveredDeleteId(order.id)}
                          onMouseLeave={() => setHoveredDeleteId(null)}
                          style={{
                            backgroundColor: hoveredDeleteId === order.id ? '#e53e3e' : '#f56565',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Delete
                        </button>
                      </div>
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
                        onUpdate={handleOrderUpdate}
                      />
                    </TableCell>
                    <TableCell className="enhanced-table-cell-truncate">{order.order_notes || 'N/A'}</TableCell>
                    <TableCell>{order.weight || '1.000'}</TableCell>
                    <TableCell>
                      <ShippingMethodDropdown
                        currentMethod={order.shipping_method}
                        orderId={order.id}
                        onUpdate={handleOrderUpdate}
                      />
                    </TableCell>
                    <TableCell>
                      <PaymentBadge 
                        isPaid={order.paid} 
                        orderId={order.id}
                        onUpdate={handleOrderUpdate}
                      />
                    </TableCell>
                    <TableCell>
                      <ShippingToggle 
                        okToShip={order.ok_to_ship} 
                        orderId={order.id}
                        onUpdate={handleOrderUpdate}
                      />
                    </TableCell>
                    <TableCell className="enhanced-table-cell-truncate">
                      {calculatedInstruction}
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
                <TableCell colSpan={18} className="text-center py-8">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 