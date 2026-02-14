const jwt = require('jsonwebtoken');
const User = require('../models/User');


const authMiddleware = async (req, res, next) => {
  try {
    // 1. Header se token nikalo
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication token nahi mila. Pehle login karein.' 
      });
    }

    // 2. Token extract karo
    const token = authHeader.replace('Bearer ', '');

    // 3. Token verify karo
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const idToFind = decoded.userId || decoded.id || decoded.sub;

    if (!idToFind) {
      return res.status(401).json({ 
        success: false,
        error: 'Token structure invalid hai. Payload mein ID nahi mili.' 
      });
    }

    // 4. Database se user dhundo (Password ko exclude karke)
    const user = await User.findById(idToFind).select('-password');

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'User nahi mila. Account exist nahi karta ya token invalid hai.' 
      });
    }

    req.user = user;
    req.userId = user._id; 
    req.token = token;

    next();
  } catch (error) {

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token. Phir se login karein.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Aapka session expire ho gaya hai. Dobara login karein.' 
      });
    }

    console.error('Auth Middleware Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal Server Error: Authentication failed' 
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const idToFind = decoded.userId || decoded.id;
    const user = await User.findById(idToFind).select('-password');

    if (user) {
      req.user = user;
      req.userId = user._id;
    }

    next();
  } catch (error) {
  
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuth
};