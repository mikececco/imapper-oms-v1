'use client';

import { createBrowserClient } from '@supabase/ssr';
import { createContext, useContext, useState, useEffect } from 'react';
import { OrderDetailModalProvider } from './OrderDetailModal';

const SupabaseContext = createContext(null);

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export default function Providers({ children }) {
  const [supabase, setSupabase] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeSupabase = () => {
      try {
        const envVars = window.__ENV__ || {};
        const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Missing Supabase environment variables');
        }

        const client = createBrowserClient(supabaseUrl, supabaseAnonKey);
        setSupabase(client);
      } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSupabase();
  }, []);

  return (
    <div className="container">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : !supabase ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-red-500 text-center">
            <p className="font-medium">Failed to initialize Supabase client.</p>
            <p className="text-sm mt-2">Please check your environment variables.</p>
          </div>
        </div>
      ) : (
        <SupabaseContext.Provider value={supabase}>
          <OrderDetailModalProvider>
            {children}
          </OrderDetailModalProvider>
        </SupabaseContext.Provider>
      )}
    </div>
  );
} 