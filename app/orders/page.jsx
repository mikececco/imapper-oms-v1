import Link from "next/link";
import { fetchOrders } from "../utils/supabase";

export default async function Orders() {
  // Fetch orders with error handling
  let orders = [];
  try {
    orders = await fetchOrders();
  } catch (error) {
    console.error("Error fetching orders:", error);
    // Continue with empty orders array
  }

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
        <h1>Orders</h1>
        <p>View and manage your orders</p>
      </header>

      <main>
        <div className="card">
          <div className="actions" style={{ marginBottom: '1rem' }}>
            <Link href="/dashboard" className="btn">
              Back to Dashboard
            </Link>
            <Link href="/orders/new" className="btn">
              Create New Order
            </Link>
          </div>

          {orders && orders.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.name || 'N/A'}</td>
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
      </main>

      <footer>
        <p>Order Management System &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
} 