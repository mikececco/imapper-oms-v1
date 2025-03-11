import Link from "next/link";
import { supabase } from "../../utils/supabase";
import { StatusBadge, PaymentBadge, ShippingToggle, StatusSelector } from "../../components/OrderActions";
import OrderDetailForm from "../../components/OrderDetailForm";
import { ORDER_PACK_OPTIONS } from "../../utils/constants";

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(',', '');
  } catch (e) {
    return 'Invalid date';
  }
};

export default async function OrderDetail({ params }) {
  const { id } = params;
  
  // Fetch order details
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error("Error fetching order:", error);
    return (
      <div className="container">
        <header>
          <h1>Order Not Found</h1>
        </header>
        <div className="card">
          <p>The order you're looking for doesn't exist or you don't have permission to view it.</p>
          <Link href="/orders" className="btn">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>Order Details</h1>
        <p>Order ID: {order.id}</p>
      </header>

      <main className="single-column">
        <div className="card">
          <div className="actions" style={{ marginBottom: '1rem' }}>
            <Link href="/orders" className="btn">
              Back to Orders
            </Link>
          </div>

          <div className="order-details">
            <div className="order-header">
              <h2>{order.name || 'N/A'}</h2>
              <div className="order-meta">
                <StatusBadge status={order.status || 'pending'} />
                <PaymentBadge isPaid={order.paid} orderId={order.id} />
              </div>
            </div>

            <div className="order-info-grid">
              <div className="info-group">
                <h3>Customer Information</h3>
                <p><strong>Email:</strong> {order.email || 'N/A'}</p>
                <p><strong>Phone:</strong> {order.phone || 'N/A'}</p>
              </div>

              <div className="info-group">
                <h3>Shipping Information</h3>
                <p><strong>Address:</strong> {order.shipping_address_line1 || 'N/A'}</p>
                {order.shipping_address_line2 && <p><strong>Address Line 2:</strong> {order.shipping_address_line2}</p>}
                <p><strong>City:</strong> {order.shipping_address_city || 'N/A'}</p>
                <p><strong>Postal Code:</strong> {order.shipping_address_postal_code || 'N/A'}</p>
                <p><strong>Country:</strong> {order.shipping_address_country || 'N/A'}</p>
              </div>

              <div className="info-group">
                <h3>Order Pack Information</h3>
                <p><strong>Order Pack:</strong> {order.order_pack || 'Not specified'}</p>
                <p><strong>Weight:</strong> {order.weight || '1.000'} kg</p>
                {/* {order.shipping_method && (
                  <p><strong>Shipping Method:</strong> <span className="capitalize">{order.shipping_method}</span></p>
                )} */}
              </div>

              <div className="info-group">
                <h3>Order Information</h3>
                <p><strong>Created:</strong> {formatDate(order.created_at)}</p>
                <p><strong>Updated:</strong> {formatDate(order.updated_at)}</p>
                <p><strong>Status:</strong> 
                  <StatusSelector 
                    currentStatus={order.status || 'pending'} 
                    orderId={order.id} 
                  />
                </p>
                <p><strong>INSTRUCTION:</strong> 
                  <ShippingToggle 
                    okToShip={order.ok_to_ship} 
                    orderId={order.id} 
                  />
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Edit Order</h3>
              <OrderDetailForm order={order} orderPackOptions={ORDER_PACK_OPTIONS} />
            </div>

            {order.instruction && (
              <div className="order-notes">
                <h3>Instructions</h3>
                <p>{order.instruction}</p>
              </div>
            )}

            {order.stripe_customer_id && (
              <div className="stripe-info">
                <h3>Stripe Information</h3>
                <p>
                  <strong>Customer ID:</strong>{' '}
                  <a 
                    href={`https://dashboard.stripe.com/customers/${order.stripe_customer_id}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:underline"
                  >
                    {order.stripe_customer_id}
                  </a>
                </p>
                {order.stripe_invoice_id && (
                  <p>
                    <strong>Invoice ID:</strong>{' '}
                    <a 
                      href={`https://dashboard.stripe.com/invoices/${order.stripe_invoice_id}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:underline"
                    >
                      {order.stripe_invoice_id}
                    </a>
                  </p>
                )}
                {order.stripe_payment_intent_id && (
                  <p>
                    <strong>Payment Intent ID:</strong>{' '}
                    <a 
                      href={`https://dashboard.stripe.com/payments/${order.stripe_payment_intent_id}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:underline"
                    >
                      {order.stripe_payment_intent_id}
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer>
        <p>Order Management System &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
} 