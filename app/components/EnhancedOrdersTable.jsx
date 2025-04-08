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
import { cn } from "../utils/cn";

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

// Format address for display in table with truncation
const formatAddressForTable = (order, isMounted = false) => {
  if (!order) return 'N/A';
  
  let fullAddress = '';
  let countryDisplay = '';
  
  // Get normalized country display only on client-side
  if (isMounted) {
    if (order.shipping_address_country) {
      const countryCode = normalizeCountryToCode(order.shipping_address_country);
      countryDisplay = getCountryDisplayName(countryCode);
    } else if (order.shipping_address && order.shipping_address.includes(',')) {
      const parts = order.shipping_address.split(',').map(part => part.trim());
      if (parts.length >= 4) {
        const countryCode = normalizeCountryToCode(parts[3]);
        countryDisplay = getCountryDisplayName(countryCode);
      }
    }
  }
  
  // Check if we have individual address components
  if (order.shipping_address_line1 || order.shipping_address_city || order.shipping_address_postal_code) {
    const addressParts = [
      order.shipping_address_line1,
      order.shipping_address_line2,
      order.shipping_address_city,
      order.shipping_address_postal_code,
      isMounted ? (countryDisplay || order.shipping_address_country) : order.shipping_address_country
    ].filter(Boolean);
    
    fullAddress = addressParts.join(', ') || 'N/A';
  }
  // Fallback to legacy shipping_address field if it exists
  else if (order.shipping_address) {
    if (isMounted) {
      const parsedAddress = parseShippingAddress(order.shipping_address);
      fullAddress = `${parsedAddress.street}, ${parsedAddress.city}, ${parsedAddress.postalCode}, ${countryDisplay || parsedAddress.country}`;
    } else {
      fullAddress = order.shipping_address;
    }
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

export default function EnhancedOrdersTable({ orders, loading, onRefresh, onOrderUpdate, columns = [], showBulkActions = true }) {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.id} 
                  className={cn(
                    column.className, // Apply className from config to header
                    "py-2 px-3" // Default padding (can adjust)
                  )}
                >
                  {column.label}
                  </TableHead>
              ))}
                </TableRow>
              </TableHeader>
              <TableBody>
            {currentOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              currentOrders.map((order) => (
                <TableRow key={order.id}>
                  {columns.map((column) => (
                    <TableCell
                      key={`${order.id}-${column.id}`}
                      className={cn(
                        column.className,
                        "py-2 px-3"
                      )}
                    >
                      {column.type === 'link' ? (
                        <Link href={`${column.linkPrefix}${order[column.id]}`}>
                          {order[column.id]}
                        </Link>
                      ) : column.type === 'date' ? (
                        formatDate(order[column.id])
                      ) : column.type === 'custom' && column.render ? (
                        column.render(order)
                      ) : column.type === 'actions' ? (
                        <div className="flex gap-2">
                          {column.actions.map((action, index) => {
                            // Check if the action should be shown based on its condition
                            if (action.condition && !action.condition(order)) {
                              return null;
                            }
                    
                    return (
                              <Button
                                key={`${order.id}-action-${index}`}
                                variant={action.variant || 'default'}
                                className={action.className}
                                onClick={() => action.handler(order.id)}
                                disabled={action.disabled ? action.disabled(order.id) : false}
                          >
                                {action.loading && action.loading(order.id) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                    {action.loadingText || 'Loading...'}
                                  </>
                                ) : (
                                  action.label
                                )}
                              </Button>
                            );
                          })}
                          </div>
                      ) : (
                        order[column.id] || 'N/A'
                      )}
                    </TableCell>
                  ))}
                  </TableRow>
              ))
                )}
              </TableBody>
            </Table>
          </div>
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <Button
              key={pageNumber}
              variant={pageNumber === currentPage ? 'default' : 'outline'}
              onClick={() => handlePageChange(pageNumber)}
            >
              {pageNumber}
              </Button>
          ))}
          </div>
        )}
      </div>
  );
} 