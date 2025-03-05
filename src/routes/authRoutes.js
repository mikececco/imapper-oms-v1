const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Register user
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  try {
    // Register user with Supabase
    const { data, error } = await global.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    });
    
    if (error) throw error;
    
    // Create user profile in users table
    const { error: profileError } = await global.supabase
      .from('users')
      .insert([{
        id: data.user.id,
        name,
        email,
        role: 'user',
        created_at: new Date()
      }]);
    
    if (profileError) throw profileError;
    
    res.json({ 
      token: data.session.access_token,
      user: data.user
    });
  } catch (error) {
    console.error('Error in registration:', error);
    res.status(500).json({ message: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Sign in with Supabase
    const { data, error } = await global.supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    res.json({ 
      token: data.session.access_token,
      user: data.user
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(400).json({ message: 'Invalid credentials' });
  }
});

// Get user data
router.get('/me', auth, async (req, res) => {
  try {
    // User data is already in req.user from auth middleware
    const { data, error } = await global.supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 