'use client';

import { createBrowserClient } from '@supabase/ssr';
import { createContext, useContext, useState, useEffect } from 'react';
import { OrderDetailModalProvider } from './OrderDetailModal';
import EnvScript from './EnvScript';

const SupabaseContext = createContext(null);

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export default function Providers({ children }) {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ));

  return (
    <SupabaseContext.Provider value={supabase}>
      <OrderDetailModalProvider>
        <EnvScript />
        {children}
      </OrderDetailModalProvider>
    </SupabaseContext.Provider>
  );
} 