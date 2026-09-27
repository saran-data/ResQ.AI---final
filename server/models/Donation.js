import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Donor ID is required']
  },
  foodType: {
    type: String,
    required: [true, 'Food type is required'],
    enum: ['cooked', 'raw', 'packaged', 'fruits', 'vegetables', 'dairy', 'grains', 'other']
  },
  foodName: {
    type: String,
    required: [true, 'Food name is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.1, 'Quantity must be positive']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['kg', 'grams', 'liters', 'pieces', 'portions']
  },
  prepTime: {
    type: Date,
    required: [true, 'Preparation time is required']
  },
  storageTemp: {
    type: String,
    enum: ['frozen', 'refrigerated', 'room_temp'],
    required: [true, 'Storage temperature is required']
  },
  location: {
    lat: {
      type: Number,
      required: [true, 'Latitude is required']
    },
    lng: {
      type: Number, 
      required: [true, 'Longitude is required']
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    }
  },
  status: {
    type: String,
    enum: ['open', 'matched', 'picked_up', 'delivered', 'expired', 'cancelled'],
    default: 'open'
  },
  estimatedShelfLifeEnd: {
    type: Date,
    required: [true, 'Shelf life end is required']
  },
  // Matching information
  ngoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NGO'
  },
  volunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  matchedAt: {
    type: Date
  },
  pickedUpAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  // Optional fields for better matching
  dietaryInfo: {
    isVegetarian: { type: Boolean, default: false },
    isVegan: { type: Boolean, default: false },
    isHalal: { type: Boolean, default: false },
    isKosher: { type: Boolean, default: false },
    isGlutenFree: { type: Boolean, default: false }
  },
  // Donor contact & pickup info
  contactPerson: {
    type: String,
    required: [true, 'Contact person is required']
  },
  contactPhone: {
    type: String,
    required: [true, 'Contact phone is required']
  },
  pickupInstructions: {
    type: String,
    maxLength: 500
  },
  // ADDED: Delivery preference
  deliveryMethod: {
    type: String,
    enum: ['self_delivery', 'volunteer_pickup'],
    default: 'volunteer_pickup',
    required: false
  },
  // Metadata
  urgencyLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  images: [String], // URLs to food images (optional)
  
}, {
  timestamps: true
});

// Indexes for performance
donationSchema.index({ donorId: 1 });
donationSchema.index({ ngoId: 1 });
donationSchema.index({ volunteerId: 1 });
donationSchema.index({ status: 1 });
donationSchema.index({ 'location.lat': 1, 'location.lng': 1 });
donationSchema.index({ estimatedShelfLifeEnd: 1 });
donationSchema.index({ foodType: 1 });
donationSchema.index({ createdAt: -1 });
donationSchema.index({ matchedAt: -1 });

// Virtual for checking if donation is expired
donationSchema.virtual('isExpired').get(function() {
  return this.estimatedShelfLifeEnd < new Date();
});

// Virtual for time remaining
donationSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const remaining = this.estimatedShelfLifeEnd - now;
  return Math.max(0, remaining); // milliseconds
});

export default mongoose.model('Donation', donationSchema);