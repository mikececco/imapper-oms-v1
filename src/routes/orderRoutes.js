const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getInvoiceDetails } = require('../utils/stripeUtils');

// Get all orders
router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await global.supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

console.log('helo');


// Get orders to ship this week
router.get('/ship-this-week', auth, async (req, res) => {
  try {
    const today = new Date();
    const endOfWeek = new Date();
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    
    const { data, error } = await global.supabase
      .from('orders')
      .select('*')
      .gte('ship_by', today.toISOString())
      .lte('ship_by', endOfWeek.toISOString())
      .order('ship_by', { ascending: true });
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching orders to ship this week:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get orders to ship after this week
router.get('/ship-after-week', auth, async (req, res) => {
  try {
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    
    const { data, error } = await global.supabase
      .from('orders')
      .select('*')
      .gt('ship_by', endOfWeek.toISOString())
      .order('ship_by', { ascending: true });
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching future orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single order
router.get('/:id', auth, async (req, res) => {
  try {
    const { data, error } = await global.supabase
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order
router.put('/:id', auth, async (req, res) => {
  try {
    const updates = {
      ...req.body,
      updated_at: new Date()
    };
    
    const { data, error } = await global.supabase
      .from('orders')
      .update(updates)
      .eq('id', req.params.id)
      .select();
    
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete order
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await global.supabase
      .from('orders')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Sync order with Stripe invoice
router.post('/sync-stripe-invoice/:invoiceId', auth, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    // Fetch invoice details from Stripe
    const invoice = await getInvoiceDetails(invoiceId);
    
    // Check if order already exists for this invoice
    const { data: existingOrder, error: findError } = await global.supabase
      .from('orders')
      .select('*')
      .eq('stripe_invoice_id', invoiceId)
      .single();
    
    if (!findError && existingOrder) {
      // Update existing order
      const { data, error } = await global.supabase
        .from('orders')
        .update({
          paid: invoice.paid,
          status: invoice.paid ? 'processing' : 'pending',
          amount: invoice.total / 100,
          updated_at: new Date()
        })
        .eq('stripe_invoice_id', invoiceId)
        .select();
      
      if (error) throw error;
      
      return res.json({ message: 'Order updated from Stripe invoice', order: data[0] });
    } else {
      // Create new order from invoice
      const customer = invoice.customer;
      const orderId = `ord_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await global.supabase
        .from('orders')
        .insert([{
          id: orderId,
          name: customer.name || customer.email,
          instruction: `Stripe Invoice: ${invoice.id}`,
          order_pack: invoice.lines.data.map(item => item.description).join(', '),
          package_prepared: false,
          serial_number: invoice.number,
          package_weight: 'UNKNOWN',
          ship_by: null,
          paid: invoice.paid,
          ok_to_ship: false,
          status: invoice.paid ? 'processing' : 'pending',
          stripe_invoice_id: invoice.id,
          stripe_customer_id: invoice.customer.id,
          amount: invoice.total / 100,
          created_at: new Date(),
          updated_at: new Date()
        }])
        .select();
      
      if (error) throw error;
      
      return res.json({ message: 'New order created from Stripe invoice', order: data[0] });
    }
  } catch (error) {
    console.error('Error syncing Stripe invoice:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 