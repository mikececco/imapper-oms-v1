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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">
          Failed to initialize Supabase client. Please check your environment variables.
        </div>
      </div>
    );
  }

  return (
    <SupabaseContext.Provider value={supabase}>
      <OrderDetailModalProvider>
        {children}
      </OrderDetailModalProvider>
    </SupabaseContext.Provider>
  );
} 