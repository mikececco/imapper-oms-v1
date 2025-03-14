'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import NewOrderModal from './NewOrderModal';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { toast } from 'react-hot-toast';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleOrderCreated = (newOrder) => {
    // Redirect to the orders page
    window.location.href = '/orders';
  };

  const handleLogout = () => {
    // Remove the authentication cookie
    document.cookie = 'authenticated=false; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    toast.success('Logged out successfully');
    router.push('/auth');
  };

  return (
    <nav className="main-nav">
      <div className="container nav-container">
        <div className="nav-logo">
          <Link href="/dashboard">
            Order Management System
          </Link>
        </div>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="mobile-menu-button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </Button>

        {/* Navigation links - shown/hidden based on mobile menu state */}
        <div className={`nav-links ${isMobileMenuOpen ? 'nav-links-mobile-open' : ''}`}>
          <Link 
            href="/dashboard" 
            className={pathname === '/dashboard' ? 'active' : ''}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link 
            href="/orders" 
            className={pathname.startsWith('/orders') && pathname !== '/orders/new' ? 'active' : ''}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Orders
          </Link>
          <Link 
            href="/customers" 
            className={pathname.startsWith('/customers') ? 'active' : ''}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Customers
          </Link>
          <Link 
            href="/order-packs" 
            className={pathname.startsWith('/order-packs') ? 'active' : ''}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Order Packs
          </Link>
          <Link 
            href="/how-to-use" 
            className={pathname === '/how-to-use' ? 'active' : ''}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            How to Use
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              setIsNewOrderModalOpen(true);
              setIsMobileMenuOpen(false);
            }}
            className={`nav-button ${pathname === '/orders/new' ? 'active' : ''}`}
          >
            New Order
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Logout
          </Button>
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