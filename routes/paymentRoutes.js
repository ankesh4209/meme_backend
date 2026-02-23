const {
  createPaymentIntent,
  confirmPaymentIntent,
} = require("../services/stripeService");
router.post("/create-intent", async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const paymentIntent = await createPaymentIntent(amount, currency);
    res.json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/confirm-intent", async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const paymentIntent = await confirmPaymentIntent(paymentIntentId);
    res.json({ success: true, paymentIntent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
const express = require("express");
const router = express.Router();
const paymentService = require("../services/paymentService");

// Create a payment intent
router.post("/create-intent", async (req, res) => {
  try {
    const { amount, currency } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount is required" });
    const paymentIntent = await paymentService.createPaymentIntent(
      amount,
      currency,
    );
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Retrieve a payment intent
router.get("/intent/:id", async (req, res) => {
  try {
    const paymentIntent = await paymentService.retrievePaymentIntent(
      req.params.id,
    );
    res.json(paymentIntent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
