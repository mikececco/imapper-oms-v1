'use client';

import { useState } from 'react';

export default function OrderFilters({ onFilterChange }) {
  const [instructionFilter, setInstructionFilter] = useState('all');
  const [paidFilter, setPaidFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = () => {
    onFilterChange({
      instruction: instructionFilter,
      paid: paidFilter,
      startDate: startDate || null,
      endDate: endDate || null
    });
  };

  const clearFilters = () => {
    setInstructionFilter('all');
    setPaidFilter('all');
    setStartDate('');
    setEndDate('');
    onFilterChange({
      instruction: 'all',
      paid: 'all',
      startDate: null,
      endDate: null
    });
  };

  return (
    <div className="order-filters">
      <div className="filter-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>Filter Orders</h3>
        <button className="filter-toggle">
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>
      
      <div className={`filter-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="filters-grid">
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
              <option value="to-ship">TO SHIP</option>
              <option value="do-not-ship">DO NOT SHIP</option>
              <option value="shipped">SHIPPED</option>
              <option value="delivered">DELIVERED</option>
              <option value="to-be-shipped-but-no-sticker">TO BE SHIPPED BUT NO STICKER</option>
              <option value="to-be-shipped-but-wrong-tracking-link">TO BE SHIPPED BUT WRONG TRACKING LINK</option>
              <option value="unknown">ACTION REQUIRED</option>
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

          {/* Date Range Filters */}
          <div className="filter-group date-range">
            <label>Date Range</label>
            <div className="date-inputs">
              <input
                type="date"
                id="start-date"
                placeholder="Start"
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                }}
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                id="end-date"
                placeholder="End"
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                }}
              />
            </div>
          </div>
        </div>

        <div className="filter-actions">
          <button
            onClick={clearFilters}
            className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
          >
            Clear
          </button>
          <button
            onClick={handleFilterChange}
            className="px-3 py-1 bg-black text-white rounded hover:opacity-90 text-sm"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
} 