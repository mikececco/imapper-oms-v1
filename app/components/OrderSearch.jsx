'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function OrderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize search term from URL on component mount
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchTerm(query);
    }
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    
    // Create new URLSearchParams object
    const params = new URLSearchParams(searchParams);
    
    // Update or remove the 'q' parameter based on searchTerm
    if (searchTerm && searchTerm.trim()) {
      params.set('q', encodeURIComponent(searchTerm.trim()));
    } else {
      params.delete('q');
    }
    
    // Navigate to the same page with updated query parameters
    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    console.log(`Navigating to: ${newUrl}`);
    router.replace(newUrl);
  };

  const handleClear = () => {
    setSearchTerm('');
    
    // Create new URLSearchParams object
    const params = new URLSearchParams(searchParams);
    
    // Remove the 'q' parameter
    params.delete('q');
    
    // Navigate to the same page without the query parameter
    router.replace(pathname);
  };

  return (
    <div className="search-container mb-6">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search orders by name, email, address, status..."
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
      <p className="text-sm text-gray-500 mt-1">
        Search across all fields: name, email, address, order pack, status, etc.
      </p>
    </div>
  );
} 