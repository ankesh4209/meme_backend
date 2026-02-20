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
