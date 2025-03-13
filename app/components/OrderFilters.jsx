'use client';

import { useState } from 'react';

export default function OrderFilters({ onFilterChange }) {
  const [instructionFilter, setInstructionFilter] = useState('all');
  const [paidFilter, setPaidFilter] = useState('all');
  const [importantFilter, setImportantFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

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
    onFilterChange({
      instruction: 'all',
      paid: 'all',
      important: 'all',
      startDate: null,
      endDate: null
    });
  };

  return (
    <div className="order-filters">
      <div className="filter-header">
        <h3>Filters</h3>
        <button 
          className="filter-toggle px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>
      
      <div className={`filter-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="filters-grid">
          {/* Important Filter */}
          <div className="filter-group">
            <label htmlFor="important-filter">
              Important Orders
            </label>
            <select
              id="important-filter"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
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
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              value={instructionFilter}
              onChange={(e) => {
                setInstructionFilter(e.target.value);
              }}
            >
              <option value="all">All Instructions</option>
              <option value="unknown">ACTION REQUIRED</option>
              <option value="to-ship">TO SHIP</option>
              <option value="to-be-shipped-but-no-sticker">TO BE SHIPPED BUT NO STICKER</option>
              <option value="do-not-ship">DO NOT SHIP</option>
              <option value="shipped">SHIPPED</option>
              <option value="delivered">DELIVERED</option>
            </select>
          </div>

          {/* Paid Status Filter */}
          <div className="filter-group">
            <label htmlFor="paid-filter">
              Payment Status
            </label>
            <select
              id="paid-filter"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
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
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
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
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
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
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Clear
          </button>
          <button
            onClick={handleFilterChange}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
} 