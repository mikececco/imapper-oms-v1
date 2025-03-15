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
    const value = process.env[possibleKey];
    if (value && value !== 'build-placeholder') {
      return value;
    }
  }
  return '';
};

// Get Supabase configuration
const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase configuration:', {
    url: supabaseUrl ? 'set' : 'missing',
    key: supabaseAnonKey ? 'set' : 'missing'
  });
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

  // Serialize environment variables safely
  const serializedEnvVars = JSON.stringify(envVars)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027')
    .replace(/"/g, '\\u0022');

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
            __html: `window.__ENV__ = JSON.parse('${serializedEnvVars}');`,
          }}
        />
      </head>
      <body className="antialiased font-sans">
        <div className="layout-wrapper">
          <Navigation />
          <div className="content-wrapper">
            <main className="main-content">
              <Providers>
                {children}
              </Providers>
            </main>
          </div>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}