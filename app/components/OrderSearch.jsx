'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function OrderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize search term from URL on component mount
  useEffect(() => {
    const queryFromUrl = searchParams.get('q');
    if (queryFromUrl) {
      try {
        setSearchTerm(decodeURIComponent(queryFromUrl)); // Decode before setting state
      } catch (e) {
        console.error("Failed to decode query param in OrderSearch:", e);
        setSearchTerm(queryFromUrl); // Fallback to raw value on error
      }
    } else {
      setSearchTerm(''); // Clear if no query param
    }
  }, [searchParams]);

  const updateURL = useCallback((term) => {
    // Create new URLSearchParams object
    const params = new URLSearchParams(searchParams);
    
    // Update or remove the 'q' parameter based on searchTerm
    if (term && term.trim()) {
      params.set('q', encodeURIComponent(term.trim()));
    } else {
      params.delete('q');
    }
    
    // Navigate to the same page with updated query parameters
    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(newUrl);
  }, [searchParams, pathname, router]);

  // Debounced effect to update URL after user stops typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateURL(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, updateURL]);

  const handleSearch = (e) => {
    e.preventDefault();
    updateURL(searchTerm);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleClear = () => {
    setSearchTerm('');
    updateURL('');
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder="Search orders by name, email, address, status... (separate multiple terms with commas)"
          className="search-input flex-grow p-2 border border-gray-300 rounded"
          aria-label="Search orders"
        />
        <button 
          type="submit" 
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors duration-200"
          aria-label="Submit search"
        >
          Search
        </button>
        {searchTerm && (
          <button 
            type="button" 
            onClick={handleClear}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors duration-200"
            aria-label="Clear search"
          >
            Clear
          </button>
        )}
      </form>
      <p className="text-sm text-gray-500">
        Search across all fields: name, email, address, order pack, status, etc. Use commas to search for multiple terms at once.
      </p>
    </div>
  );
} 