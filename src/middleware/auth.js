const jwt = require('jsonwebtoken');

module.exports = async function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token with Supabase
    const { data, error } = await global.supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    // Set user data in request
    req.user = data.user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
}; 