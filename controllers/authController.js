const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Wallet = require("../models/Wallet");

const generateToken = (userId, email) => {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const getNormalizedAccountType = (accountType) =>
  accountType === "demo" ? "demo" : "real";

const isGatewayConfigured = (gateway) => {
  if (gateway === "stripe") {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }
  if (gateway === "razorpay") {
    return Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
    );
  }
  return true;
};

const ensureWalletDocument = async (userId, userBalance = 1000) => {
  const safeBalance = Number.isFinite(userBalance) ? userBalance : 1000;

  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        usdBalance: safeBalance,
        realUsdBalance: 0,
        demoUsdBalance: 1000,
        tokenBalance: 0,
      },
      $set: {
        lastUpdated: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  let requiresSave = false;
  if (wallet.realUsdBalance === undefined || wallet.realUsdBalance === null) {
    wallet.realUsdBalance = 0;
    requiresSave = true;
  }
  if (wallet.demoUsdBalance === undefined || wallet.demoUsdBalance === null) {
    wallet.demoUsdBalance = 1000;
    requiresSave = true;
  }
  if (wallet.usdBalance === undefined || wallet.usdBalance === null) {
    wallet.usdBalance = wallet.realUsdBalance;
    requiresSave = true;
  }

  if (requiresSave) {
    await wallet.save();
  }

  return wallet;
};

// Register Controller
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username }],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          error: "Email already registered",
        });
      }
      if (existingUser.username === username) {
        return res.status(400).json({
          success: false,
          error: "Username already taken",
        });
      }
    }

    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      balance: 0,
    });

    await user.save();
    await ensureWalletDocument(user._id, user.balance);

    const token = generateToken(user._id, user.email);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Register Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error during registration",
    });
  }
};

// Login Controller
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Explicitly select password since it's set to select: false in model
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const token = generateToken(user._id, user.email);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error during login",
    });
  }
};

// Get Profile Controller
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id); // req.user set by auth middleware
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get Profile Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Error fetching profile",
    });
  }
};

// Update Balance Controller
const updateBalance = async (req, res) => {
  try {
    const { amount, accountType } = req.body;

    if (typeof amount !== "number") {
      return res.status(400).json({
        success: false,
        error: "Invalid amount",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const wallet = await ensureWalletDocument(user._id, user.balance);
    const normalizedAccountType = getNormalizedAccountType(accountType);
    const balanceField =
      normalizedAccountType === "demo" ? "demoUsdBalance" : "realUsdBalance";

    const currentBalance = Number(wallet[balanceField] || 0);
    if (currentBalance + amount < 0) {
      return res.status(400).json({
        success: false,
        error: "Insufficient balance",
      });
    }

    wallet[balanceField] = currentBalance + amount;
    wallet.usdBalance = wallet.realUsdBalance;
    wallet.lastUpdated = new Date();

    if (normalizedAccountType === "real") {
      user.balance = wallet.realUsdBalance;
      await user.save();
    }

    await wallet.save();

    res.json({
      success: true,
      message: "Balance updated",
      wallet: {
        usdBalance: Number(wallet.realUsdBalance || 0),
        realUsdBalance: Number(wallet.realUsdBalance || 0),
        demoUsdBalance: Number(wallet.demoUsdBalance || 0),
        tokenBalance: Number(wallet.tokenBalance || 0),
      },
      accountType: normalizedAccountType,
      user, // update user in state
    });
  } catch (error) {
    console.error("Update Balance Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Error updating balance",
    });
  }
};

const depositByCard = async (req, res) => {
  try {
    const { amount, accountType, gateway = "mock" } = req.body;
    const normalizedAccountType = getNormalizedAccountType(accountType);

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid deposit amount",
      });
    }

    if (normalizedAccountType !== "real") {
      return res.status(400).json({
        success: false,
        error: "Card deposits are available only for real account",
      });
    }

    if (!["mock", "stripe", "razorpay"].includes(gateway)) {
      return res.status(400).json({
        success: false,
        error: "Unsupported payment gateway",
      });
    }

    if (!isGatewayConfigured(gateway)) {
      return res.status(400).json({
        success: false,
        error: `${gateway} is not configured on server`,
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const wallet = await ensureWalletDocument(user._id, user.balance);
    const balanceField =
      normalizedAccountType === "demo" ? "demoUsdBalance" : "realUsdBalance";

    wallet[balanceField] = Number(wallet[balanceField] || 0) + amount;
    wallet.usdBalance = wallet.realUsdBalance;
    wallet.lastUpdated = new Date();
    await wallet.save();

    if (normalizedAccountType === "real") {
      user.balance = wallet.realUsdBalance;
      await user.save();
    }

    return res.json({
      success: true,
      message: `$${amount.toFixed(2)} added to ${normalizedAccountType} account`,
      gateway,
      wallet: {
        usdBalance: Number(wallet.realUsdBalance || 0),
        realUsdBalance: Number(wallet.realUsdBalance || 0),
        demoUsdBalance: Number(wallet.demoUsdBalance || 0),
        tokenBalance: Number(wallet.tokenBalance || 0),
      },
      accountType: normalizedAccountType,
    });
  } catch (error) {
    console.error("Card Deposit Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Error processing card deposit",
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateBalance,
  depositByCard,
};
