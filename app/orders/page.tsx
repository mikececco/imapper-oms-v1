import Link from "next/link";
import { fetchOrders } from "../utils/supabase";

export default async function Orders() {
  // Fetch real orders from Supabase
  const orders = await fetchOrders();

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
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
            <Link href="/" className="btn">
              Back to Dashboard
            </Link>
            <Link href="/orders/new" className="btn">
              Create New Order
            </Link>
          </div>

          {orders.length > 0 ? (
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
                      <span className={`status-badge status-${order.status}`}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td>{order.created_at ? formatDate(order.created_at) : 'N/A'}</td>
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