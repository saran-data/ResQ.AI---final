import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  donationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation',
    required: [true, 'Donation ID is required']
  },
  ngoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'NGO ID is required']
  },
  volunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be assigned later
  },
  // Matching algorithm results
  score: {
    total: { type: Number, required: true, min: 0, max: 100 },
    breakdown: {
      distance: { type: Number, required: true },
      capacity: { type: Number, required: true },
      dietary: { type: Number, required: true },
      shelfLife: { type: Number, required: true }
    }
  },
  distanceKm: {
    type: Number,
    required: [true, 'Distance is required'],
    min: [0, 'Distance cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'expired'],
    default: 'pending'
  },
  // Pickup scheduling
  pickupSlot: {
    scheduledTime: Date,
    estimatedDuration: Number, // minutes
    actualPickupTime: Date,
    actualDeliveryTime: Date
  },
  // Route optimization results
  route: {
    distance: Number, // meters
    duration: Number, // seconds
    steps: [String], // turn-by-turn directions
    optimized: { type: Boolean, default: false }
  },
  // Weather-adjusted shelf life
  weatherAdjustment: {
    originalShelfLife: Date,
    adjustedShelfLife: Date,
    weatherCondition: String,
    temperature: Number,
    humidity: Number
  },
  // Calendar integration
  calendarEventId: String,
  
  // Completion details
  completionDetails: {
    quantityDelivered: Number,
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor']
    },
    notes: String,
    photos: [String] // URLs
  },
  
  // Ratings & feedback
  feedback: {
    donorRating: { type: Number, min: 1, max: 5 },
    ngoRating: { type: Number, min: 1, max: 5 },
    volunteerRating: { type: Number, min: 1, max: 5 },
    comments: String
  }
}, {
  timestamps: true
});

// Indexes for performance
matchSchema.index({ donationId: 1 });
matchSchema.index({ ngoId: 1 });
matchSchema.index({ volunteerId: 1 });
matchSchema.index({ status: 1 });
matchSchema.index({ 'score.total': -1 });
matchSchema.index({ createdAt: -1 });

// Virtual for match efficiency
matchSchema.virtual('efficiency').get(function() {
  if (!this.pickupSlot.actualPickupTime || !this.pickupSlot.scheduledTime) return null;
  
  const scheduled = new Date(this.pickupSlot.scheduledTime);
  const actual = new Date(this.pickupSlot.actualPickupTime);
  const diff = Math.abs(actual - scheduled);
  
  // Return efficiency as percentage (closer to scheduled time = higher efficiency)
  return Math.max(0, 100 - (diff / (1000 * 60 * 60))); // Decrease by 1% per hour delay
});

export default mongoose.model('Match', matchSchema);