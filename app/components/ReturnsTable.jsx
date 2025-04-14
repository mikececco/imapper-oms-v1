'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import { formatDate } from '../utils/date-utils'; // Assuming this utility exists
import Link from 'next/link';
import { useMemo } from "react";

export default function ReturnsTable({
  orders,
  loading,
  columns, // Accept columns definition as a prop
  // Add props for specific action handlers needed by columns
  onOpenOrder,
  onTrackReturn,
  onCreateReturnLabel,
  onUpgradeOrder,
  creatingLabelOrderId, // ID of the order currently creating a label
  upgradingOrderId, // ID of the order currently being upgraded
}) {

  // Memoize the columns prop to prevent unnecessary recalculations if needed,
  // though passing it directly might be fine if it's stable.
  const memoizedColumns = useMemo(() => columns, [columns]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return <p className="text-center text-gray-500 py-4">No delivered orders found.</p>;
  }

  // Helper to render cell content based on column definition
  const renderCellContent = (order, column) => {
    const value = order[column.id];

    switch (column.type) {
      case 'date':
        // Add a check for valid date before formatting
        return value ? formatDate(value) : 'N/A';
      case 'link':
        // Ensure order.id exists before creating link
        return order.id ? (
          <Link href={`${column.linkPrefix || ''}${order.id}`} className="text-blue-600 hover:underline">
            {value ?? 'N/A'}
          </Link>
        ) : (value ?? 'N/A');
      case 'actions':
        return (
          <div className="flex flex-wrap gap-1">
            {column.actions?.map((action, index) => {
              // Check condition if it exists
              if (action.condition && !action.condition(order)) {
                return null;
              }

              // Ensure handler exists before rendering button
              if (!action.handler) return null;

              // Check for loading state
              const isLoading = typeof action.loading === 'function' ? action.loading(order.id) : false;
              // Check for disabled state
              const isDisabled = typeof action.disabled === 'function' ? action.disabled(order) : false; // Pass the whole order object if needed by disabled check
              const finalDisabled = isLoading || isDisabled;

              // Determine the label (can be string or function)
              const labelContent = typeof action.label === 'function' ? action.label(order) : action.label;

              return (
                <Button
                  key={`${action.label}-${index}`}
                  variant={action.variant || 'outline'}
                  size={action.size || 'sm'} // Ensure size prop is used
                  onClick={(e) => {
                      e.stopPropagation(); // Prevent row click if needed
                      // Call the handler with the order ID
                      action.handler(order.id); 
                    }}
                  disabled={finalDisabled}
                  className={action.className}
                >
                  {isLoading ? (
                     <><div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></div> {action.loadingText || 'Loading...'}</>
                  ) : (
                    // Render the determined label content
                    labelContent
                  )}
                </Button>
              );
            })}
          </div>
        );
       case 'custom':
         // Ensure render function exists
         return column.render ? column.render(order) : 'N/A';
      default:
        // Ensure value is stringifiable before rendering, handle null/undefined
        const displayValue = (value !== null && value !== undefined) ? String(value) : 'N/A';
        return displayValue;
    }
  };

  return (
    <div className="table-container overflow-x-auto"> {/* Added overflow */}
       <div className="table-scroll-wrapper inline-block min-w-full align-middle">
        <Table className="min-w-full divide-y divide-gray-200"> {/* Added styling */}
          <TableHeader className="bg-gray-50"> {/* Added styling */}
            <TableRow>
              {memoizedColumns.map((column) => (
                <TableHead key={column.id} className={`px-3 py-3.5 text-left text-sm font-semibold text-gray-900 ${column.className || ''}`}> {/* Added styling */}
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-200 bg-white"> {/* Added styling */}
            {orders.map((order) => (
              <TableRow key={order.id} className="hover:bg-gray-50"> {/* Added styling */}
                {memoizedColumns.map((column) => (
                  <TableCell key={`${order.id}-${column.id}`} className={`whitespace-nowrap px-3 py-4 text-sm text-gray-500 ${column.className || ''}`}> {/* Added styling */}
                    {renderCellContent(order, column)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 