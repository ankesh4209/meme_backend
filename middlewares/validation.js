// Request validation middleware

// Register validation
const validateRegister = (req, res, next) => {
  const { username, email, password } = req.body;
  const errors = [];

  // Username validation
  if (!username) {
    errors.push('Username zaroori hai');
  } else if (username.length < 3) {
    errors.push('Username kam se kam 3 characters ka hona chahiye');
  } else if (username.length > 30) {
    errors.push('Username 30 characters se zyada nahi ho sakta');
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username mein sirf letters, numbers aur underscore ho sakte hain');
  }

  // Email validation
  if (!email) {
    errors.push('Email zaroori hai');
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.push('Valid email address enter karein');
  }

  // Password validation
  if (!password) {
    errors.push('Password zaroori hai');
  } else if (password.length < 6) {
    errors.push('Password kam se kam 6 characters ka hona chahiye');
  } else if (password.length > 100) {
    errors.push('Password bahut lamba hai');
  }

  // Agar errors hain to response bhejo
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: errors[0],
      allErrors: errors 
    });
  }

  next();
};

// Login validation
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  // Email validation
  if (!email) {
    errors.push('Email zaroori hai');
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.push('Valid email address enter karein');
  }

  // Password validation
  if (!password) {
    errors.push('Password zaroori hai');
  }

  // Agar errors hain to response bhejo
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: errors[0],
      allErrors: errors 
    });
  }

  next();
};

// Balance update validation
const validateBalance = (req, res, next) => {
  const { amount } = req.body;

  if (amount === undefined || amount === null) {
    return res.status(400).json({ 
      error: 'Amount zaroori hai' 
    });
  }

  if (typeof amount !== 'number') {
    return res.status(400).json({ 
      error: 'Amount number hona chahiye' 
    });
  }

  if (amount < 0) {
    return res.status(400).json({ 
      error: 'Amount negative nahi ho sakta' 
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateBalance
};