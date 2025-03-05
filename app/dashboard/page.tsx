import Link from "next/link";
import { fetchOrderStats, fetchRecentActivity } from "../utils/supabase";
import { formatDistanceToNow } from "date-fns";

export default async function Dashboard() {
  // Fetch real data from Supabase
  const stats = await fetchOrderStats();
  const activities = await fetchRecentActivity();

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
        </section>

        <section className="card">
          <h2>Recent Activity</h2>
          {activities.length > 0 ? (
            <ul className="activity-list">
              {activities.map((activity) => (
                <li key={activity.id} className="activity-item">
                  <div className="activity-time">
                    {formatDistanceToNow(activity.time, { addSuffix: true })}
                  </div>
                  <div className="activity-content">{activity.activity}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No recent activity found.</p>
          )}
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