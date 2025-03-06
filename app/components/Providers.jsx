'use client';

import { OrderDetailModalProvider } from './OrderDetailModal';

export default function Providers({ children }) {
  return (
    <OrderDetailModalProvider>
      {children}
    </OrderDetailModalProvider>
  );
} 