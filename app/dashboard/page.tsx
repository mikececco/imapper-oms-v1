import Link from "next/link";

export default function Dashboard() {
  return (
    <div className="container">
      <header>
        <h1>Dashboard</h1>
        <p>Overview of your Order Management System</p>
      </header>

      <main>
        <section className="card">
          <h2>Order Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">24</div>
              <div className="stat-label">Total Orders</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">12</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">8</div>
              <div className="stat-label">Shipped</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">4</div>
              <div className="stat-label">Delivered</div>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>Recent Activity</h2>
          <ul className="activity-list">
            <li className="activity-item">
              <div className="activity-time">2 hours ago</div>
              <div className="activity-content">New order created: ORD-024</div>
            </li>
            <li className="activity-item">
              <div className="activity-time">5 hours ago</div>
              <div className="activity-content">Order ORD-021 marked as shipped</div>
            </li>
            <li className="activity-item">
              <div className="activity-time">Yesterday</div>
              <div className="activity-content">Order ORD-019 marked as delivered</div>
            </li>
            <li className="activity-item">
              <div className="activity-time">Yesterday</div>
              <div className="activity-content">New order created: ORD-023</div>
            </li>
          </ul>
        </section>

        <section className="card">
          <h2>Quick Actions</h2>
          <div className="actions">
            <Link href="/orders" className="btn">
              View All Orders
            </Link>
            <Link href="/orders/new" className="btn">
              Create New Order
            </Link>
          </div>
        </section>
      </main>

      <footer>
        <p>Order Management System &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
} 