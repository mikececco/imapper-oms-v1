'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import NewOrderModal from './NewOrderModal';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { toast } from 'react-hot-toast';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Handle window resize to detect mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    
    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile sidebar when navigating
  useEffect(() => {
    if (isMobileView) {
      setIsMobileSidebarOpen(false);
    }
  }, [pathname, isMobileView]);

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

  const handleUpdateDeliveryStatus = async () => {
    try {
      setIsUpdatingStatus(true);
      const response = await fetch('/api/scheduled-tasks?task=delivery-status', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to update delivery statuses');
      }
      
      const data = await response.json();
      toast.success('Delivery statuses updated successfully');
      
      // Refresh the page
      router.refresh();
    } catch (error) {
      console.error('Error updating delivery statuses:', error);
      toast.error('Failed to update delivery statuses');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <>
      {/* Mobile menu toggle button - only visible on mobile */}
      {isMobileView && (
        <Button
          variant="outline"
          size="icon"
          className="sidebar-mobile-toggle"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          aria-label="Toggle mobile menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isMobileSidebarOpen ? (
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
      )}

      <aside className={`sidebar ${isSidebarCollapsed && !isMobileView ? 'sidebar-collapsed' : ''} ${isMobileView ? 'sidebar-mobile' : ''} ${isMobileSidebarOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-header">
          <Link href="/dashboard" className="sidebar-logo">
            {isSidebarCollapsed && !isMobileView ? 'OMS' : 'Order Management System'}
          </Link>
          {!isMobileView && (
            <Button
              variant="ghost"
              size="icon"
              className="sidebar-toggle"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              aria-label="Toggle sidebar"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                {isSidebarCollapsed ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                )}
              </svg>
            </Button>
          )}
          {isMobileView && (
            <Button
              variant="ghost"
              size="icon"
              className="sidebar-close"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          )}
        </div>

        <nav className="sidebar-nav">
          <Link 
            href="/dashboard" 
            className={`sidebar-link ${pathname === '/dashboard' ? 'active' : ''}`}
            title="Dashboard"
          >
            <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {(!isSidebarCollapsed || isMobileView) && <span>Dashboard</span>}
          </Link>
          <Link 
            href="/orders" 
            className={`sidebar-link ${pathname.startsWith('/orders') && pathname !== '/orders/new' ? 'active' : ''}`}
            title="Orders"
          >
            <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            {(!isSidebarCollapsed || isMobileView) && <span>Orders</span>}
          </Link>
          <Link 
            href="/returns" 
            className={`sidebar-link ${pathname.startsWith('/returns') ? 'active' : ''}`}
            title="Returns (NOT LIVE)"
          >
            <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
            {(!isSidebarCollapsed || isMobileView) && (
              <span className="flex items-center">
                <span>Returns</span>
                <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                  NOT LIVE
                </span>
              </span>
            )}
          </Link>
          <Link 
            href="/customers" 
            className={`sidebar-link ${pathname.startsWith('/customers') ? 'active' : ''}`}
            title="Customers"
          >
            <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            {(!isSidebarCollapsed || isMobileView) && <span>Customers</span>}
          </Link>
          <Link 
            href="/order-packs" 
            className={`sidebar-link ${pathname.startsWith('/order-packs') ? 'active' : ''}`}
            title="Order Packs"
          >
            <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            {(!isSidebarCollapsed || isMobileView) && <span>Order Packs</span>}
          </Link>
          <Link 
            href="/how-to-use" 
            className={`sidebar-link ${pathname === '/how-to-use' ? 'active' : ''}`}
            title="How to Use"
          >
            <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {(!isSidebarCollapsed || isMobileView) && <span>How to Use</span>}
          </Link>
          <Link 
            href="/feature-requests" 
            className={`sidebar-link ${pathname.startsWith('/feature-requests') ? 'active' : ''}`}
            title="Feature Requests"
          >
            <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {(!isSidebarCollapsed || isMobileView) && <span>Feature Requests</span>}
          </Link>
        </nav>

        <div className="sidebar-footer">
          <Button
            variant="outline"
            onClick={() => setIsNewOrderModalOpen(true)}
            className={`sidebar-button ${pathname === '/orders/new' ? 'active' : ''}`}
            title="New Order"
          >
            <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {(!isSidebarCollapsed || isMobileView) && <span>New Order</span>}
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="sidebar-button logout-button"
            title="Logout"
          >
            <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {(!isSidebarCollapsed || isMobileView) && <span>Logout</span>}
          </Button>
        </div>

        <NewOrderModal
          isOpen={isNewOrderModalOpen}
          onClose={() => setIsNewOrderModalOpen(false)}
          onOrderCreated={handleOrderCreated}
        />
      </aside>
    </>
  );
} 