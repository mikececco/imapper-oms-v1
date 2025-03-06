'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCustomers } from '../utils/supabase';
import { formatDate } from '../utils/helpers';
import Link from 'next/link';
import { Search } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoading(true);
        const data = await fetchCustomers();
        setCustomers(data || []);
      } catch (error) {
        console.error('Error loading customers:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.address_city?.toLowerCase().includes(searchLower) ||
      customer.address_country?.toLowerCase().includes(searchLower)
    );
  });

  const handleViewCustomer = (customerId) => {
    router.push(`/customers/${customerId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#f5f5f5'}
            style={{
              backgroundColor: '#f5f5f5',
              transition: 'background-color 0.2s'
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider border-b">Name</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider border-b">Email</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider border-b">Phone</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider border-b">Location</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider border-b">Created</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    className="border-b hover:bg-gray-50 transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                  >
                    <td className="py-3 px-4">{customer.name || 'N/A'}</td>
                    <td className="py-3 px-4">{customer.email || 'N/A'}</td>
                    <td className="py-3 px-4">{customer.phone || 'N/A'}</td>
                    <td className="py-3 px-4">
                      {customer.address_city && customer.address_country
                        ? `${customer.address_city}, ${customer.address_country}`
                        : customer.address_city || customer.address_country || 'N/A'}
                    </td>
                    <td className="py-3 px-4">{formatDate(customer.created_at)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewCustomer(customer.id)}
                        className="text-gray-600 hover:text-gray-900 mr-2 transition-colors"
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = ''}
                        style={{ padding: '4px 8px', borderRadius: '4px', transition: 'background-color 0.2s' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-4 px-4 text-center text-gray-500">
                    {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 