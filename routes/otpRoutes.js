const express = require("express");
const router = express.Router();
const otpController = require("../controllers/otpController");
const auth = require("../middlewares/auth");

// Request OTP for deposit or withdrawal
router.post("/request", auth, otpController.requestOtp);

// Verify OTP for deposit or withdrawal
router.post("/verify", auth, otpController.verifyOtp);

module.exports = router;
