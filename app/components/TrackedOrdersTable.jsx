"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchTrackedOrders } from '../utils/supabase-client';
import { calculateOrderStatus } from '../utils/order-instructions';
import '../styles/dashboard.css';

export default function TrackedOrdersTable() {
  const [trackedOrders, setTrackedOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTrackedOrders = async () => {
    setLoading(true);
    try {
      const orders = await fetchTrackedOrders(10);
      setTrackedOrders(orders);
    } catch (error) {
      console.error("Error loading tracked orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrackedOrders();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeClass = (status) => {
    if (!status) return 'status-unknown';
    
    status = status.toLowerCase();
    if (status.includes('delivered')) return 'status-delivered';
    if (status.includes('transit') || status.includes('shipped')) return 'status-transit';
    if (status.includes('pending') || status.includes('processing')) return 'status-pending';
    
    return 'status-unknown';
  };

  return (
    <div className="tracked-orders-card">
      <div className="tracked-orders-header">
        <h2 className="tracked-orders-title">Tracked Orders</h2>
        <button 
          className="tracked-orders-refresh" 
          onClick={loadTrackedOrders}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="tracked-orders-loading">Loading tracked orders...</div>
      ) : trackedOrders.length === 0 ? (
        <div className="tracked-orders-empty">No tracked orders found</div>
      ) : (
        <table className="tracked-orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Tracking Link</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trackedOrders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.customer_name || 'N/A'}</td>
                <td>
                  {order.tracking_link ? (
                    <a 
                      href={order.tracking_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Track
                    </a>
                  ) : 'N/A'}
                </td>
                <td>
                  <span className={`tracked-orders-status ${getStatusBadgeClass(order.delivery_status)}`}>
                    {order.delivery_status || 'Unknown'}
                  </span>
                </td>
                <td>{formatDate(order.last_delivery_status_check)}</td>
                <td>
                  <Link href={`/orders/${order.id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 