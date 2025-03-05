import Link from "next/link";
import NewOrderForm from "../../components/NewOrderForm";

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

          <NewOrderForm />
        </div>
      </main>

      <footer>
        <p>Order Management System &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
} 