'use client';

import { OrderDetailModalProvider } from './OrderDetailModal';
import EnvScript from './EnvScript';

export default function Providers({ children }) {
  return (
    <OrderDetailModalProvider>
      <EnvScript />
      {children}
    </OrderDetailModalProvider>
  );
} 