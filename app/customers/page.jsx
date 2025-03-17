'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCustomers } from '../utils/supabase';
import { formatDate } from '../utils/helpers';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CustomerDetailsModal from '../components/CustomerDetailsModal';
import EditCustomerModal from '../components/EditCustomerModal';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showStripeImport, setShowStripeImport] = useState(false);
  const [stripeCustomerId, setStripeCustomerId] = useState('');
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {
      setLoading(true);
      const data = await fetchCustomers();
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast?.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }

  const handleFetchStripeCustomer = async () => {
    if (!stripeCustomerId.trim()) {
      toast.error('Please enter a Stripe customer ID');
      return;
    }

    // Basic validation for Stripe customer ID format (starts with 'cus_')
    if (!stripeCustomerId.trim().startsWith('cus_')) {
      toast.error('Invalid Stripe customer ID format. It should start with "cus_"');
      return;
    }

    setLoadingCustomer(true);
    try {
      const response = await fetch(`/api/customers/fetch-stripe?customerId=${stripeCustomerId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customer data');
      }

      // Refresh the customers list
      await loadCustomers();
      
      // Use the isUpdate flag from the API response
      if (data.isUpdate) {
        toast.success('Customer information updated from Stripe!');
      } else {
        toast.success('Customer imported successfully from Stripe!');
      }
      
      setShowStripeImport(false);
      setStripeCustomerId('');
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error(error.message || 'Failed to fetch customer data');
    } finally {
      setLoadingCustomer(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    const searchableFields = [
      customer.name,
      customer.email,
      customer.phone,
      customer.address_line1,
      customer.address_line2,
      customer.address_city,
      customer.address_postal_code,
      customer.address_country,
      customer.stripe_customer_id
    ].filter(Boolean); // Remove null/undefined values

    return searchableFields.some(field => 
      field.toLowerCase().includes(searchLower)
    );
  });

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsDetailsModalOpen(true);
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleCustomerUpdate = (updatedCustomer) => {
    // Update the customer in the list
    setCustomers(prevCustomers => 
      prevCustomers.map(customer => 
        customer.id === updatedCustomer.id ? updatedCustomer : customer
      )
    );
    
    // Update the selected customer if it's the one being viewed
    if (selectedCustomer && selectedCustomer.id === updatedCustomer.id) {
      setSelectedCustomer(updatedCustomer);
    }
    
    // Refresh the customers list to ensure we have the latest data
    loadCustomers();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="flex items-center gap-4">
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
              style={{
                backgroundColor: '#f5f5f5',
                transition: 'background-color 0.2s'
              }}
            />
          </div>
          <button
            onClick={() => setShowStripeImport(!showStripeImport)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add from Stripe
          </button>
        </div>
      </div>

      {showStripeImport && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-lg font-medium mb-3">Import Customer from Stripe</h2>
          <p className="text-sm text-gray-600 mb-3">
            Enter a Stripe customer ID (starts with "cus_") to import customer data. 
            You can find this in your Stripe Dashboard under Customers.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200"
                placeholder="e.g., cus_1234abcd"
                value={stripeCustomerId}
                onChange={(e) => setStripeCustomerId(e.target.value)}
              />
              <div className="absolute right-3 top-2 text-xs text-gray-400 cursor-help" title="Stripe customer IDs start with 'cus_' followed by alphanumeric characters">
                ?
              </div>
            </div>
            <button
              onClick={handleFetchStripeCustomer}
              disabled={loadingCustomer}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400"
            >
              {loadingCustomer ? 'Importing...' : 'Import Customer'}
            </button>
            <button
              onClick={() => {
                setShowStripeImport(false);
                setStripeCustomerId('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider border-b">Actions</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider border-b">Name</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider border-b">Email</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider border-b">Phone</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider border-b">Location</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider border-b">Created</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider border-b">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewCustomer(customer)}
                          className="text-gray-600 hover:text-gray-900 transition-colors px-3 py-1 rounded hover:bg-gray-100"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="bg-blue-600 text-white hover:bg-blue-700 transition-colors px-3 py-1 rounded"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">{customer.name || 'N/A'}</td>
                    <td className="py-3 px-4">{customer.email || 'N/A'}</td>
                    <td className="py-3 px-4">{customer.phone || 'N/A'}</td>
                    <td className="py-3 px-4">
                      {customer.address_city && customer.address_country
                        ? `${customer.address_city}, ${customer.address_country}`
                        : customer.address_city || customer.address_country || 'N/A'}
                    </td>
                    <td className="py-3 px-4">{formatDate(customer.created_at)}</td>
                    <td className="py-3 px-4">{formatDate(customer.updated_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-4 px-4 text-center text-gray-500">
                    {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Details Modal */}
      <CustomerDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        customer={selectedCustomer}
        onUpdate={handleCustomerUpdate}
      />

      {/* Edit Customer Modal */}
      {isEditModalOpen && selectedCustomer && (
        <EditCustomerModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          customer={selectedCustomer}
          onUpdate={handleCustomerUpdate}
        />
      )}
    </div>
  );
} 