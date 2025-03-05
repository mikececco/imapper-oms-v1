const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Fetch invoice details from Stripe
 * @param {string} invoiceId - The Stripe invoice ID
 * @returns {Promise<Object>} - The invoice object
 */
async function getInvoiceDetails(invoiceId) {
  try {
    const invoice = await stripe.invoices.retrieve(invoiceId, {
      expand: ['customer', 'lines.data']
    });
    return invoice;
  } catch (error) {
    console.error('Error fetching invoice from Stripe:', error);
    throw error;
  }
}

/**
 * Create a new invoice in Stripe
 * @param {Object} invoiceData - The invoice data
 * @returns {Promise<Object>} - The created invoice
 */
async function createInvoice(invoiceData) {
  try {
    const invoice = await stripe.invoices.create(invoiceData);
    return invoice;
  } catch (error) {
    console.error('Error creating invoice in Stripe:', error);
    throw error;
  }
}

module.exports = {
  getInvoiceDetails,
  createInvoice
}; 