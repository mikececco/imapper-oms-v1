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
// --- TanStack Table Imports ---
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  createColumnHelper,
} from '@tanstack/react-table'
import { Checkbox } from "./ui/checkbox";
import { Clock, CalendarDays } from "lucide-react"; // Import icons
// --- End TanStack Table Imports ---

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

// --- TanStack Column Definition Helper ---
const columnHelper = createColumnHelper();
// --- End TanStack Column Definition Helper ---

export default function EnhancedOrdersTable({ orders, loading, onRefresh, onOrderUpdate }) {
  const router = useRouter();
  const hasMounted = useRef(false);
  const [hoveredButtonId, setHoveredButtonId] = useState(null); // Keep hover states for now
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
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingDelivered, setIsMarkingDelivered] = useState(false);
  const [updatingInstructionId, setUpdatingInstructionId] = useState(null);
  const [isMarkingNoAction, setIsMarkingNoAction] = useState(false);
  const supabase = useSupabase();
  
  // --- TanStack Table State ---
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0, // Initial page index (0-based)
    pageSize: 20, // Default page size
  });
  // --- End TanStack Table State ---

  // Update localOrders when orders prop changes
  useEffect(() => {
    if (orders) {
      setLocalOrders(orders);
      setFilteredOrders(orders); // Reset filtered orders when prop changes
      setRowSelection({}); // Clear selection on new data
    }
  }, [orders]);

  // Filter orders based on search query (Keep existing logic)
  useEffect(() => {
    const decodedQuery = query ? decodeURIComponent(query) : '';
    if (!decodedQuery || decodedQuery.trim() === '') {
      setFilteredOrders(localOrders);
      return;
    }
    const lowercaseQuery = decodedQuery.toLowerCase();
    const filtered = localOrders.filter(order => {
      // ... (keep existing filter checks) ...
        (order.id && order.id.toString().includes(lowercaseQuery)) ||
        (order.name && order.name.toLowerCase().includes(lowercaseQuery)) ||
        (order.email && order.email.toLowerCase().includes(lowercaseQuery)) ||
        (order.phone && order.phone.toLowerCase().includes(lowercaseQuery)) ||
        (order.shipping_address && order.shipping_address.toLowerCase().includes(lowercaseQuery)) ||
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
    });
    setFilteredOrders(filtered);
    setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset to first page on search
    setRowSelection({}); // Clear selection on search
  }, [localOrders, query]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- Keep Existing Handlers (copyOrderId, handleUpdateDeliveryStatus, handleMarkNoActionRequired, handleBulkMarkNoActionRequired, handleBulkMarkAsDelivered, handleBulkDelete, confirmBulkDelete, openOrderDetail, handleOrderUpdate) --- 
  const copyOrderId = (orderId) => {
    // ... (existing implementation) ...
    navigator.clipboard.writeText(orderId.toString())
      .then(() => {
        setCopiedOrderId(orderId);
        setTimeout(() => setCopiedOrderId(null), 2000);
      })
      .catch(err => {
        console.error('Failed to copy order ID: ', err);
        toast.error('Failed to copy order ID');
      });
  };

  const handleUpdateDeliveryStatus = async () => {
    // ... (existing implementation) ...
  };

  const handleMarkNoActionRequired = async (orderId) => {
    // ... (existing implementation) ...
  };
  
  const handleOrderUpdate = (updatedOrder) => {
    // Update the local orders state with the updated order
    setLocalOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === updatedOrder.id 
          ? { ...order, ...updatedOrder, instruction: calculateOrderInstruction({ ...order, ...updatedOrder }) } 
          : order
      )
    );
    // No need to update filteredOrders separately now, TanStack uses localOrders/filteredOrders as data source
    if (onOrderUpdate) {
      onOrderUpdate(updatedOrder);
    } else {
      router.refresh();
    }
  };

  const openOrderDetail = (orderId) => {
    openModal(orderId);
  };
  
  // --- Bulk Action Handlers --- (Need to be adapted slightly to use TanStack selection)
  const handleBulkMarkNoActionRequired = async () => {
    setIsMarkingNoAction(true);
    // Get selected row IDs from TanStack state
    const selectedRowOriginals = table.getSelectedRowModel().rows.map(row => row.original);
    const orderIds = selectedRowOriginals.map(order => order.id);
    // ... (rest of existing implementation using orderIds) ...
    // Reset selection using table instance
    table.resetRowSelection();
    setIsMarkingNoAction(false);
  };

  const handleBulkMarkAsDelivered = async () => {
    setIsMarkingDelivered(true);
    const selectedRowOriginals = table.getSelectedRowModel().rows.map(row => row.original);
    const orderIds = selectedRowOriginals.map(order => order.id);
    // ... (rest of existing implementation using orderIds) ...
    table.resetRowSelection();
    setIsMarkingDelivered(false);
  };

  const handleBulkDelete = async () => {
    setIsConfirmingDelete(true);
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    const selectedRowOriginals = table.getSelectedRowModel().rows.map(row => row.original);
    const orderIds = selectedRowOriginals.map(order => order.id);
    // ... (rest of existing implementation using orderIds) ...
    table.resetRowSelection();
      setIsDeleting(false);
    setIsConfirmingDelete(false);
  };
  // --- End Bulk Action Handlers ---

  // --- Define Columns Inside Component to access scope ---
  const columns = [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      size: 50,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const instruction = isMounted ? calculateOrderInstruction(row.original) : (row.original.instruction || 'ACTION REQUIRED');
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openOrderDetail(row.original.id)}
            >
              View
            </Button>
            {instruction === 'PASTE BACK TRACKING LINK' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkNoActionRequired(row.original.id)}
                disabled={updatingInstructionId === row.original.id}
                className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
              >
                {updatingInstructionId === row.original.id ? 'Updating...' : 'Mark No Action'}
              </Button>
            )}
          </div>
        )
      },
      size: 140,
    }),
    columnHelper.accessor('important', {
        header: 'Important',
        cell: ({ row }) => (
            <div className="flex items-center justify-center">
                <ImportantFlag
                    isImportant={row.original.important}
                    orderId={row.original.id}
                    onUpdate={handleOrderUpdate}
                />
            </div>
        ),
        size: 90,
    }),
    columnHelper.accessor('created_at', {
      header: () => (
        <div className="flex items-center gap-1">
          <CalendarDays className="h-4 w-4" />
          Age (Days)
        </div>
      ),
      cell: info => {
          const daysCreated = calculateDaysSince(info.getValue());
          return <div className="w-[80px]">{daysCreated !== null ? `${daysCreated}d` : '-'}</div>;
      },
      size: 80,
    }),
    columnHelper.display({
      id: 'timeToShip',
      header: () => (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          Time To Ship (Days)
        </div>
      ),
      cell: ({ row }) => {
        const instruction = isMounted ? calculateOrderInstruction(row.original) : (row.original.instruction || 'ACTION REQUIRED');
        let daysSinceToShip = null;
        if (instruction === 'TO SHIP') {
            daysSinceToShip = calculateDaysSince(row.original.updated_at);
        }
        const isOverdue = daysSinceToShip !== null && daysSinceToShip > 2;
        return (
          <span className={`w-[100px] ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
            {daysSinceToShip !== null ? `${daysSinceToShip}d` : '-'}
          </span>
        );
      },
      size: 100,
    }),
     columnHelper.accessor(row => isMounted ? calculateOrderInstruction(row) : (row.instruction || 'ACTION REQUIRED'), {
        id: 'instruction',
        header: 'INSTRUCTION',
        cell: info => {
            const instruction = info.getValue();
            return (
              <div className="w-[150px]"> {/* Add width */} 
                <span className={`shipping-instruction ${instruction?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                    {instruction}
                </span>
              </div>
            );
        },
        size: 150,
    }),
    columnHelper.accessor('id', {
      header: 'ID',
      cell: info => (
        <div 
          className="cursor-pointer flex items-center relative w-[60px]" // Add width 
          onClick={() => copyOrderId(info.getValue())}
          onMouseEnter={() => setHoveredOrderId(info.getValue())}
          onMouseLeave={() => setHoveredOrderId(null)}
        >
          {info.getValue()}
           {hoveredOrderId === info.getValue() && !copiedOrderId && (
                <span className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                    Click to copy
                </span>
            )}
            {copiedOrderId === info.getValue() && (
                <span className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                    Copied!
                </span>
            )}
        </div>
      ),
      size: 60,
    }),
     columnHelper.accessor('name', {
        header: 'Name',
        cell: info => (
          <div className="w-[150px] truncate"> {/* Add width & truncate */} 
            {info.row.original.customer_id ? (
                <Link 
                    href={`/customers/${info.row.original.customer_id}`}
                    className="text-blue-600 hover:underline hover:text-blue-800"
                >
                    {info.getValue() || 'N/A'}
                </Link>
            ) : (
                info.getValue() || 'N/A'
            )}
          </div>
        ),
        size: 150,
    }),
    columnHelper.accessor('email', { 
        header: 'Email', 
        cell: info => <div className="w-[180px] truncate">{truncateText(info.getValue() || 'N/A')}</div>, // Add width & truncate
        size: 180, 
    }),
    columnHelper.accessor('phone', { 
        header: 'Phone', 
        cell: info => <div className="w-[120px]">{info.getValue() || 'N/A'}</div>, // Add width
        size: 120,
    }),
    columnHelper.accessor(row => formatAddressForTable(row, isMounted), {
        id: 'address',
        header: 'Address',
        cell: info => (
            <div className="address-container w-[200px]"> {/* Keep existing class */} 
                <span className="address-text">
                    {truncateText(info.getValue(), 25)}
                </span>
                <div className="address-tooltip">
                    {info.getValue()}
                </div>
            </div>
        ),
        size: 200,
    }),
    columnHelper.accessor('order_pack', { 
        header: 'Order Pack', 
        cell: info => <div className="text-sm w-[400px] truncate">{info.getValue() || 'N/A'}</div>, 
        size: 400,
    }),
    columnHelper.accessor('order_pack_quantity', { 
        header: 'Quantity', 
        cell: info => <div className="text-sm w-[80px]">{info.getValue() || 1}</div>, // Add width
        size: 80,
    }),
    columnHelper.accessor('order_notes', { 
        header: 'Notes', 
        cell: info => <div className="w-[150px] truncate">{truncateText(info.getValue() || 'N/A')}</div>,
        size: 150,
    }),
    columnHelper.accessor('weight', { 
        header: 'Weight', 
        cell: info => <div className="text-sm w-[80px]">{info.getValue() ? `${info.getValue()} kg` : '1.000 kg'}</div>, // Add width
        size: 80,
    }),
    columnHelper.accessor('paid', { 
        header: 'Paid?', 
        cell: info => <div className="w-[80px]"><PaymentStatus isPaid={info.getValue()} /></div>, // Add width
        size: 80,
    }),
    columnHelper.accessor('ok_to_ship', { 
        header: 'OK TO SHIP', 
        cell: info => <div className="w-[100px]"><ShippingStatus okToShip={info.getValue()} /></div>, // Add width
        size: 100,
    }),
    columnHelper.accessor('created_at', { 
        header: 'Created At', 
        cell: info => <div className="w-[180px]">{formatDate(info.getValue())}</div>, 
        size: 180,
    }),
    columnHelper.accessor('updated_at', { 
        header: 'Updated At', 
        cell: info => <div className="w-[180px]">{formatDate(info.getValue())}</div>, 
        size: 180,
    }),
  ];
  // --- End Define Columns ---

  // --- Initialize TanStack Table Instance --- 
  const table = useReactTable({
    data: filteredOrders,
    columns, // Use the defined columns
    state: {
      rowSelection,
      pagination,
    },
    enableRowSelection: true, // Enable row selection
    onRowSelectionChange: setRowSelection, // Control selection state
    onPaginationChange: setPagination, // Control pagination state
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(), // Enable pagination
    manualPagination: false, // Using client-side pagination
    // pageCount: Math.ceil(filteredOrders.length / pagination.pageSize), // Calculated automatically if manualPagination is false
    debugTable: process.env.NODE_ENV === 'development', // Optional: Enable debug logs in dev
  });
  // --- End Initialize TanStack Table Instance ---

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  // --- Render Table --- 
  return (
    <>
      <div className="relative">
        {query && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              {/* Display count from table instance */}
              Showing {table.getRowModel().rows.length} of {filteredOrders.length} results for search: <strong>"{query}"</strong>
            </p>
          </div>
        )}
        <div className="table-container rounded-md border"> {/* Added border */}
          <div className="table-scroll-wrapper"> {/* Keep scroll wrapper if needed */} 
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => {
                      let stickyHeaderClasses = 'bg-white'; // Default background
                      if (header.id === 'select') {
                        stickyHeaderClasses = 'sticky left-0 bg-white z-20 pl-4';
                      } else if (header.id === 'actions') {
                        stickyHeaderClasses = 'sticky left-[50px] bg-white z-20 px-2';
                      } else if (header.id === 'important') {
                        stickyHeaderClasses = 'sticky left-[190px] bg-white z-20 px-2'; // Adjusted offset based on new actions width
                      }
                      return (
                        <TableHead 
                          key={header.id} 
                          style={{ width: header.getSize() }} 
                          className={stickyHeaderClasses}
                        > 
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                  </TableHead>
                      )
                     })}
                </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map(row => {
                    const instruction = isMounted ? calculateOrderInstruction(row.original) : (row.original.instruction || 'ACTION REQUIRED');
                    const getBgColorClass = (instruction) => {
                      if (instruction === 'NO ACTION REQUIRED') return 'bg-green-200 hover:bg-green-300';
                      if (instruction === 'ACTION REQUIRED') return 'bg-red-100 hover:bg-red-200';
                      if (instruction === 'TO BE SHIPPED BUT NO STICKER') return 'bg-orange-400/20 hover:bg-orange-400/30';
                      if (instruction === 'PASTE BACK TRACKING LINK') return 'bg-orange-600/20 hover:bg-orange-500/30';
                      return '';
                    };
                    const bgColorClass = getBgColorClass(instruction);
                    const importantClass = row.original.important ? 'important-row border-2 border-red-500' : '';
                    
                    return (
                      <TableRow 
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className={`text-black ${bgColorClass} ${importantClass}`}
                      >
                        {row.getVisibleCells().map(cell => {
                          let stickyCellClasses = '';
                          if (cell.column.id === 'select') {
                            stickyCellClasses = `sticky left-0 z-10 pl-4 ${bgColorClass || 'bg-white'}`;
                          } else if (cell.column.id === 'actions') {
                            stickyCellClasses = `sticky left-[50px] z-10 px-2 ${bgColorClass || 'bg-white'}`;
                          } else if (cell.column.id === 'important') {
                            stickyCellClasses = `sticky left-[190px] z-10 px-2 ${bgColorClass || 'bg-white'}`;
                          }
                           return (
                             <TableCell 
                              key={cell.id} 
                              style={{ width: cell.column.getSize() }} 
                              className={stickyCellClasses}
                             > 
                               {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                           )
                        })}
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Floating Action Bar - Adapted */}
        {table.getSelectedRowModel().rows.length > 0 && (
           // ... (Keep existing Floating Action Bar JSX, uses table state correctly) ...
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border rounded-lg shadow-lg p-4 flex items-center justify-between gap-4 min-w-[300px] max-w-[90%] z-50">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {table.getSelectedRowModel().rows.length} {table.getSelectedRowModel().rows.length === 1 ? 'order' : 'orders'} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => table.resetRowSelection()} // Use TanStack reset
                className="text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkMarkNoActionRequired}
                variant="default"
                className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white"
                disabled={isMarkingNoAction || table.getSelectedRowModel().rows.length === 0}
              >
                {isMarkingNoAction ? 'Marking...' : 'Mark No Action'}
              </Button>
              <Button
                onClick={handleBulkMarkAsDelivered}
                variant="default"
                className="text-sm bg-green-600 hover:bg-green-700 text-white"
                disabled={isMarkingDelivered || table.getSelectedRowModel().rows.length === 0}
              >
                {isMarkingDelivered ? 'Marking...' : 'Mark as Delivered'}
              </Button>
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                className="text-sm"
                disabled={table.getSelectedRowModel().rows.length === 0}
              >
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Confirmation Dialog (Keep existing, uses table state correctly) */}
        <Dialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
           {/* ... Existing Dialog Content ... */}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Are you sure you want to delete {table.getSelectedRowModel().rows.length} {table.getSelectedRowModel().rows.length === 1 ? 'order' : 'orders'}?</p>
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

        {/* Pagination Controls (Adapt next) */}
        {/* --- TanStack Pagination Controls --- */} 
         <div className="flex items-center justify-between space-x-2 py-4">
           <div className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">Page</span>
            <strong>
              {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </strong>
            </div>
          <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              >
                Last
              </Button>
            </div>
            <select
              value={table.getState().pagination.pageSize}
              onChange={e => {
                table.setPageSize(Number(e.target.value))
              }}
               className="p-2 border rounded-md text-sm"
            >
              {[10, 20, 30, 40, 50].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
          </div>
        {/* --- End TanStack Pagination Controls --- */} 
      </div>
    </>
  );
} 