'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function OrderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [isHovered, setIsHovered] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    
    // Create new URLSearchParams object
    const params = new URLSearchParams(searchParams);
    
    // Update or remove the 'q' parameter based on searchQuery
    if (searchQuery) {
      params.set('q', searchQuery);
    } else {
      params.delete('q');
    }
    
    // Navigate to the same page with updated query parameters
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          className="search-input"
          placeholder="Search orders by ID or customer name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            backgroundColor: isHovered ? '#e0e0e0' : '#f5f5f5',
            color: '#000000',
            border: '1px solid #000000',
            padding: '0.5rem',
            borderRadius: '4px',
            width: '100%',
            maxWidth: '500px',
            transition: 'all 0.2s ease'
          }}
        />
      </form>
    </div>
  );
} 