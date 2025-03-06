"use client";

import { useEffect } from 'react';

export default function EnvScript() {
  useEffect(() => {
    try {
      // Make sure environment variables are available in the window object
      window.__ENV__ = window.__ENV__ || {};
      
      // Check if we already have the values
      if (!window.__ENV__.NEXT_PUBLIC_SUPABASE_URL) {
        // Try to get from Next.js public runtime config
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        // Update the window object with hardcoded fallbacks if needed
        window.__ENV__.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl || 'https://ppvcladrmrprkqclyycr.supabase.co';
        window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdmNsYWRybXJwcmtxY2x5eWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExODcxMTMsImV4cCI6MjA1Njc2MzExM30.MtKxAaj-XiDdlritn2G3OtCFLoTzsayL8-Pget09sMA';
        window.__ENV__.NEXT_PUBLIC_API_URL = apiUrl || 'https://imapper-oms-v1.vercel.app/api';
        
        console.log('Environment variables set in client:', {
          SUPABASE_URL: window.__ENV__.NEXT_PUBLIC_SUPABASE_URL,
          API_URL: window.__ENV__.NEXT_PUBLIC_API_URL,
        });
      }
      
      // Force reload Supabase client if it was already initialized
      if (window.__SUPABASE_CLIENT_RELOADED !== true) {
        window.__SUPABASE_CLIENT_RELOADED = true;
        
        // Dispatch a custom event that the supabase client can listen for
        const event = new CustomEvent('supabase-env-ready', { 
          detail: { 
            url: window.__ENV__.NEXT_PUBLIC_SUPABASE_URL,
            key: window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY
          } 
        });
        window.dispatchEvent(event);
        
        console.log('Supabase client reload event dispatched');
      }
    } catch (error) {
      console.error('Error in EnvScript:', error);
    }
  }, []);
  
  return null;
} 