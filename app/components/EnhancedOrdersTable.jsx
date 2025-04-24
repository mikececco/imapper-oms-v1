"use client"

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { StatusBadge, PaymentStatus, ShippingStatus, OrderPackDropdown, StatusSelector, ImportantFlag } from "./OrderActions";
import ShippingMethodDropdown from "./ShippingMethodDropdown";
import { useOrderDetailModal } from "./OrderDetailModal";
import { calculateOrderInstruction } from "../utils/order-instructions";
import { updateOrderInstruction } from "../utils/supabase-client";
import "./order-status.css";
import { normalizeCountryToCode, getCountryDisplayName } from '../utils/country-utils';
import { useSupabase } from "./Providers";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { formatDate, calculateDaysSince } from '../utils/date-utils';
import { formatAddressForTable } from '../utils/formatters';

// Parse shipping address for display
const parseShippingAddress = (address) => {
  if (!address) return { street: 'N/A', city: 'N/A', postalCode: 'N/A', country: 'N/A' };
  
  const parts = address.split(',').map(part => part.trim());
  
  // Get country code and display name
  let countryRaw = parts[3] || 'NL';
  const countryCode = normalizeCountryToCode(countryRaw);
  const countryDisplay = getCountryDisplayName(countryCode);
  
  return {
    street: parts[0] || 'N/A',
    city: parts[1] || 'N/A',
    postalCode: parts[2] || 'N/A',
    country: countryDisplay,
    countryCode: countryCode
  };
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
  const [hoveredOrderId, setHoveredOrderId] = useState(null);
  const [copiedOrderId, setCopiedOrderId] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const { openModal } = useOrderDetailModal();
  const [isMounted, setIsMounted] = useState(false);
  const [localOrders, setLocalOrders] = useState(orders || []);
  const [filteredOrders, setFilteredOrders] = useState(orders || []);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingDelivered, setIsMarkingDelivered] = useState(false);
  const [updatingInstructionId, setUpdatingInstructionId] = useState(null);
  const [isMarkingNoAction, setIsMarkingNoAction] = useState(false);
  const supabase = useSupabase();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 20;

  // Update localOrders when orders prop changes
  useEffect(() => {
    if (orders) {
      setLocalOrders(orders);
    }
  }, [orders]);

  // Filter orders based on search query
  useEffect(() => {
    // Decode the query parameter
    const decodedQuery = query ? decodeURIComponent(query) : '';

    if (!decodedQuery || decodedQuery.trim() === '') {
      setFilteredOrders(localOrders);
      return;
    }

    const lowercaseQuery = decodedQuery.toLowerCase();
    const filtered = localOrders.filter(order => {
      // Check various fields for the search term
      const emailMatch = order.email && order.email.toLowerCase().includes(lowercaseQuery);
      
      return (
        (order.id && order.id.toString().includes(lowercaseQuery)) ||
        (order.name && order.name.toLowerCase().includes(lowercaseQuery)) ||
        emailMatch || // Use the stored match result
        (order.phone && order.phone.toLowerCase().includes(lowercaseQuery)) ||
        // Check legacy address field
        (order.shipping_address && order.shipping_address.toLowerCase().includes(lowercaseQuery)) ||
        // Check individual address fields
        (order.shipping_address_line1 && order.shipping_address_line1.toLowerCase().includes(lowercaseQuery)) ||
        (order.shipping_address_house_number && order.shipping_address_house_number.toLowerCase().includes(lowercaseQuery)) ||
        (order.shipping_address_line2 && order.shipping_address_line2.toLowerCase().includes(lowercaseQuery)) ||
        (order.shipping_address_city && order.shipping_address_city.toLowerCase().includes(lowercaseQuery)) ||
        (order.shipping_address_postal_code && order.shipping_address_postal_code.toLowerCase().includes(lowercaseQuery)) ||
        (order.shipping_address_country && order.shipping_address_country.toLowerCase().includes(lowercaseQuery)) ||
        (order.order_pack && order.order_pack.toLowerCase().includes(lowercaseQuery)) ||
        (order.order_notes && order.order_notes.toLowerCase().includes(lowercaseQuery)) ||
        (order.status && order.status.toLowerCase().includes(lowercaseQuery)) ||
        (order.tracking_number && order.tracking_number.toLowerCase().includes(lowercaseQuery))
      );
    });
    
    setFilteredOrders(filtered);
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [localOrders, query]);

  // Only run this effect after the component has mounted on the client
  useEffect(() => {
    hasMounted.current = true;
  }, []);

  useEffect(() => {
    // This will only run on the client, after the component has mounted
    setIsMounted(true);
  }, []);

  // Calculate pagination values
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  // Pagination controls
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

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
    
    // Also update filtered orders
    setFilteredOrders(prevOrders => 
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
      // First check if the order has an order pack
      const order = localOrders.find(o => o.id === orderId);
      if (!order.order_pack) {
        toast.error('Order pack is required before creating a shipping label');
        
        return { success: false, error: 'Order pack is required' };
      }
      
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
          
          // Show warning message
          toast.error(`Shipping label created but there was an issue updating the order: ${data.message}`);
        } else {
          // No tracking info available
          toast.error(`Warning: ${data.message}`);
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
        toast.success(`Shipping label created successfully! SendCloud Parcel ID: ${data.shipping_id || 'N/A'}`);
      }
      
      // Refresh orders to show updated tracking info
      if (onRefresh) onRefresh();
      
      return { success: true };
    } catch (error) {
      console.error('Error creating shipping label:', error);
      
      toast.error(`Error: ${error.message}`);
      
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
        toast.success(`Delivery status updated to: ${data.deliveryStatus || 'Unknown'}`);
      }
      
      // Refresh orders to show updated status
      if (onRefresh) onRefresh();
      
      return { success: true };
    } catch (error) {
      console.error('Error updating delivery status:', error);
      toast.error(`Error: ${error.message}`);
      return { success: false, error };
    }
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === localOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(localOrders.map(order => order.id)));
    }
  };

  const handleBulkDelete = async () => {
    setIsConfirmingDelete(true);
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      // Convert Set to Array
      const orderIds = Array.from(selectedOrders);
      
      // Call the API to delete orders
      const response = await fetch('/api/orders/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete orders');
      }
      
      // Optimistic update: remove deleted orders from local state
      const deletedIdsSet = new Set(orderIds);
      setLocalOrders(prev => prev.filter(order => !deletedIdsSet.has(order.id)));
      setFilteredOrders(prev => prev.filter(order => !deletedIdsSet.has(order.id)));
      setSelectedOrders(new Set()); // Clear selection
      setIsConfirmingDelete(false); // Close the dialog
      toast.success(`${orderIds.length} orders deleted successfully`);
      
      // Refresh data if needed or call parent handler
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting orders:', error);
      toast.error(`Error deleting orders: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler for bulk marking as delivered
  const handleBulkMarkAsDelivered = async () => {
    setIsMarkingDelivered(true);
    const orderIds = Array.from(selectedOrders);
    const instruction = "DELIVERED";

    try {
      const promises = orderIds.map(orderId => 
        fetch(`/api/orders/${orderId}/set-instruction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manual_instruction: instruction }),
        })
      );

      const results = await Promise.all(promises);
      const failedUpdates = results.filter(res => !res.ok);

      if (failedUpdates.length > 0) {
        // Try to get error messages if available
        const errorMessages = await Promise.all(failedUpdates.map(async res => {
          try {
            const data = await res.json();
            return data.error || `Order ${res.url.split('/')[5]}: Failed with status ${res.status}`;
          } catch {
            return `Order ${res.url.split('/')[5]}: Failed with status ${res.status}`;
          }
        }));
        throw new Error(`Failed to update some orders: ${errorMessages.join(', ')}`);
      }
      
      // Optimistic update: Update local state
      const updatedIdsSet = new Set(orderIds);
      const updatedOrders = localOrders.map(order => 
        updatedIdsSet.has(order.id) 
          ? { ...order, manual_instruction: instruction, instruction: calculateOrderInstruction({ ...order, manual_instruction: instruction }) } 
          : order
      );
      setLocalOrders(updatedOrders);
      setFilteredOrders(updatedOrders); // Update filtered orders too
      
      setSelectedOrders(new Set()); // Clear selection
      toast.success(`${orderIds.length} orders marked as delivered.`);
      
      // Refresh data if needed or call parent handler
      if (onRefresh) onRefresh();
      
    } catch (error) {
      console.error('Error marking orders as delivered:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsMarkingDelivered(false);
    }
  };

  const copyOrderId = (orderId) => {
    navigator.clipboard.writeText(orderId.toString())
      .then(() => {
        setCopiedOrderId(orderId);
        // Reset copied state after 2 seconds
        setTimeout(() => {
          setCopiedOrderId(null);
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy order ID: ', err);
        toast.error('Failed to copy order ID');
      });
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
      
      // Refresh the orders
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating delivery statuses:', error);
      toast.error('Failed to update delivery statuses');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handler for the new "MARK NO ACTION Required" button
  const handleMarkNoActionRequired = async (orderId) => {
    if (updatingInstructionId) return; // Prevent double clicks

    setUpdatingInstructionId(orderId);
    toast.loading(`Updating instruction for ${orderId}...`, { id: 'instruction-update' });

    try {
      const { success, data, error } = await updateOrderInstruction(orderId, "NO ACTION REQUIRED");

      if (success && data) {
        toast.success(`Instruction updated for ${orderId}`, { id: 'instruction-update' });
        // Use existing handler to update local state/refresh
        handleOrderUpdate({ id: orderId, instruction: data.instruction, updated_at: new Date().toISOString() });
      } else {
        throw error || new Error('Failed to update instruction');
      }
    } catch (error) {
      console.error("Error marking no action required:", error);
      toast.error(`Failed to update instruction: ${error.message}`, { id: 'instruction-update' });
    } finally {
      setUpdatingInstructionId(null);
    }
  };

  // Handler for bulk marking as NO ACTION REQUIRED
  const handleBulkMarkNoActionRequired = async () => {
    setIsMarkingNoAction(true); // Set loading state
    const orderIds = Array.from(selectedOrders);
    const instruction = "NO ACTION REQUIRED";

    try {
      // Use the same API endpoint as 'Mark as Delivered', but set manual_instruction
      const promises = orderIds.map(orderId => { 
        console.log(`Making API call for orderId: ${orderId}`); // Debug log
        return fetch(`/api/orders/${orderId}/set-instruction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manual_instruction: instruction }),
        });
      });

      const results = await Promise.all(promises);
      const failedUpdates = results.filter(res => !res.ok);

      if (failedUpdates.length > 0) {
        // Try to get error messages if available
        const errorMessages = await Promise.all(failedUpdates.map(async res => {
          try {
            const data = await res.json();
            // Extract orderId from URL for better error reporting
            const urlParts = res.url.split('/');
            const failedOrderId = urlParts[urlParts.length - 2]; // Assumes format /api/orders/{id}/set-instruction
            return data.error || `Order ${failedOrderId}: Failed with status ${res.status}`;
          } catch {
            const urlParts = res.url.split('/');
            const failedOrderId = urlParts[urlParts.length - 2];
            return `Order ${failedOrderId}: Failed with status ${res.status}`;
          }
        }));
        throw new Error(`Failed to update some orders: ${errorMessages.join(', ')}`);
      }
      
      // Optimistic update: Update local state
      const updatedIdsSet = new Set(orderIds);
      const updatedOrders = localOrders.map(order => 
        updatedIdsSet.has(order.id) 
          ? { ...order, manual_instruction: instruction, instruction: calculateOrderInstruction({ ...order, manual_instruction: instruction }) } 
          : order
      );
      setLocalOrders(updatedOrders);
      setFilteredOrders(prev => prev.map(order => // Update filtered orders too
        updatedIdsSet.has(order.id) 
          ? { ...order, manual_instruction: instruction, instruction: calculateOrderInstruction({ ...order, manual_instruction: instruction }) } 
          : order
      ));
      
      setSelectedOrders(new Set()); // Clear selection
      toast.success(`${orderIds.length} orders marked as 'No Action Required'.`);
      
      // Refresh data if needed or call parent handler
      if (onRefresh) onRefresh();
      
    } catch (error) {
      console.error('Error marking orders as No Action Required:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsMarkingNoAction(false); // Clear loading state
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        {query && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              Showing {filteredOrders.length} results for search: <strong>"{query}"</strong>
            </p>
          </div>
        )}
        <div className="table-container">
          <div className="table-scroll-wrapper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-black w-[50px] sticky left-0">
                    {/* Checkbox column - no label */}
                  </TableHead>
                  <TableHead className="text-black w-[80px] sticky left-[50px]">
                    Actions
                  </TableHead>
                  <TableHead className="text-black w-[90px] sticky left-[130px]">
                    Important
                  </TableHead>
                  <TableHead className="text-black w-[80px]">Age</TableHead>
                  <TableHead className="text-black w-[100px]">Time To Ship</TableHead>
                  <TableHead className="text-black w-[150px] first-non-sticky-column">
                    INSTRUCTION
                  </TableHead>
                  <TableHead className="text-black w-[60px]">ID</TableHead>
                  <TableHead className="text-black w-[150px]">Name</TableHead>
                  <TableHead className="text-black w-[180px]">Email</TableHead>
                  <TableHead className="text-black w-[120px]">Phone</TableHead>
                  <TableHead className="text-black w-[200px]">Address</TableHead>
                  <TableHead className="text-black w-[400px]">Order Pack</TableHead>
                  <TableHead className="text-black w-[80px]">Quantity</TableHead>
                  <TableHead className="text-black w-[150px]">Notes</TableHead>
                  <TableHead className="text-black w-[80px]">Weight</TableHead>
                  <TableHead className="text-black w-[80px]">Paid?</TableHead>
                  <TableHead className="text-black w-[100px]">OK TO SHIP</TableHead>
                  <TableHead className="text-black w-[180px]">Created At</TableHead>
                  <TableHead className="text-black w-[180px]">Updated At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentOrders && currentOrders.length > 0 ? (
                  currentOrders.map((order) => {
                    // Only calculate instruction on the client side after mounting
                    // Use the stored instruction during server-side rendering
                    const calculatedInstruction = isMounted
                      ? calculateOrderInstruction(order)
                      : (order.instruction || 'ACTION REQUIRED');
                    
                    // When displaying country information
                    const countryCode = normalizeCountryToCode(order.shipping_address?.country);
                    const countryDisplay = getCountryDisplayName(countryCode);
                    
                    // Determine the background color based on instruction
                    const getBgColorClass = (instruction) => {
                      if (instruction === 'NO ACTION REQUIRED') return 'bg-green-200 hover:bg-green-300';
                      if (instruction === 'ACTION REQUIRED') return 'bg-red-100 hover:bg-red-200';
                      if (instruction === 'TO BE SHIPPED BUT NO STICKER') return 'bg-orange-400/20 hover:bg-orange-400/30';
                      if (instruction === 'PASTE BACK TRACKING LINK') return 'bg-orange-600/20 hover:bg-orange-500/30';
                      return '';
                    };
                    
                    const bgColorClass = getBgColorClass(calculatedInstruction);
                    
                    // Calculate days
                    const daysCreated = calculateDaysSince(order.created_at);
                    let daysSinceToShip = null;
                    if (calculatedInstruction === 'TO SHIP') {
                        daysSinceToShip = calculateDaysSince(order.updated_at); 
                    }
                    
                    return (
                      <TableRow 
                        key={order.id} 
                        className={`text-black ${bgColorClass} ${
                          order.important ? 'important-row border-2 border-red-500' : ''
                        }`}
                      >
                        <TableCell className={`sticky left-0 w-[50px] ${
                          calculatedInstruction === 'NO ACTION REQUIRED'
                            ? 'bg-green-200'
                            : calculatedInstruction === 'ACTION REQUIRED'
                              ? 'bg-red-100'
                              : calculatedInstruction === 'TO BE SHIPPED BUT NO STICKER'
                                ? 'bg-orange-400/20'
                                : 'bg-white'
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(order.id)}
                            onChange={() => handleSelectOrder(order.id)}
                            className="rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className={`sticky left-[50px] w-[80px] ${
                          calculatedInstruction === 'NO ACTION REQUIRED'
                            ? 'bg-green-200'
                            : calculatedInstruction === 'ACTION REQUIRED'
                              ? 'bg-red-100'
                              : calculatedInstruction === 'TO BE SHIPPED BUT NO STICKER'
                                ? 'bg-orange-400/20'
                                : 'bg-white'
                        }`}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openOrderDetail(order.id)}
                          >
                            View
                          </Button>
                        </TableCell>
                        <TableCell className={`w-[90px] sticky left-[130px] ${
                          calculatedInstruction === 'NO ACTION REQUIRED'
                            ? 'bg-green-200'
                            : calculatedInstruction === 'ACTION REQUIRED'
                              ? 'bg-red-100'
                              : calculatedInstruction === 'TO BE SHIPPED BUT NO STICKER'
                                ? 'bg-orange-400/20'
                                : 'bg-white'
                        }`}>
                          <ImportantFlag
                            isImportant={order.important}
                            orderId={order.id}
                            onUpdate={handleOrderUpdate}
                          />
                        </TableCell>
                        <TableCell className="w-[80px]">
                          {daysCreated !== null ? `${daysCreated}d` : '-'}
                        </TableCell>
                        <TableCell 
                          className={`w-[100px] ${daysSinceToShip !== null && daysSinceToShip > 2 ? 'text-red-600 font-bold' : ''}`}
                        >
                          {daysSinceToShip !== null ? `${daysSinceToShip}d` : '-'}
                        </TableCell>
                        <TableCell className="enhanced-table-cell-truncate w-[150px] first-non-sticky-column">
                          <span className={`shipping-instruction ${calculatedInstruction?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                            {calculatedInstruction}
                          </span>
                        </TableCell>
                        <TableCell className="w-[60px]">
                          <div 
                            className="cursor-pointer flex items-center"
                            onClick={() => copyOrderId(order.id)}
                            onMouseEnter={() => setHoveredOrderId(order.id)}
                            onMouseLeave={() => setHoveredOrderId(null)}
                            style={{
                              position: 'relative',
                              textDecoration: hoveredOrderId === order.id ? 'underline' : 'none',
                              color: hoveredOrderId === order.id ? '#2563eb' : 'inherit'
                            }}
                          >
                            {order.id}
                            {hoveredOrderId === order.id && (
                              <span style={{
                                position: 'absolute',
                                top: '-20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#333',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                whiteSpace: 'nowrap'
                              }}>
                                Click to copy
                              </span>
                            )}
                            {copiedOrderId === order.id && (
                              <span style={{
                                position: 'absolute',
                                top: '-20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#10b981',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                whiteSpace: 'nowrap'
                              }}>
                                Copied!
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="enhanced-table-cell-truncate w-[150px]">
                          {order.customer_id ? (
                            <Link 
                              href={`/customers/${order.customer_id}`}
                              className="text-blue-600 hover:underline hover:text-blue-800"
                            >
                              {order.name || 'N/A'}
                            </Link>
                          ) : (
                            order.name || 'N/A'
                          )}
                        </TableCell>
                        <TableCell className="enhanced-table-cell-truncate w-[180px]">{order.email || 'N/A'}</TableCell>
                        <TableCell className="w-[120px]">{order.phone || 'N/A'}</TableCell>
                        <TableCell className="address-container w-[200px]">
                          <span className="address-text">
                            {truncateText(formatAddressForTable(order, isMounted), 25)}
                          </span>
                          <div className="address-tooltip">
                            {formatAddressForTable(order, isMounted)}
                          </div>
                        </TableCell>
                        <TableCell className="w-[400px]">
                          <div className="text-sm">
                            {order.order_pack || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="w-[80px]">
                          <div className="text-sm">
                            {order.order_pack_quantity || 1}
                          </div>
                        </TableCell>
                        <TableCell className="enhanced-table-cell-truncate w-[150px]">{order.order_notes || 'N/A'}</TableCell>
                        <TableCell className="w-[80px]">
                          <div className="text-sm">
                            {order.weight || '1.000'} kg
                          </div>
                        </TableCell>
                        <TableCell className="w-[80px]">
                          <PaymentStatus 
                            isPaid={order.paid} 
                          />
                        </TableCell>
                        <TableCell className="w-[100px]">
                          <ShippingStatus 
                            okToShip={order.ok_to_ship} 
                          />
                        </TableCell>
                        <TableCell className="w-[180px]">{formatDate(order.created_at)}</TableCell>
                        <TableCell className="w-[180px]">{formatDate(order.updated_at)}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={20} className="text-center py-8">
                      No orders found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Floating Action Bar */}
        {selectedOrders.size > 0 && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border rounded-lg shadow-lg p-4 flex items-center justify-between gap-4 min-w-[300px] max-w-[90%] z-50">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedOrders.size} {selectedOrders.size === 1 ? 'order' : 'orders'} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedOrders(new Set())}
                className="text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkMarkNoActionRequired}
                variant="default"
                className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white"
                disabled={isMarkingNoAction}
              >
                {isMarkingNoAction ? 'Marking...' : 'Mark No Action Required'}
              </Button>
              <Button
                onClick={handleBulkMarkAsDelivered}
                variant="default"
                className="text-sm bg-green-600 hover:bg-green-700 text-white"
                disabled={isMarkingDelivered}
              >
                {isMarkingDelivered ? 'Marking...' : 'Mark as Delivered'}
              </Button>
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                className="text-sm"
              >
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Are you sure you want to delete {selectedOrders.size} {selectedOrders.size === 1 ? 'order' : 'orders'}?</p>
              <p className="text-sm text-red-600 mt-2">This action cannot be undone.</p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmBulkDelete}
                disabled={isDeleting}
                variant="destructive"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pagination Controls */}
        {filteredOrders.length > ordersPerPage && (
          <div className="pagination-controls">
            <div className="text-sm text-gray-600">
              Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length} orders
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show pages around current page
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 