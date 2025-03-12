import "./globals.css"; // Using our new global CSS file with Tailwind
import Navigation from "./components/Navigation";
import Providers from "./components/Providers";
import { Toaster } from 'react-hot-toast';

// Get environment variables with fallbacks
const getEnvVar = (key) => {
  // Try all possible environment variable names
  const possibleKeys = [
    `NEXT_PUBLIC_${key}`,
    `NEXT_${key}`,
    key
  ];

  for (const possibleKey of possibleKeys) {
    if (process.env[possibleKey]) {
      return process.env[possibleKey];
    }
  }
  return '';
};

// Get Supabase configuration
const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase configuration.');
  if (!supabaseUrl) console.error('Missing SUPABASE_URL');
  if (!supabaseAnonKey) console.error('Missing SUPABASE_ANON_KEY');
}

export const metadata = {
  title: "Order Management System",
  description: "Manage your orders with Supabase and Stripe integration",
};

export default function RootLayout({ children }) {
  // Create environment variables object for client
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
  };

  return (
    <html lang="en">
      <head>
        {/* Force consistent rendering across environments */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* Ensure consistent environment variables between server and client */}
        <script
          id="env-script"
          dangerouslySetInnerHTML={{
            __html: `window.__ENV__ = ${JSON.stringify(envVars)};`,
          }}
        />
      </head>
      <body className="antialiased font-sans">
        <Navigation />
        <div className="page-content">
          <Providers>
            {children}
          </Providers>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}