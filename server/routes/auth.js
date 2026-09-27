import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import NGO from '../models/NGO.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      location,
      // NGO-specific fields
      organizationName,
      registrationNumber,
      capacity,
      dietaryNeeds,
      operatingHours
    } = req.body;

    // Validation
    if (!name || !email || !password || !role || !phone) {
      return res.status(400).json({
        error: 'Please provide all required fields: name, email, password, role, phone'
      });
    }

    if (!['donor', 'ngo', 'volunteer', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be one of: donor, ngo, volunteer, admin'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user data
    const userData = {
      name,
      email,
      passwordHash: password, // Will be hashed in pre-save middleware
      role,
      phone,
      location: location || {}
    };

    // Add NGO-specific fields if role is NGO
    if (role === 'ngo') {
      if (!organizationName || !registrationNumber || !capacity) {
        return res.status(400).json({
          error: 'NGO registration requires: organizationName, registrationNumber, capacity'
        });
      }
      
      userData.organizationName = organizationName;
      userData.capacity = capacity;
      userData.dietaryNeeds = dietaryNeeds || ['any'];
      userData.operatingHours = operatingHours || {};
    }

    // Create user
    const user = new User(userData);
    await user.save();

    // If NGO, create NGO profile
    if (role === 'ngo') {
      const ngoProfile = new NGO({
        userId: user._id,
        organizationName,
        registrationNumber,
        capacity: {
          daily: capacity,
          current: 0
        },
        dietaryNeeds: dietaryNeeds || ['any'],
        operatingHours: operatingHours || {},
        primaryContact: {
          name: name,
          email: email,
          phone: phone
        }
      });
      
      await ngoProfile.save();
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // Find user (include password for comparison)
    const user = await User.findOne({ email }).select('+passwordHash');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login (optional)
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Get NGO profile if user is NGO
    let ngoProfile = null;
    if (user.role === 'ngo') {
      ngoProfile = await NGO.findOne({ userId: user._id });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      },
      ngoProfile
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.passwordHash;
    delete updates.role;
    delete updates.isVerified;
    delete updates.email; // Email changes might need verification

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * @route   POST /api/auth/demo
 * @desc    Quick demo login — finds user by role and returns token (dev only)
 * @access  Public
 */
router.post('/demo', async (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ['donor', 'ngo', 'volunteer', 'admin'];
    if (!role || !allowed.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${allowed.join(', ')}` });
    }

    const user = await User.findOne({ role, isActive: true });
    if (!user) {
      return res.status(404).json({ error: `No ${role} user found in database. The server may have just restarted — please wait a moment and try again.` });
    }

    const token = generateToken(user._id);
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: `Demo login as ${role}`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Demo login failed' });
  }
});

export default router;