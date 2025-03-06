"use client";

import { useState, useEffect } from 'react';

export default function CountryTabs({ orders, onCountryChange }) {
  const [countries, setCountries] = useState([]);
  const [activeCountry, setActiveCountry] = useState('all');
  const [countryCounts, setCountryCounts] = useState({});
  const [errorCounts, setErrorCounts] = useState({});

  // Extract unique countries and count orders per country
  useEffect(() => {
    if (!orders || orders.length === 0) {
      setCountries([]);
      setCountryCounts({});
      setErrorCounts({});
      return;
    }

    const countryMap = new Map();
    const errorMap = new Map();
    
    // Initialize with "All" count
    countryMap.set('all', orders.length);
    
    // Count errors in all orders
    const allErrors = orders.filter(order => 
      order.instruction === 'ACTION REQUIRED' || 
      !order.tracking_number || 
      order.delivery_status === 'Error'
    ).length;
    
    errorMap.set('all', allErrors);

    // Process each order
    orders.forEach(order => {
      // Extract country from shipping address
      let country = 'Unknown';
      
      if (order.shipping_address_country) {
        country = order.shipping_address_country.trim();
      } else if (order.shipping_address) {
        // Try to extract from combined address
        const parts = order.shipping_address.split(',');
        if (parts.length >= 4) {
          country = parts[3].trim();
        }
      }
      
      // Normalize country name
      if (country) {
        // Convert to uppercase for consistency
        country = country.toUpperCase();
        
        // Handle common country code variations
        if (country === 'USA' || country === 'US' || country === 'UNITED STATES') {
          country = 'USA';
        } else if (country === 'UK' || country === 'UNITED KINGDOM' || country === 'GREAT BRITAIN') {
          country = 'UK';
        } else if (country === 'FRANCE' || country === 'FR') {
          country = 'FRANCE';
        } else if (country === 'GERMANY' || country === 'DE') {
          country = 'GERMANY';
        } else if (country === 'NETHERLANDS' || country === 'NL') {
          country = 'NETHERLANDS';
        }
      }
      
      // Count orders by country
      const currentCount = countryMap.get(country) || 0;
      countryMap.set(country, currentCount + 1);
      
      // Count errors by country
      const isError = order.instruction === 'ACTION REQUIRED' || 
                      !order.tracking_number || 
                      order.delivery_status === 'Error';
      
      if (isError) {
        const currentErrorCount = errorMap.get(country) || 0;
        errorMap.set(country, currentErrorCount + 1);
      }
    });

    // Convert maps to objects
    const countryCountsObj = Object.fromEntries(countryMap);
    const errorCountsObj = Object.fromEntries(errorMap);
    
    // Get unique countries and sort them
    const uniqueCountries = Array.from(countryMap.keys())
      .filter(country => country !== 'all')
      .sort((a, b) => {
        // Sort by error percentage (descending)
        const aErrorRate = (errorCountsObj[a] || 0) / countryCountsObj[a];
        const bErrorRate = (errorCountsObj[b] || 0) / countryCountsObj[b];
        return bErrorRate - aErrorRate;
      });
    
    // Add "All" at the beginning
    uniqueCountries.unshift('all');
    
    setCountries(uniqueCountries);
    setCountryCounts(countryCountsObj);
    setErrorCounts(errorCountsObj);
  }, [orders]);

  const handleTabClick = (country) => {
    setActiveCountry(country);
    onCountryChange(country);
  };

  return (
    <div className="country-tabs">
      <div className="tabs-container">
        {countries.map(country => (
          <button
            key={country}
            className={`tab ${activeCountry === country ? 'active' : ''}`}
            onClick={() => handleTabClick(country)}
          >
            {country === 'all' ? 'All Orders' : country}
            <span className="count">({countryCounts[country] || 0})</span>
            {errorCounts[country] > 0 && (
              <span className="error-badge" title={`${errorCounts[country]} orders with issues`}>
                {errorCounts[country]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
} 