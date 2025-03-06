'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <div className="nav-logo">
          <Link href="/dashboard">
            Order Management System
          </Link>
        </div>
        <div className="nav-links">
          <Link 
            href="/dashboard" 
            className={pathname === '/dashboard' ? 'active' : ''}
          >
            Dashboard
          </Link>
          <Link 
            href="/orders" 
            className={pathname.startsWith('/orders') && pathname !== '/orders/new' ? 'active' : ''}
          >
            Orders
          </Link>
          <Link 
            href="/orders/new" 
            className={pathname === '/orders/new' ? 'active' : ''}
          >
            New Order
          </Link>
        </div>
      </div>
    </nav>
  );
} 