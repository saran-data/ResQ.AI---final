import mongoose from 'mongoose';

const ngoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  organizationName: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true
  },
  registrationNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    unique: true
  },
  capacity: {
    daily: {
      type: Number,
      required: [true, 'Daily capacity is required'],
      min: [1, 'Daily capacity must be at least 1']
    },
    current: {
      type: Number,
      default: 0,
      min: [0, 'Current capacity cannot be negative']
    }
  },
  dietaryNeeds: [{
    type: String,
    enum: ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free', 'any']
  }],
  operatingHours: {
    monday: { start: String, end: String, closed: Boolean },
    tuesday: { start: String, end: String, closed: Boolean },
    wednesday: { start: String, end: String, closed: Boolean },
    thursday: { start: String, end: String, closed: Boolean },
    friday: { start: String, end: String, closed: Boolean },
    saturday: { start: String, end: String, closed: Boolean },
    sunday: { start: String, end: String, closed: Boolean }
  },
  servingAreas: [{
    type: String, // Areas/localities they serve
    trim: true
  }],
  // Contact information
  primaryContact: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true }
  },
  // Verification & ratings
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  // Statistics
  stats: {
    totalDonationsReceived: { type: Number, default: 0 },
    totalMealsServed: { type: Number, default: 0 },
    successfulPickups: { type: Number, default: 0 }
  },
  // Preferences
  preferences: {
    maxDistance: { type: Number, default: 10 }, // km
    preferredFoodTypes: [String],
    minimumQuantity: { type: Number, default: 1 },
    acceptsLeftovers: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// Indexes
ngoSchema.index({ userId: 1 });
ngoSchema.index({ verificationStatus: 1 });
ngoSchema.index({ 'rating.average': -1 });

// Virtual for availability percentage
ngoSchema.virtual('availabilityPercentage').get(function() {
  if (this.capacity.daily === 0) return 0;
  return Math.max(0, (this.capacity.daily - this.capacity.current) / this.capacity.daily * 100);
});

export default mongoose.model('NGO', ngoSchema);