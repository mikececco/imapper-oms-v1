import Link from "next/link";

export default function NewOrder() {
  return (
    <div className="container">
      <header>
        <h1>Create New Order</h1>
        <p>Enter the details for the new order</p>
      </header>

      <main>
        <div className="card">
          <div className="actions" style={{ marginBottom: '1rem' }}>
            <Link href="/orders" className="btn">
              Back to Orders
            </Link>
          </div>

          <form>
            <div className="form-group">
              <label htmlFor="customer_name">Customer Name</label>
              <input type="text" id="customer_name" className="form-control" placeholder="Enter customer name" />
            </div>

            <div className="form-group">
              <label htmlFor="customer_email">Customer Email</label>
              <input type="email" id="customer_email" className="form-control" placeholder="Enter customer email" />
            </div>

            <div className="form-group">
              <label htmlFor="customer_phone">Customer Phone</label>
              <input type="tel" id="customer_phone" className="form-control" placeholder="Enter customer phone" />
            </div>

            <div className="form-group">
              <label htmlFor="shipping_address">Shipping Address</label>
              <textarea id="shipping_address" className="form-control" rows={3} placeholder="Enter shipping address"></textarea>
            </div>

            <div className="form-group">
              <label htmlFor="order_items">Order Items</label>
              <textarea id="order_items" className="form-control" rows={5} placeholder="Enter order items (one per line)"></textarea>
            </div>

            <div className="form-group">
              <label htmlFor="order_notes">Order Notes</label>
              <textarea id="order_notes" className="form-control" rows={3} placeholder="Enter any additional notes"></textarea>
            </div>

            <button type="submit" className="btn">Create Order</button>
          </form>
        </div>
      </main>

      <footer>
        <p>Order Management System &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
} 