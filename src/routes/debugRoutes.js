const express = require('express');
const router = express.Router();
const config = require('../config');

// Debug route to check environment variables (REMOVE IN PRODUCTION)
router.get('/', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV,
    supabaseUrl: config.supabase.url ? 'Set (masked)' : 'Not set',
    supabaseKey: config.supabase.anonKey ? 'Set (masked)' : 'Not set',
    stripeSecretKey: config.stripe.secretKey ? 'Set (masked)' : 'Not set',
    stripeWebhookSecret: config.stripe.webhookSecret ? 'Set (masked)' : 'Not set',
    port: config.port
  });
});

module.exports = router; 