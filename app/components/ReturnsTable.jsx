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
import { RefreshCw } from 'lucide-react'; // Import RefreshCw

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
  // Pass specific loading states needed by actions if not covered by general props
  loadingStatuses,
  loadingUpgradeStatuses,
  fetchingReturnStatusId,
}) {

  // Memoize the columns prop to prevent unnecessary recalculations if needed,
  // though passing it directly might be fine if it's stable.
  const memoizedColumns = useMemo(() => columns, [columns]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    // Adjusted message for context
    return <p className="text-center text-gray-500 py-4">No orders match the current criteria.</p>;
  }

  // Helper to render cell content based on column definition
  const renderCellContent = (order, column) => {
    const value = order[column.id];

    switch (column.type) {
      case 'date':
        return value ? formatDate(value) : <span className="text-gray-400">N/A</span>;
      case 'link':
        return order.id ? (
          <Link href={`${column.linkPrefix || ''}${order.id}`} className="text-blue-600 hover:underline hover:text-blue-800 transition-colors duration-150">
            {value ?? <span className="text-gray-400">N/A</span>}
          </Link>
        ) : (value ?? <span className="text-gray-400">N/A</span>);
      case 'actions':
        return (
          // Use flex container for consistent spacing
          <div className="flex items-center space-x-1"> 
            {column.actions?.map((action, index) => {
              if (action.condition && !action.condition(order)) {
                return null;
              }
              if (!action.handler) return null;

              // More flexible loading state determination
              const isLoading = action.loading ? action.loading(order.id, order) : false; 
              const isDisabled = action.disabled ? action.disabled(order.id, order) : false;
              const finalDisabled = isLoading || isDisabled;
              const labelContent = typeof action.label === 'function' ? action.label(order) : action.label;
              const loadingIndicator = action.renderLoading ? action.renderLoading() : <RefreshCw className="h-4 w-4 animate-spin mr-1" />;
              const buttonLabel = action.renderLabel ? action.renderLabel() : labelContent;


              return (
                <Button
                  key={`${action.label}-${index}-${order.id}`}
                  variant={action.variant || 'outline'}
                  size={action.size || 'sm'}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Pass the full order if handler expects it, otherwise just id
                    action.handler(order.id, order); 
                  }}
                  disabled={finalDisabled}
                   // Combine base classes with action-specific classes
                  className={` ${action.className || ''}`}
                >
                  {isLoading ? loadingIndicator : buttonLabel}
                </Button>
              );
            })}
          </div>
        );
       case 'custom':
         return column.render ? column.render(order) : <span className="text-gray-400">N/A</span>;
      default:
        const displayValue = (value !== null && value !== undefined) ? String(value) : <span className="text-gray-400">N/A</span>;
        // Add explicit whitespace control for default cells
        return <span className="block truncate">{displayValue}</span>; 
    }
  };

  // Estimate a reasonable min-width based on typical columns or pass dynamically if needed
  const estimatedMinWidth = `${memoizedColumns.length * 150}px`; // Example estimation

  return (
    // Outer container allows scrolling
    <div className="w-full overflow-x-auto border border-gray-200 rounded-lg"> 
      {/* Inner container ensures table tries to expand */}
      <div className="align-middle inline-block min-w-full"> 
        <Table style={{ minWidth: estimatedMinWidth }}> 
          <TableHeader className="bg-gray-50 sticky top-0 z-10"> {/* Make header sticky */}
            <TableRow>
              {memoizedColumns.map((column) => (
                <TableHead 
                  key={column.id} 
                  // Apply base styles + column specific styles
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${column.className || ''}`}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          {/* Removed divide-y from TableBody, applying border to rows/cells instead */}
          <TableBody className="bg-white"> 
            {orders.map((order, rowIndex) => (
              // Apply border-b to each row for separation
              <TableRow key={order.id} className="hover:bg-gray-50 border-b border-gray-200 last:border-b-0"> 
                {memoizedColumns.map((column) => (
                  <TableCell 
                    key={`${order.id}-${column.id}`} 
                    // Consistent padding, vertical alignment, and column specifics
                    className={`px-4 py-3 text-sm text-gray-700 align-top ${column.className || ''}`}
                  >
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