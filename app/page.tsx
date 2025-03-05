import Link from "next/link";

export default function Home() {
  return (
    <div className="container">
      <header>
        <h1>Order Management System</h1>
        <p>Welcome to your Supabase-powered Order Management System</p>
      </header>

      <main>
        <section className="card">
          <h2>Quick Actions</h2>
          <div className="actions">
            <Link href="/orders" className="btn">
              View Orders
            </Link>
            <Link href="/orders/new" className="btn">
              Create New Order
            </Link>
            <Link href="/dashboard" className="btn">
              Dashboard
            </Link>
          </div>
        </section>

        <section className="card">
          <h2>System Status</h2>
          <div className="status">
            <div className="status-item">
              <span className="status-label">Database:</span>
              <span className="status-value">Connected</span>
            </div>
            <div className="status-item">
              <span className="status-label">API:</span>
              <span className="status-value">Online</span>
            </div>
            <div className="status-item">
              <span className="status-label">Environment:</span>
              <span className="status-value">Production</span>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <p>Order Management System &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
