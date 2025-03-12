'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import NewOrderModal from './NewOrderModal';
import { Dialog, DialogContent } from './ui/dialog';

export default function Navigation() {
  const pathname = usePathname();
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

  const handleOrderCreated = (newOrder) => {
    // You can handle the newly created order here
    // For example, redirect to the order details page
    window.location.href = `/orders/${newOrder.id}`;
  };

  return (
    <nav className="main-nav">
      <div className="container nav-container">
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
            href="/customers" 
            className={pathname.startsWith('/customers') ? 'active' : ''}
          >
            Customers
          </Link>
          <Link 
            href="/order-packs" 
            className={pathname.startsWith('/order-packs') ? 'active' : ''}
          >
            Order Packs
          </Link>
          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className={`nav-button ${pathname === '/orders/new' ? 'active' : ''}`}
          >
            New Order
          </button>
        </div>
      </div>

      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onOrderCreated={handleOrderCreated}
      />
    </nav>
  );
} 