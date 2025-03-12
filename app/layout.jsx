import "./globals.css"; // Using our new global CSS file with Tailwind
import Navigation from "./components/Navigation";
import Providers from "./components/Providers";
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: "Order Management System",
  description: "Manage your orders with Supabase and Stripe integration",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Force consistent rendering across environments */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__ENV__ = {
                NEXT_PUBLIC_SUPABASE_URL: "${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}",
                NEXT_PUBLIC_SUPABASE_ANON_KEY: "${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}",
                NEXT_PUBLIC_API_URL: "${process.env.NEXT_PUBLIC_API_URL || ''}"
              };
            `,
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