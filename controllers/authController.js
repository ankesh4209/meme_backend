const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register Controller
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered'
        });
      }
      if (existingUser.username === username) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken'
        });
      }
    }

    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      balance: 100000 // Initial balance
    });

    await user.save();

    const token = generateToken(user._id, user.email);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user
    });

  } catch (error) {
    console.error('Register Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Server error during registration'
    });
  }
};

// Login Controller
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Explicitly select password since it's set to select: false in model
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id, user.email);
    console.log("Token:", token);
    console.log("User:", user);
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("IsMatch:", isMatch);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user
    });

  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
};

// Get Profile Controller
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id); // req.user set by auth middleware
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get Profile Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error fetching profile'
    });
  }
};

// Update Balance Controller
const updateBalance = async (req, res) => {
  try {
    const { amount } = req.body;

    if (typeof amount !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.balance + amount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    user.balance += amount;
    await user.save();

    res.json({
      success: true,
      message: 'Balance updated',
      wallet: {
        usdBalance: user.balance,
        tokenBalance: 0 // Placeholder/Future use
      },
      user // update user in state
    });

  } catch (error) {
    console.error('Update Balance Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error updating balance'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateBalance
};