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
import { StatusBadge, PaymentBadge, ShippingToggle, OrderPackDropdown, StatusSelector, ImportantFlag } from "./OrderActions";
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
  const [localOrders, setLocalOrders] = useState(orders || []);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = useSupabase();

  // Update localOrders when orders prop changes
  useEffect(() => {
    if (orders) {
      setLocalOrders(orders);
    }
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
    if (selectedOrders.size === 0) return;
    setIsConfirmingDelete(true);
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const ordersToDelete = Array.from(selectedOrders);
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', ordersToDelete);

      if (error) throw error;

      setLocalOrders(prev => prev.filter(order => !selectedOrders.has(order.id)));
      setSelectedOrders(new Set());
      toast.success(`Successfully deleted ${ordersToDelete.length} orders`);
    } catch (error) {
      console.error('Error deleting orders:', error);
      toast.error('Failed to delete orders');
    } finally {
      setIsDeleting(false);
      setIsConfirmingDelete(false);
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
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-black w-[40px] sticky left-0 z-20 bg-white">
                </TableHead>
                <TableHead className="text-black w-[60px] sticky left-[40px] z-20 bg-white">
                  Actions
                </TableHead>
                <TableHead className="text-black w-[40px]">
                  Important
                </TableHead>
                <TableHead className="text-black w-[150px]">INSTRUCTION</TableHead>
                <TableHead className="text-black w-[60px]">ID</TableHead>
                <TableHead className="text-black w-[150px]">Name</TableHead>
                <TableHead className="text-black w-[180px]">Email</TableHead>
                <TableHead className="text-black w-[120px]">Phone</TableHead>
                <TableHead className="text-black w-[200px]">Address</TableHead>
                <TableHead className="text-black w-[400px]">Order Pack</TableHead>
                <TableHead className="text-black w-[150px]">Notes</TableHead>
                <TableHead className="text-black w-[80px]">Weight</TableHead>
                <TableHead className="text-black w-[80px]">Paid?</TableHead>
                <TableHead className="text-black w-[100px]">OK TO SHIP</TableHead>
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
                  
                  // When displaying country information
                  const countryCode = normalizeCountryToCode(order.shipping_address?.country);
                  const countryDisplay = getCountryDisplayName(countryCode);
                  
                  return (
                    <TableRow 
                      key={order.id} 
                      className={`text-black ${
                        order.important 
                          ? 'bg-red-100 hover:bg-red-200' 
                          : calculatedInstruction === 'NO ACTION REQUIRED'
                            ? 'bg-green-200 hover:bg-green-300'
                            : calculatedInstruction === 'ACTION REQUIRED'
                              ? 'bg-red-100 hover:bg-red-200'
                              : calculatedInstruction === 'TO BE SHIPPED BUT NO STICKER'
                                ? 'bg-orange-400/20 hover:bg-orange-400/30'
                                : ''
                      }`}
                    >
                      <TableCell className="sticky left-0 z-20 bg-white">
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className="rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="sticky left-[40px] z-20 bg-white">
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
                      <TableCell>
                        <ImportantFlag
                          isImportant={order.important}
                          orderId={order.id}
                          onUpdate={handleOrderUpdate}
                        />
                      </TableCell>
                      <TableCell className="enhanced-table-cell-truncate">
                        <span className={`shipping-instruction ${calculatedInstruction?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                          {calculatedInstruction}
                        </span>
                      </TableCell>
                      <TableCell>{order.id}</TableCell>
                      <TableCell className="enhanced-table-cell-truncate">
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
                      <TableCell className="enhanced-table-cell-truncate">{order.email || 'N/A'}</TableCell>
                      <TableCell>{order.phone || 'N/A'}</TableCell>
                      <TableCell className="address-container">
                        <span className="address-text">
                          {truncateText(formatAddressForTable(order, isMounted), 25)}
                        </span>
                        <div className="address-tooltip">
                          {formatAddressForTable(order, isMounted)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <OrderPackDropdown 
                          order={order}
                          orderId={order.id}
                          onUpdate={handleOrderUpdate}
                        />
                      </TableCell>
                      <TableCell className="enhanced-table-cell-truncate">{order.order_notes || 'N/A'}</TableCell>
                      <TableCell>
                        <span>{order.weight || '1.000'} kg</span>
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
      </div>
    </>
  );
} 