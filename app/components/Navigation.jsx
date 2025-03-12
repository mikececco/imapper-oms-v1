'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import OrderPackList from './OrderPackList';
import { Dialog, DialogContent } from './ui/dialog';

export default function Navigation() {
  const pathname = usePathname();
  const [isOrderPackModalOpen, setIsOrderPackModalOpen] = useState(false);

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
            href="/customers" 
            className={pathname.startsWith('/customers') ? 'active' : ''}
          >
            Customers
          </Link>
          <Link 
            href="/orders/new" 
            className={pathname === '/orders/new' ? 'active' : ''}
          >
            New Order
          </Link>
          <button
            onClick={() => setIsOrderPackModalOpen(true)}
            className={`nav-button ${pathname === '/order-packs' ? 'active' : ''}`}
          >
            Order Packs
          </button>
        </div>
      </div>

      <Dialog open={isOrderPackModalOpen} onOpenChange={setIsOrderPackModalOpen}>
        <DialogContent className="max-w-3xl">
          <OrderPackList />
        </DialogContent>
      </Dialog>
    </nav>
  );
} 