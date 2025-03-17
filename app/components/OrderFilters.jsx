'use client';

import { useState, useEffect } from 'react';

export default function OrderFilters({ onFilterChange }) {
  const [instructionFilter, setInstructionFilter] = useState('all');
  const [paidFilter, setPaidFilter] = useState('all');
  const [importantFilter, setImportantFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Apply filters automatically when any filter changes
  useEffect(() => {
    handleFilterChange();
  }, [instructionFilter, paidFilter, importantFilter, startDate, endDate]);

  const handleFilterChange = () => {
    onFilterChange({
      instruction: instructionFilter,
      paid: paidFilter,
      important: importantFilter,
      startDate: startDate || null,
      endDate: endDate || null
    });
  };

  const clearFilters = () => {
    setInstructionFilter('all');
    setPaidFilter('all');
    setImportantFilter('all');
    setStartDate('');
    setEndDate('');
    // No need to call onFilterChange here as the useEffect will handle it
  };

  return (
    <div className="order-filters">
      <div className="filter-header">
        <h3>Filters</h3>
      </div>
      
      <div className="filter-content">
        <div className="filters-grid">
          {/* Important Filter */}
          <div className="filter-group">
            <label htmlFor="important-filter">
              Important Orders
            </label>
            <select
              id="important-filter"
              className="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
              value={importantFilter}
              onChange={(e) => {
                setImportantFilter(e.target.value);
              }}
            >
              <option value="all">All Orders</option>
              <option value="important">Important Only</option>
              <option value="not-important">Not Important</option>
            </select>
          </div>

          {/* Instruction Filter */}
          <div className="filter-group">
            <label htmlFor="instruction-filter">
              Instruction
            </label>
            <select
              id="instruction-filter"
              className="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
              value={instructionFilter}
              onChange={(e) => {
                setInstructionFilter(e.target.value);
              }}
            >
              <option value="all">All Instructions</option>
              <option value="action-required">ACTION REQUIRED</option>
              <option value="to-ship">TO SHIP</option>
              <option value="to-be-shipped-but-no-sticker">TO BE SHIPPED BUT NO STICKER</option>
              <option value="do-not-ship">DO NOT SHIP</option>
              <option value="shipped">SHIPPED</option>
              <option value="delivered">DELIVERED</option>
              <option value="no-action-required">NO ACTION REQUIRED</option>
            </select>
          </div>

          {/* Paid Status Filter */}
          <div className="filter-group">
            <label htmlFor="paid-filter">
              Payment Status
            </label>
            <select
              id="paid-filter"
              className="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
              value={paidFilter}
              onChange={(e) => {
                setPaidFilter(e.target.value);
              }}
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">PAID</option>
              <option value="unpaid">UNPAID</option>
            </select>
          </div>

          {/* Date Range Filters - Vertical layout */}
          <div className="filter-group date-range">
            <label>Order Date</label>
            <div className="date-inputs-vertical">
              <div className="date-input-group">
                <label htmlFor="start-date" className="text-xs text-gray-600">Start Date</label>
                <input
                  type="date"
                  id="start-date"
                  placeholder="Start"
                  className="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                  }}
                />
              </div>
              <div className="date-input-group">
                <label htmlFor="end-date" className="text-xs text-gray-600">End Date</label>
                <input
                  type="date"
                  id="end-date"
                  placeholder="End"
                  className="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="filter-actions">
          <button
            onClick={clearFilters}
            className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 w-full text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
} 