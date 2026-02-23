const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function createPaymentIntent(amount, currency = 'usd') {
  return stripe.paymentIntents.create({
    amount,
    currency,
  });
}

async function confirmPaymentIntent(paymentIntentId) {
  return stripe.paymentIntents.confirm(paymentIntentId);
}

module.exports = {
  createPaymentIntent,
  confirmPaymentIntent,
};
