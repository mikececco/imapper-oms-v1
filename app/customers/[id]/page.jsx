'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCustomerById, fetchOrdersByCustomerId } from '../../utils/supabase';
import { formatDate, formatCurrency } from '../../utils/helpers';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin, Package } from 'lucide-react';

export default function CustomerDetailPage({ params }) {
  const { id } = params;
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const router = useRouter();

  useEffect(() => {
    async function loadCustomerData() {
      try {
        setLoading(true);
        const customerData = await fetchCustomerById(id);
        if (customerData) {
          setCustomer(customerData);
          const ordersData = await fetchOrdersByCustomerId(id);
          setOrders(ordersData || []);
        }
      } catch (error) {
        console.error('Error loading customer data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadCustomerData();
    }
  }, [id]);

  const handleGoBack = () => {
    router.back();
  };

  const renderCustomerDetails = () => {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{customer.name || 'N/A'}</p>
            </div>
            <div className="mb-4 flex items-start">
              <Mail className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{customer.email || 'N/A'}</p>
              </div>
            </div>
            <div className="mb-4 flex items-start">
              <Phone className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{customer.phone || 'N/A'}</p>
              </div>
            </div>
          </div>
          <div>
            <div className="mb-4 flex items-start">
              <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">
                  {customer.address_line1 ? (
                    <>
                      {customer.address_line1}
                      {customer.address_line2 && <span><br />{customer.address_line2}</span>}
                      <br />
                      {[
                        customer.address_city,
                        customer.address_postal_code,
                        customer.address_country
                      ].filter(Boolean).join(', ')}
                    </>
                  ) : (
                    'No address provided'
                  )}
                </p>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500">Stripe Customer ID</p>
              <p className="font-medium text-sm font-mono">{customer.stripe_customer_id || 'N/A'}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500">Customer Since</p>
              <p className="font-medium">{formatDate(customer.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOrdersTab = () => {
    return (
      <div className="bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold p-6 border-b">Order History</h2>
        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider">Order ID</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider">Total</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="border-b hover:bg-gray-50 transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                  >
                    <td className="py-3 px-4 font-medium">{order.id.substring(0, 8)}...</td>
                    <td className="py-3 px-4">{formatDate(order.created_at)}</td>
                    <td className="py-3 px-4">{formatCurrency(order.total_amount)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status || 'pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link 
                        href={`/orders/${order.id}`}
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = ''}
                        style={{ padding: '4px 8px', borderRadius: '4px', transition: 'background-color 0.2s' }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No orders found for this customer.</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Customer Not Found</h2>
          <p className="mb-4">The customer you are looking for does not exist or has been removed.</p>
          <button
            onClick={handleGoBack}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            onMouseEnter={(e) => e.target.style.backgroundColor = '#333333'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#4b5563'}
            style={{ transition: 'background-color 0.2s' }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={handleGoBack}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
          onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
          onMouseLeave={(e) => e.target.style.backgroundColor = ''}
          style={{ padding: '4px 8px', borderRadius: '4px', transition: 'background-color 0.2s' }}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Customers
        </button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{customer.name || 'Customer Details'}</h1>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onMouseEnter={(e) => {
                if (activeTab !== 'details') {
                  e.target.style.backgroundColor = '#e0e0e0';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'details') {
                  e.target.style.backgroundColor = '';
                }
              }}
              style={{ transition: 'background-color 0.2s' }}
            >
              Customer Details
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onMouseEnter={(e) => {
                if (activeTab !== 'orders') {
                  e.target.style.backgroundColor = '#e0e0e0';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'orders') {
                  e.target.style.backgroundColor = '';
                }
              }}
              style={{ transition: 'background-color 0.2s' }}
            >
              Orders ({orders.length})
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'details' ? renderCustomerDetails() : renderOrdersTab()}
    </div>
  );
} 