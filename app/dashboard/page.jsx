"use client"

import Link from "next/link";
import { fetchOrders, fetchOrderStats, fetchRecentActivity, supabase } from "../utils/supabase-client";
import DeliveryStats from "../components/DeliveryStats";
import TrackedOrdersTable from "../components/TrackedOrdersTable";
import TestOrderModal from "../components/TestOrderModal";
import { useEffect, useState } from "react";
import "../styles/dashboard.css";

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, shipped: 0, delivered: 0 });
  const [activities, setActivities] = useState([]);
  const [orderPackLists, setOrderPackLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPacks, setLoadingPacks] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLoadingPacks(true);
      try {
        const [ordersData, statsData, activitiesData, packsDataResult] = await Promise.allSettled([
          fetchOrders(),
          fetchOrderStats(),
          fetchRecentActivity(),
          supabase.from('order_pack_lists').select('id, label')
        ]);
        
        setOrders(ordersData.status === 'fulfilled' ? ordersData.value || [] : []);
        setStats(statsData.status === 'fulfilled' ? statsData.value || { total: 0, pending: 0, shipped: 0, delivered: 0 } : { total: 0, pending: 0, shipped: 0, delivered: 0 });
        setActivities(activitiesData.status === 'fulfilled' ? activitiesData.value || [] : []);
        
        if (packsDataResult.status === 'fulfilled') {
          const { data: packsData, error: packsError } = packsDataResult.value;
          if (packsError) {
            console.error("Error fetching order pack lists:", packsError);
            setOrderPackLists([]);
          } else {
            setOrderPackLists(packsData || []);
          }
        } else {
          console.error("Failed to fetch order pack lists promise:", packsDataResult.reason);
          setOrderPackLists([]);
        }

      } catch (error) {
        console.error("Error in dashboard data loading orchestration:", error);
      } finally {
        setLoading(false);
        setLoadingPacks(false);
      }
    }

    loadData();
  }, []);

  // Format date for display - using a simple, consistent approach
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Dashboard</h1>
        <p>Order Management System</p>
      </header>

      <main>
        {loading ? (
          <div className="loading-spinner">Loading dashboard data...</div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Orders</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.pending}</div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.shipped}</div>
                <div className="stat-label">Shipped</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.delivered}</div>
                <div className="stat-label">Delivered</div>
              </div>
            </div>

            {/* Delivery Stats */}
            <DeliveryStats />

            {/* Tracked Orders Table */}
            <TrackedOrdersTable />

            {/* Recent Orders */}
            <div className="card">
              <h2>Recent Orders</h2>
              
              <div className="actions" style={{ marginBottom: '1rem' }}>
                <Link href="/orders/new" className="btn">
                  Create New Order
                </Link>
                <Link href="/orders" className="btn">
                  View All Orders
                </Link>
              </div>

              {orders && orders.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Order Pack</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((order) => (
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>{order.name || 'N/A'}</td>
                        <td>{
                          loadingPacks ? '...' : 
                          orderPackLists.find(pack => pack.id === order.order_pack_list_id)?.label || 'N/A'
                        }</td>
                        <td>
                          <span className={`status-badge status-${order.status || 'pending'}`}>
                            {order.status || 'Pending'}
                          </span>
                        </td>
                        <td>{formatDate(order.created_at)}</td>
                        <td>
                          <Link 
                            href={`/orders/${order.id}`} 
                            className="btn" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <p>No orders found. Create your first order to get started.</p>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="card" style={{ marginTop: '2rem' }}>
              <h2>Recent Activity</h2>
              
              {activities && activities.length > 0 ? (
                <div className="activity-list">
                  {activities.map((activity, index) => (
                    <div className="activity-item" key={index}>
                      <div className="activity-time">{formatDate(activity.time)}</div>
                      <div className="activity-content">{activity.description}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No recent activity.</p>
                </div>
              )}
            </div>

            {/* Test Order Modal */}
            <div className="card" style={{ marginTop: '2rem' }}>
              <h2>Test Order Modal</h2>
              <TestOrderModal />
            </div>
          </>
        )}
      </main>

      <footer>
        <p>Order Management System &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
} 