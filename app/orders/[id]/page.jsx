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

      <main>
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
                {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
                <p>{order.shipping_address_city || 'N/A'}, {order.shipping_address_postal_code || 'N/A'}</p>
                <p>{order.shipping_address_country || 'N/A'}</p>
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
                <p><strong>Shipping:</strong> 
                  <ShippingToggle 
                    okToShip={order.ok_to_ship} 
                    orderId={order.id} 
                  />
                </p>
              </div>

              <div className="info-group">
                <h3>Package Information</h3>
                <OrderDetailForm order={order} orderPackOptions={ORDER_PACK_OPTIONS} />
              </div>
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
                <p><strong>Customer ID:</strong> {order.stripe_customer_id}</p>
                {order.stripe_invoice_id && <p><strong>Invoice ID:</strong> {order.stripe_invoice_id}</p>}
                {order.stripe_payment_intent_id && <p><strong>Payment Intent ID:</strong> {order.stripe_payment_intent_id}</p>}
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