'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCustomers } from '../utils/supabase';
import { formatDate } from '../utils/helpers';
import Link from 'next/link';
import { Search, Plus, RefreshCw } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('stripe');
  const [isBulkFetching, setIsBulkFetching] = useState(false);
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

  const handleFetchHubSpotOwner = async (customerId) => {
    try {
      const response = await fetch(`/api/customers/fetch-hubspot-owner?customerId=${customerId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch HubSpot owner');
      }

      // Refresh the customers list
      await loadCustomers();
      toast.success('HubSpot owner updated successfully!');
    } catch (error) {
      console.error('Error fetching HubSpot owner:', error);
      toast.error(error.message || 'Failed to fetch HubSpot owner');
    }
  };

  const handleBulkFetchHubSpotOwners = async () => {
    const customersToUpdate = activeTab === 'stripe' ? stripeCustomers : sendcloudCustomers;
    
    if (customersToUpdate.length === 0) {
      toast.error('No customers to update');
      return;
    }

    setIsBulkFetching(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const customer of customersToUpdate) {
        try {
          const response = await fetch(`/api/customers/fetch-hubspot-owner?customerId=${customer.id}`);
          const data = await response.json();

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Failed to fetch HubSpot owner for customer ${customer.id}:`, data.error);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error processing customer ${customer.id}:`, error);
        }
      }

      // Refresh the customers list
      await loadCustomers();

      if (errorCount === 0) {
        toast.success(`Successfully updated HubSpot owners for ${successCount} customers`);
      } else {
        toast.error(`Updated ${successCount} customers, ${errorCount} failed`);
      }
    } catch (error) {
      console.error('Error in bulk fetch:', error);
      toast.error('Failed to complete bulk update');
    } finally {
      setIsBulkFetching(false);
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

  const stripeCustomers = filteredCustomers.filter(customer => customer.stripe_customer_id);
  const sendcloudCustomers = filteredCustomers.filter(customer => !customer.stripe_customer_id);

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
          <div className="flex items-center gap-2">
            {activeTab === 'stripe' && (
              <button
                onClick={() => setShowStripeImport(!showStripeImport)}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add from Stripe
              </button>
            )}
            <button
              onClick={handleBulkFetchHubSpotOwners}
              disabled={isBulkFetching}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              <RefreshCw className={`h-4 w-4 ${isBulkFetching ? 'animate-spin' : ''}`} />
              {isBulkFetching ? 'Fetching...' : 'Fetch HubSpot Owners'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('stripe')}
            className={`${
              activeTab === 'stripe'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Stripe Customers ({stripeCustomers.length})
          </button>
          <button
            onClick={() => setActiveTab('sendcloud')}
            className={`${
              activeTab === 'sendcloud'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            SendCloud Customers ({sendcloudCustomers.length})
          </button>
        </nav>
      </div>

      {showStripeImport && activeTab === 'stripe' && (
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

      {/* Customer List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HubSpot Owner</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-2 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                    </div>
                  </td>
                </tr>
              ) : (activeTab === 'stripe' ? stripeCustomers : sendcloudCustomers).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-2 text-center text-gray-500">
                    No {activeTab === 'stripe' ? 'Stripe' : 'SendCloud'} customers found
                  </td>
                </tr>
              ) : (
                (activeTab === 'stripe' ? stripeCustomers : sendcloudCustomers).map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewCustomer(customer)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{customer.email}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{customer.phone}</div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {[
                          customer.address_line1,
                          customer.address_line2,
                          customer.address_city,
                          customer.address_postal_code,
                          customer.address_country
                        ].filter(Boolean).join(', ')}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <div className="text-sm text-gray-500">
                          {customer.hubspot_owner || 'Not assigned'}
                        </div>
                        <button
                          onClick={() => handleFetchHubSpotOwner(customer.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Fetch HubSpot owner"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDate(customer.created_at)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          isOpen={isDetailsModalOpen}
          onClose={handleCloseDetailsModal}
          onUpdate={handleCustomerUpdate}
        />
      )}

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