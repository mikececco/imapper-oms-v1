import Link from "next/link";

export default function Orders() {
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
              <tr>
                <td>ORD-001</td>
                <td>John Doe</td>
                <td>Pending</td>
                <td>2023-05-15</td>
                <td>
                  <Link href="/orders/ORD-001" className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>
                    View
                  </Link>
                </td>
              </tr>
              <tr>
                <td>ORD-002</td>
                <td>Jane Smith</td>
                <td>Shipped</td>
                <td>2023-05-14</td>
                <td>
                  <Link href="/orders/ORD-002" className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>
                    View
                  </Link>
                </td>
              </tr>
              <tr>
                <td>ORD-003</td>
                <td>Bob Johnson</td>
                <td>Delivered</td>
                <td>2023-05-10</td>
                <td>
                  <Link href="/orders/ORD-003" className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>
                    View
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>

      <footer>
        <p>Order Management System &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
} 