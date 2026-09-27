import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxLength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['donor', 'ngo', 'volunteer', 'admin'],
    required: [true, 'Role is required']
  },
  location: {
    lat: {
      type: Number,
      required: false // Make optional for registration
    },
    lng: {
      type: Number,
      required: false // Make optional for registration
    },
    address: {
      type: String,
      trim: true
    }
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  // NGO-specific fields
  organizationName: {
    type: String,
    required: function() {
      return this.role === 'ngo';
    }
  },
  capacity: {
    type: Number,
    required: function() {
      return this.role === 'ngo';
    },
    min: [1, 'Capacity must be at least 1']
  },
  dietaryNeeds: [{
    type: String,
    enum: ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free', 'any']
  }],
  operatingHours: {
    start: String, // "09:00"
    end: String,   // "18:00"
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  },
  // Verification & status
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'location.lat': 1, 'location.lng': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Transform output (remove sensitive fields)
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

export default mongoose.model('User', userSchema);