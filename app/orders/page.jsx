import Link from "next/link";
import { fetchOrders, searchOrders } from "../utils/supabase";
import OrderSearch from "../components/OrderSearch";
import { StatusBadge, PaymentBadge, ShippingToggle, StatusSelector } from "../components/OrderActions";

export default async function Orders({ searchParams }) {
  // Get search query from URL parameters
  const query = searchParams?.q || '';
  
  // Fetch orders with search functionality
  let orders = [];
  try {
    orders = query ? await searchOrders(query) : await fetchOrders();
  } catch (error) {
    console.error("Error fetching orders:", error);
    // Continue with empty orders array
  }

  // Format date for display - using a detailed format matching the image
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(',', '');
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="container">
      <header className="orders-header">
        <h1>Order Management System</h1>
        <h2>ALL ORDERS</h2>
      </header>

      <OrderSearch />

      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Actions</th>
              <th>ID</th>
              <th>Name</th>
              <th>Order Pack</th>
              <th>Paid?</th>
              <th>Ok to Ship?</th>
              <th>Status</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {orders && orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link 
                      href={`/orders/${order.id}`} 
                      className="open-btn"
                    >
                      Open
                    </Link>
                  </td>
                  <td>{order.id}</td>
                  <td>{order.customer_name || 'N/A'}</td>
                  <td>{order.order_pack || 'Sample product'}</td>
                  <td>
                    <PaymentBadge 
                      isPaid={order.is_paid} 
                      orderId={order.id} 
                    />
                  </td>
                  <td>
                    <ShippingToggle 
                      okToShip={order.ok_to_ship} 
                      orderId={order.id} 
                    />
                  </td>
                  <td>
                    <StatusSelector 
                      currentStatus={order.status || 'pending'} 
                      orderId={order.id} 
                    />
                  </td>
                  <td>{formatDate(order.created_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="empty-state">
                  {query ? `No orders found matching "${query}". Try a different search term.` : 
                    'No orders found. Create your first order to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 