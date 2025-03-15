"use client";

import { useState, useEffect } from 'react';
import { normalizeCountryToCode, getCountryDisplayName, COUNTRY_MAPPING } from '../utils/country-utils';

export default function CountryTabs({ orders, activeTab, setActiveTab }) {
  const [isMounted, setIsMounted] = useState(false);

  // Set isMounted to true after component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Count orders by country
  const ordersByCountry = orders.reduce((acc, order) => {
    let country = 'Unknown';
    
    // Try to get country from different possible fields
    if (order.shipping_address_country) {
      country = order.shipping_address_country;
    } else if (order.shipping_address?.country) {
      country = order.shipping_address.country;
    } else if (typeof order.shipping_address === 'string' && order.shipping_address.includes(',')) {
      const parts = order.shipping_address.split(',');
      if (parts.length >= 4) {
        country = parts[3].trim();
      }
    }
    
    // Normalize the country code if client-side
    const countryCode = isMounted ? normalizeCountryToCode(country) : country;
    
    if (!acc[countryCode]) {
      acc[countryCode] = 0;
    }
    acc[countryCode]++;
    return acc;
  }, { all: orders.length });

  // Make sure we always have an "all" tab
  if (!ordersByCountry.all) {
    ordersByCountry.all = orders.length;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {Object.entries(ordersByCountry).map(([country, count]) => (
        <button
          key={country}
          onClick={() => setActiveTab(country)}
          className={`px-3 py-1 rounded-md text-sm font-medium ${
            activeTab === country
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          {isMounted ? getCountryDisplayName(country) : (country === 'all' ? 'All' : country)} ({count})
        </button>
      ))}
    </div>
  );
} 