'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function HowToUse() {
  const [showVideos, setShowVideos] = useState(false);
  const [showProcess, setShowProcess] = useState(false);

  return (
    <div className="w-full max-w-none px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold">How to Use</h1>
        <p className="text-gray-600">Guide to using the Order Management System</p>
      </header>

      <main className="w-full">
        <div className="space-y-8">
          {/* Video Tutorial */}
          <section className="space-y-4">
            <button 
              onClick={() => setShowVideos(!showVideos)}
              className="w-full flex items-center justify-between text-xl font-semibold bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span>Video Tutorials</span>
              {showVideos ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
            </button>
            
            {showVideos && (
              <div className="mt-4 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* First Video */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">First steps with OMS</h3>
                    <div className="relative w-full" style={{ paddingBottom: '62.5%' }}>
                      <iframe 
                        src="https://www.loom.com/embed/07a8703a252c4e4cbebd60058a551f53?sid=3ee23857-08a0-404a-b8b6-ab4e23784a5c" 
                        frameBorder="0" 
                        webkitallowfullscreen="true"
                        mozallowfullscreen="true"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Third Video */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">How to create a new order</h3>
                    <div className="relative w-full" style={{ paddingBottom: '62.5%' }}>
                      <iframe 
                        src="https://www.loom.com/embed/a9ea8ea2cffa400482992fef552c9b86?sid=823e0e66-3be0-466b-bdfb-5b865c78a3ac" 
                        frameBorder="0" 
                        webkitallowfullscreen="true"
                        mozallowfullscreen="true"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Fourth Video (New) */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">How to create a shipping label</h3>
                    <div className="relative w-full" style={{ paddingBottom: '62.5%' }}>
                      <iframe 
                        src="https://www.loom.com/embed/27f9461d7ec941eb96a0f577314c951a?sid=c6693e64-8495-444e-9883-c16c64ce7bea" 
                        frameBorder="0" 
                        webkitallowfullscreen="true"
                        mozallowfullscreen="true"
                        allowFullScreen 
                        className="absolute top-0 left-0 w-full h-full rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Process Overview */}
          <section className="space-y-4">
            <button 
              onClick={() => setShowProcess(!showProcess)}
              className="w-full flex items-center justify-between text-xl font-semibold bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span>Process Overview</span>
              {showProcess ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
            </button>
            
            {showProcess && (
              <div className="space-y-6 mt-4">
                <p className="text-gray-600">
                  The Order Management System helps you manage orders from creation to delivery. Here's how the process works:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Step 1 */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium mb-2">1. Order Creation</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-600">
                      <li>Orders are automatically created when customers make a purchase</li>
                      <li>Each order contains customer details, shipping information, and order contents</li>
                      <li>Payment status is automatically updated when payment is received</li>
                    </ul>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium mb-2">2. Order Processing</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-600">
                      <li>Review order details in the Orders table</li>
                      <li>Verify customer information and shipping address</li>
                      <li>Select the appropriate Order Pack from the dropdown</li>
                      <li>Mark the order as "OK TO SHIP" when ready</li>
                    </ul>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium mb-2">3. Creating Shipping Labels</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-600">
                      <li>Open the order details by clicking the "Open" button</li>
                      <li>Ensure all required fields are filled out:
                        <ul className="list-disc list-inside ml-4 mt-2">
                          <li>Name (max 35 characters)</li>
                          <li>Email</li>
                          <li>Phone</li>
                          <li>Complete shipping address</li>
                          <li>Order Pack selection</li>
                        </ul>
                      </li>
                      <li>Click "Create Shipping Label" to generate a SendCloud shipping label</li>
                    </ul>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium mb-2">4. Tracking & Updates</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-600">
                      <li>Track shipments using the provided tracking numbers</li>
                      <li>Update delivery status manually or automatically via SendCloud</li>
                      <li>View order history and activities in the Activity Log</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Important Notes */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Important Notes</h2>
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <ul className="list-disc list-inside space-y-2 text-amber-800">
                <li>Ensure all customer information is accurate before creating shipping labels</li>
                <li>Names longer than 35 characters will be truncated for SendCloud compatibility</li>
                <li>Orders must be marked as "Paid" and "OK TO SHIP" before creating labels</li>
                <li>Keep track of order status changes in the Activity Log</li>
              </ul>
            </div>
          </section>

          {/* Support */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Need Help?</h2>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-blue-800">
                If you need assistance or encounter any issues, please contact Mike or Pierre Yves
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>Order Management System &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
} 