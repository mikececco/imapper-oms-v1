const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`
});
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
const stripeWebhookRoutes = require('./routes/stripeWebhookRoutes');
const debugRoutes = require('./routes/debugRoutes');

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

// Make supabase available globally
global.supabase = supabase;

const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook/stripe') {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/webhook/stripe', stripeWebhookRoutes);
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/debug', debugRoutes);
}

// Zapier webhook endpoint
app.post('/api/webhook/orders', async (req, res) => {
  try {
    const orderData = req.body;
    
    // Insert order into Supabase
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        id: orderData.id,
        name: orderData.name,
        instruction: orderData.instruction || '',
        order_pack: orderData.orderPack || '',
        package_prepared: orderData.packagePrepared || false,
        serial_number: orderData.serialNumber || '',
        package_weight: orderData.packageWeight || 'UNKNOWN',
        ship_by: orderData.shipBy || null,
        paid: orderData.paid || false,
        ok_to_ship: orderData.okToShip || false,
        status: orderData.status || 'pending',
        created_at: new Date(),
        updated_at: new Date()
      }]);
    
    if (error) throw error;
    
    res.status(201).json({ success: true, order: data[0] });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 